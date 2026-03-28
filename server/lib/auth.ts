const CLERK_JWKS_URL = "https://sunny-spider-24.clerk.accounts.dev/.well-known/jwks.json";
let cachedJwks: any = null;
let jwksTimestamp = 0;
let jwksFetchPromise: Promise<void> | null = null;

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  return Buffer.from(base64 + padding, 'base64');
}

export async function verifyClerkToken(token: string): Promise<string | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;
    const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
    if (!header.kid) return null;

    if (!cachedJwks || Date.now() - jwksTimestamp > 3600000) {
      if (!jwksFetchPromise) {
        jwksFetchPromise = (async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          try {
            const res = await fetch(CLERK_JWKS_URL, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) { cachedJwks = await res.json(); jwksTimestamp = Date.now(); }
            // on failure: leave cachedJwks as-is so stale keys still verify tokens
          } catch {
            clearTimeout(timeoutId);
          } finally {
            jwksFetchPromise = null;
          }
        })();
      }
      await jwksFetchPromise;
      if (!cachedJwks) return null; // nothing cached at all — hard fail
    }

    const jwk = cachedJwks.keys.find((k: any) => k.kid === header.kid);
    if (!jwk) return null;

    const key = await crypto.subtle.importKey(
      'jwk', jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false, ['verify']
    );

    const signature = base64UrlToUint8Array(signatureB64);
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const isValid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature as BufferSource, data);
    if (!isValid) return null;

    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.sub || null;
  } catch (err) {
    console.error("Token verification error:", err);
    return null;
  }
}

export async function authMiddleware(c: any): Promise<Response | void> {
  let authHeader = c.req.raw.headers.get("authorization")
    || c.req.raw.headers.get("Authorization")
    || c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) authHeader = authHeader.substring(7);
  if (!authHeader) return c.json({ success: false, error: "Auth: Missing token" }, 401);

  try {
    const userId = await verifyClerkToken(authHeader);
    if (!userId) return c.json({ success: false, error: "Auth: Invalid token" }, 401);
    c.set("userId", userId);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 401);
  }
}
