import type { Context } from "hono";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error(
    "Missing required env vars: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY"
  );
}

// Admin client — token verification only, never used for data queries
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function verifySupabaseToken(token: string): Promise<string | null> {
  const { data: { user }, error } = await adminClient.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

// Per-request client — carries the user JWT so RLS applies automatically
export function createSupabaseServerClient(token: string): SupabaseClient {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function authMiddleware(c: Context): Promise<Response | void> {
  let authHeader = c.req.raw.headers.get("authorization")
    || c.req.raw.headers.get("Authorization")
    || c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) authHeader = authHeader.substring(7);
  if (!authHeader) return c.json({ success: false, error: "Auth: Missing token" }, 401);

  const userId = await verifySupabaseToken(authHeader);
  if (!userId) return c.json({ success: false, error: "Auth: Invalid token" }, 401);
  c.set("userId", userId);
}
