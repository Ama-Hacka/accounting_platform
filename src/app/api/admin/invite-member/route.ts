import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type VerifiedUser = {
  id: string;
  email: string;
  role: "owner" | "admin" | "staff" | "client" | string;
};

async function verifyFirmUser(authHeader: string | null): Promise<
  { error: string; user: null } | { error: null; user: VerifiedUser }
> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing authorization header", user: null };
  }

  const token = authHeader.replace("Bearer ", "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const supabaseUser = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseUser.auth.getUser();

  if (userError || !user) {
    return { error: "Invalid token", user: null };
  }

  const email = user.email || "";
  if (!email.toLowerCase().endsWith("@icmultiservices.com")) {
    return { error: "Unauthorized: Not a firm email", user: null };
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.role) {
    return { error: "Unauthorized", user: null };
  }

  return {
    error: null,
    user: { id: user.id, email, role: profile.role },
  };
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const verified = await verifyFirmUser(authHeader);
    if (verified.error || !verified.user) {
      return NextResponse.json({ error: verified.error }, { status: 401 });
    }

    if (!(["owner", "admin"] as const).includes(verified.user.role as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const role = String(body?.role || "").trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (!email.endsWith("@icmultiservices.com")) {
      return NextResponse.json(
        { error: "Member email must be an @icmultiservices.com address" },
        { status: 400 }
      );
    }

    if (!(["staff", "admin"] as const).includes(role as any)) {
      return NextResponse.json(
        { error: "Invalid role. Allowed: staff, admin" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/update-password`;

    const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo }
    );
    if (inviteError || !invited?.user) {
      return NextResponse.json(
        { error: inviteError?.message || "Failed to invite member" },
        { status: 500 }
      );
    }

    // Ensure the invited user has the correct role.
    const { error: roleError } = await supabaseAdmin
      .from("profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", invited.user.id);

    if (roleError) {
      console.error("Failed to update invited user role:", roleError);
      // Invitation succeeded; don't fail the request.
    }

    return NextResponse.json({
      success: true,
      member: { id: invited.user.id, email, role },
    });
  } catch (error: any) {
    console.error("Error in invite-member POST:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
