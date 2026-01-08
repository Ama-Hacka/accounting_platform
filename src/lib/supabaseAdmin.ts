import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-side only Supabase client with service role key.
// This bypasses RLS - use only in API routes, never expose to client.
//
// IMPORTANT: Do not instantiate at module-load time. Next.js may evaluate API
// route modules during build, and @supabase/supabase-js will throw if the key
// is missing. Instead we create the client lazily at request-time.

let cachedAdminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdminClient) return cachedAdminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Admin API routes will not work."
    );
  }

  cachedAdminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedAdminClient;
}
