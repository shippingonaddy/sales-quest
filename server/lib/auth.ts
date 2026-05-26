import { jwtVerify } from "jose";
import type { Context } from "hono";

const jwtSecret = process.env.SUPABASE_JWT_SECRET;
if (!jwtSecret) {
  throw new Error("Missing SUPABASE_JWT_SECRET environment variable");
}

const secret = new TextEncoder().encode(jwtSecret);

export async function verifySupabaseToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
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
