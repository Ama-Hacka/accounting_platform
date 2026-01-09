import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Verify the requesting user is an admin
async function verifyAdmin(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing authorization header", admin: null };
  }

  const token = authHeader.replace("Bearer ", "");

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabaseUser.auth.getUser();

  if (userError || !user) {
    return { error: "Invalid token", admin: null };
  }

  const email = user.email || "";
  if (!email.toLowerCase().endsWith("@icmultiservices.com")) {
    return { error: "Unauthorized: Not an admin email", admin: null };
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !["owner", "admin", "staff"].includes(profile.role)) {
    return { error: "Unauthorized: Not an admin role", admin: null };
  }

  return { error: null, admin: { id: user.id, email: user.email } };
}

// Allowed fields that admins can update
const ALLOWED_FIELDS = ["first_name", "last_name", "phone_number", "entity"];

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Verify admin
    const authHeader = request.headers.get("authorization");
    const { error: authError, admin } = await verifyAdmin(authHeader);

    if (authError || !admin) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { clientId, updates } = body;

    if (!clientId || !updates || typeof updates !== "object") {
      return NextResponse.json(
        { error: "Missing required fields: clientId, updates" },
        { status: 400 }
      );
    }

    // 3. Filter to only allowed fields
    const sanitizedUpdates: Record<string, any> = {};
    const oldValues: Record<string, any> = {};

    // Get current values for audit log
    const { data: currentProfile, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", clientId)
      .single();

    if (fetchError || !currentProfile) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Only allow updating certain fields
    for (const field of ALLOWED_FIELDS) {
      if (field in updates && updates[field] !== currentProfile[field]) {
        sanitizedUpdates[field] = updates[field];
        oldValues[field] = currentProfile[field];
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // 4. Update the profile
    sanitizedUpdates.updated_at = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(sanitizedUpdates)
      .eq("id", clientId);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return NextResponse.json(
        { error: `Failed to update profile: ${updateError.message}` },
        { status: 500 }
      );
    }

    // 5. Create audit log entry
    const { error: auditError } = await supabaseAdmin
      .from("audit_logs")
      .insert({
        admin_id: admin.id,
        admin_email: admin.email,
        action: "profile_update",
        target_user_id: clientId,
        target_user_email: currentProfile.email,
        details: {
          old_values: oldValues,
          new_values: sanitizedUpdates,
        },
        ip_address: request.headers.get("x-forwarded-for") || "unknown",
      });

    if (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      updatedFields: Object.keys(sanitizedUpdates).filter(
        (k) => k !== "updated_at"
      ),
    });
  } catch (error: any) {
    console.error("Error in update-client-profile:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
