import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Verify the requesting user is an admin
async function verifyAdmin(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing authorization header", admin: null };
  }

  const token = authHeader.replace("Bearer ", "");

  // Create a client with the user's token to verify their identity
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

  // Check if user has admin email domain
  const email = user.email || "";
  if (!email.toLowerCase().endsWith("@icmultiservices.com")) {
    return { error: "Unauthorized: Not an admin email", admin: null };
  }

  // Check if user has admin role in profiles
  const supabaseAdmin = getSupabaseAdmin();

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !["owner", "staff"].includes(profile.role)) {
    return { error: "Unauthorized: Not an admin role", admin: null };
  }

  return { error: null, admin: { id: user.id, email: user.email } };
}

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
    const { clientId, newEmail, reason } = body;

    if (!clientId || !newEmail) {
      return NextResponse.json(
        { error: "Missing required fields: clientId, newEmail" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Prevent changing to an admin email domain
    if (newEmail.toLowerCase().endsWith("@icmultiservices.com")) {
      return NextResponse.json(
        { error: "Cannot set client email to admin domain" },
        { status: 400 }
      );
    }

    // 3. Get the client's current email for audit log
    const { data: currentUser, error: fetchError } =
      await supabaseAdmin.auth.admin.getUserById(clientId);

    if (fetchError || !currentUser?.user) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    const oldEmail = currentUser.user.email;

    // 4. Update email in Supabase Auth
    const { data: updatedUser, error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(clientId, {
        email: newEmail,
        email_confirm: true, // Auto-confirm since admin is making the change
      });

    if (updateError) {
      console.error("Error updating auth email:", updateError);
      return NextResponse.json(
        { error: `Failed to update email: ${updateError.message}` },
        { status: 500 }
      );
    }

    // 5. Update email in profiles table
    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({ email: newEmail, updated_at: new Date().toISOString() })
      .eq("id", clientId);

    if (profileUpdateError) {
      console.error("Error updating profile email:", profileUpdateError);
      // Note: Auth email was already changed, log this inconsistency
    }

    // 6. Send password reset email to new address
    // Use resetPasswordForEmail which actually sends the email (not generateLink which only creates a link)
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
      newEmail,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/update-password`,
      }
    );

    if (resetError) {
      console.error("Error sending password reset:", resetError);
    }

    // Even if reset email fails, we've updated the email - log it
    const resetSent = !resetError;

    // 7. Create audit log entry
    const { error: auditError } = await supabaseAdmin
      .from("audit_logs")
      .insert({
        admin_id: admin.id,
        admin_email: admin.email,
        action: "email_change",
        target_user_id: clientId,
        target_user_email: newEmail,
        details: {
          old_email: oldEmail,
          new_email: newEmail,
          reason: reason || "No reason provided",
          password_reset_sent: resetSent,
        },
        ip_address: request.headers.get("x-forwarded-for") || "unknown",
      });

    if (auditError) {
      console.error("Failed to create audit log:", auditError);
      // Don't fail the request, but log the issue
    }

    return NextResponse.json({
      success: true,
      message: resetSent
        ? "Email updated and password reset sent to new address"
        : "Email updated but password reset email failed to send",
      passwordResetSent: resetSent,
    });
  } catch (error: any) {
    console.error("Error in update-client-email:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
