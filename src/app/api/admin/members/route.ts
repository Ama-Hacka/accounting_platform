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

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const verified = await verifyFirmUser(authHeader);
    if (verified.error || !verified.user) {
      return NextResponse.json({ error: verified.error }, { status: 401 });
    }

    if (!(["owner", "admin"] as const).includes(verified.user.role as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Pull users from Auth, then join to profiles for role + display name.
    // We keep this bounded to avoid unexpectedly large responses.
    const MAX_USERS = 1000;
    const PER_PAGE = 200;
    const users: Array<{ id: string; email: string | null; invited_at: string | null; created_at: string; email_confirmed_at: string | null; banned_until: string | null; }> = [];

    for (let page = 1; users.length < MAX_USERS; page += 1) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: PER_PAGE,
      });
      if (error) throw error;
      const batch = (data?.users || []).map((u) => ({
        id: u.id,
        email: u.email ?? null,
        invited_at: (u as any).invited_at ?? null,
        created_at: u.created_at,
        email_confirmed_at: (u as any).email_confirmed_at ?? null,
        banned_until: (u as any).banned_until ?? null,
      }));
      users.push(...batch);
      if (batch.length < PER_PAGE) break;
    }

    const firmUsers = users.filter((u) => (u.email || "").toLowerCase().endsWith("@icmultiservices.com"));
    const ids = firmUsers.map((u) => u.id);

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, role")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    if (profilesError) throw profilesError;

    const profileById = new Map<string, any>();
    for (const p of profiles || []) profileById.set((p as any).id, p);

    const members = firmUsers
      .map((u) => {
        const p = profileById.get(u.id);
        const role = p?.role;
        if (!role || !["owner", "admin", "staff"].includes(role)) return null;
        const name = `${p?.first_name || ""} ${p?.last_name || ""}`.trim();
        const isBanned = !!u.banned_until && new Date(u.banned_until).getTime() > Date.now();
        const status = isBanned
          ? "inactive"
          : u.email_confirmed_at
            ? "active"
            : u.invited_at
              ? "invited"
              : "active";

        return {
          id: u.id,
          name: name || "—",
          email: u.email || "—",
          role,
          status,
          invitedAt: u.invited_at,
          createdAt: u.created_at,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ members });
  } catch (error: any) {
    console.error("Error in members GET:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
