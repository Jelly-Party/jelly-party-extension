import { createRemoteJWKSet, jwtVerify } from "jose";
import { usageReport } from "./analytics";

// Cache only the public-key resolver, never a user's claims or token.
let keySet: { issuer: string; resolve: ReturnType<typeof createRemoteJWKSet> } | undefined;

export async function adminRequest(request: Request, env: Env): Promise<Response> {
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    return new Response("Dashboard access is not configured.", { status: 503, headers });
  }
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return new Response("Sign in through Cloudflare Access.", { status: 401, headers });
  let expiresAt: number;
  try {
    if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN))
      throw new Error("Invalid Access domain");
    const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
    if (keySet?.issuer !== issuer)
      keySet = { issuer, resolve: createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)) };
    const { payload } = await jwtVerify(token, keySet.resolve, {
      issuer,
      audience: env.ACCESS_AUD,
      algorithms: ["RS256"],
      requiredClaims: ["exp", "sub"],
    });
    expiresAt = payload.exp! * 1000;
  } catch {
    return new Response("Access denied. Sign in again.", { status: 403, headers });
  }
  const url = new URL(request.url);
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers });
  if (url.pathname === "/admin/api/live") {
    if (request.headers.get("Origin") !== url.origin)
      return new Response("Forbidden", { status: 403, headers });
    const forwarded = new Request(request);
    forwarded.headers.set("X-Analytics-Expires", String(expiresAt));
    return env.LIVE_STATS.getByName("global").fetch(forwarded);
  }
  if (url.pathname === "/admin/api/stats") {
    try {
      return Response.json(
        await usageReport(
          env.ANALYTICS_DB,
          url.searchParams.get("from") ?? "",
          url.searchParams.get("to") ?? "",
        ),
        { headers },
      );
    } catch (error) {
      return new Response(
        error instanceof RangeError ? error.message : "Could not load analytics.",
        {
          status: error instanceof RangeError ? 400 : 503,
          headers,
        },
      );
    }
  }
  if (url.pathname.startsWith("/admin/api/"))
    return new Response("Not found", { status: 404, headers });
  const asset = await env.ASSETS.fetch(request);
  const response = new Response(asset.body, asset);
  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
  return response;
}
