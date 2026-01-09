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

    // Owner-only removal per requirements.
    if (verified.user.role !== "owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const memberId = String(body?.memberId || "").trim();
    if (!memberId) {
      return NextResponse.json({ error: "Missing memberId" }, { status: 400 });
    }

    if (memberId === verified.user.id) {
      return NextResponse.json(
        { error: "You cannot remove your own access" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: memberProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", memberId)
      .single();

    if (profileError || !memberProfile) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if ((memberProfile as any).role === "owner") {
      return NextResponse.json(
        { error: "Owner access cannot be removed" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      memberId
    );

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || "Failed to remove member" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in remove-member POST:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
