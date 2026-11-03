import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { connect } from "node:tls";
import { RELEASE_VERSION } from "../config/release.ts";
import { DEFAULT_BUILD_URLS, partyCreationUrl } from "../config/urls.ts";

await verifyPage(DEFAULT_BUILD_URLS.website, "Jelly Party");
await verifyPage(DEFAULT_BUILD_URLS.join, "You’re invited to watch together");
await verifyHttpsRedirect(DEFAULT_BUILD_URLS.website);
const wwwUrl = new URL(DEFAULT_BUILD_URLS.website);
wwwUrl.hostname = `www.${wwwUrl.hostname}`;
await verifyHttpsRedirect(wwwUrl);
const joinRedirectUrl = new URL(DEFAULT_BUILD_URLS.join);
joinRedirectUrl.searchParams.set("https-check", "1");
await verifyHttpsRedirect(joinRedirectUrl);

const healthUrl = new URL(DEFAULT_BUILD_URLS.websocket);
healthUrl.protocol = "https:";
healthUrl.pathname = "/health";
await verifyHttpsRedirect(healthUrl);
const healthResponse = await fetch(healthUrl, { cache: "no-store" });
assert.equal(healthResponse.status, 200, `${healthUrl} returned ${healthResponse.status}`);
const health = (await healthResponse.json()) as { status?: unknown; version?: unknown };
assert.equal(health.status, "ok", `${healthUrl} returned an unhealthy response`);
if (typeof health.version !== "string") throw new Error(`${healthUrl} did not return a version`);
const productionVersion = health.version;
if (process.env.JELLY_REQUIRE_RELEASE_VERSION === "1") {
  assert.equal(
    productionVersion,
    RELEASE_VERSION,
    `${healthUrl} is not running the release just deployed`,
  );
} else {
  assert.equal(
    productionVersion.split(".", 1)[0],
    RELEASE_VERSION.split(".", 1)[0],
    `${healthUrl} is not compatible with Jelly Party ${RELEASE_VERSION}`,
  );
}

await verifyWebSocket(DEFAULT_BUILD_URLS.websocket);
console.log(
  `production website, join route, HTTPS redirects, ${productionVersion} health endpoint, and WebSocket verified`,
);

async function verifyPage(url: string, expectedText: string): Promise<void> {
  const response = await fetch(url, { cache: "no-store" });
  assert.equal(response.status, 200, `${url} returned ${response.status}`);
  assert.ok((await response.text()).includes(expectedText), `${url} has unexpected HTML`);
}

async function verifyHttpsRedirect(value: string | URL): Promise<void> {
  const secureUrl = new URL(value);
  const insecureUrl = new URL(secureUrl);
  insecureUrl.protocol = "http:";
  const response = await fetch(insecureUrl, { redirect: "manual", cache: "no-store" });
  assert.ok(
    response.status === 301 || response.status === 308,
    `${insecureUrl} must permanently redirect to HTTPS, returned ${response.status}`,
  );
  assert.equal(
    response.headers.get("Location"),
    secureUrl.href,
    `${insecureUrl} must preserve its hostname, path, and query when redirecting to HTTPS`,
  );
}

async function verifyWebSocket(baseUrl: string): Promise<void> {
  const creationUrl = partyCreationUrl(baseUrl);
  const creationResponse = await fetch(creationUrl, { method: "POST" });
  if (creationResponse.status !== 201) {
    throw new Error(
      `${creationUrl} returned ${creationResponse.status}: ${await creationResponse.text()}`,
    );
  }
  const creation = (await creationResponse.json()) as { partyId?: unknown };
  const partyId = creation.partyId;
  assert.ok(
    typeof partyId === "string" && /^[a-f0-9]{64}$/.test(partyId),
    `${creationUrl} returned an invalid party ID`,
  );

  const url = new URL(baseUrl);
  url.pathname = `/party/${partyId}`;
  assert.equal(url.protocol, "wss:", `${url} must use a secure WebSocket connection`);

  await new Promise<void>((resolve, reject) => {
    const key = randomBytes(16).toString("base64");
    let response = "";
    let settled = false;
    const socket = connect(
      {
        host: url.hostname,
        port: Number(url.port) || 443,
        servername: url.hostname,
      },
      () => {
        socket.write(
          `GET ${url.pathname}${url.search} HTTP/1.1\r\n` +
            `Host: ${url.host}\r\n` +
            "Connection: Upgrade\r\n" +
            "Upgrade: websocket\r\n" +
            `Sec-WebSocket-Key: ${key}\r\n` +
            "Sec-WebSocket-Version: 13\r\n\r\n",
        );
      },
    );

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve();
    };

    socket.setTimeout(10_000, () => {
      finish(new Error(`${url} did not complete a WebSocket handshake within 10 seconds`));
    });
    socket.on("data", (chunk) => {
      response += chunk.toString("utf8");
      if (!response.includes("\r\n\r\n")) return;

      try {
        assert.match(response, /^HTTP\/1\.1 101 /);
        assert.match(response, /\r\nupgrade:\s*websocket\r\n/i);
        finish();
      } catch (error) {
        finish(error instanceof Error ? error : new Error(String(error)));
      }
    });
    socket.once("error", finish);
    socket.once("close", () => {
      if (!settled) finish(new Error(`${url} closed before completing its WebSocket handshake`));
    });
  });
}
