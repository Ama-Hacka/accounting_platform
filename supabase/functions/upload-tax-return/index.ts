import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

serve(async (req) => {
  const url = new URL(req.url);
  if (req.method !== "POST" || url.pathname !== "/upload-tax-return") {
    return jsonResponse({ error: "Not found" }, 404);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const authHeader = req.headers.get("authorization") || "";
  const jwt = authHeader.replace("Bearer ", "");
  const { data: userData } = await supabase.auth.getUser(jwt);
  if (!userData?.user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  const callerId = userData.user.id;

  const formData = await req.formData();
  const clientId = String(formData.get("client_id") || "");
  const title = String(formData.get("title") || "");
  const formType = String(formData.get("form_type") || "");
  const year = Number(formData.get("year") || "");
  const file = formData.get("file") as File | null;

  if (!clientId || !title || !formType || !year || !file) {
    return jsonResponse({ error: "Missing fields" }, 400);
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", callerId).single();
  const role = profile?.role;
  const callerEmail = userData.user.email?.toLowerCase() || "";
  const isFirmEmail = callerEmail.endsWith("@icmultiservices.com");
  if ((role !== "owner" && role !== "staff") || !isFirmEmail) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  if (role === "staff") {
    const { data: assignment } = await supabase
      .from("staff_clients")
      .select("client_id")
      .eq("staff_id", callerId)
      .eq("client_id", clientId)
      .maybeSingle();
    if (!assignment) {
      return jsonResponse({ error: "Not assigned to client" }, 403);
    }
  }

  const ext = file.name.split(".").pop() || "pdf";
  const slug = title.replace(/[^a-zA-Z0-9-_]/g, "");
  const objectName = `${clientId}/${year}_${formType}_${slug}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await supabase.storage.from("tax_returns").upload(objectName, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) {
    return jsonResponse({ error: uploadError.message }, 500);
  }

  const filePath = objectName;
  const { error: insertError } = await supabase.from("tax_returns").insert({
    user_id: clientId,
    created_by: callerId,
    title,
    form_type: formType,
    year,
    status: "filed",
    file_path: filePath,
    file_type: file.type,
    size: file.size,
  });
  if (insertError) {
    return jsonResponse({ error: insertError.message }, 500);
  }

  const { data: signed } = await supabase.storage.from("tax_returns").createSignedUrl(filePath, 600);
  return jsonResponse({
    ok: true,
    file_path: filePath,
    signed_url: signed?.signedUrl,
  });
});
