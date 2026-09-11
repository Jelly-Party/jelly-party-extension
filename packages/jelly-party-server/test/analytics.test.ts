import { env, exports } from "cloudflare:workers";
import {
  applyD1Migrations,
  reset,
  runInDurableObject,
  evictDurableObject,
  type D1Migration,
} from "cloudflare:test";
import { beforeEach, afterEach, test, expect, vi } from "vite-plus/test";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import type { ServerMessage, LiveSnapshot } from "jelly-party-lib";
import { analyticsSite, usageReport } from "../src/analytics";

declare global {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}

beforeEach(async () => {
  await applyD1Migrations(env.ANALYTICS_DB, env.TEST_MIGRATIONS);
});
afterEach(async () => {
  vi.restoreAllMocks();
  await reset();
});

function inbox<T>(socket: WebSocket) {
  const queued: T[] = [];
  let pending: ((message: T) => void) | undefined;
  socket.addEventListener("message", (event) => {
    const value = JSON.parse(String(event.data)) as T;
    if (pending) {
      const resolve = pending;
      pending = undefined;
      resolve(value);
    } else queued.push(value);
  });
  return async (matches: (message: T) => boolean): Promise<T> => {
    for (;;) {
      const value = queued.length
        ? queued.shift()!
        : await new Promise<T>((resolve) => {
            pending = resolve;
          });
      if (matches(value)) return value;
    }
  };
}

test("party activity pushes live counts, preserves quiet parties through hibernation, and records only sanitized usage", async () => {
  const stats = env.LIVE_STATS.getByName("global");
  const response = await stats.fetch(
    new Request("https://example.com", {
      headers: { Upgrade: "websocket", "X-Analytics-Expires": String(Date.now() + 600000) },
    }),
  );
  const dashboard = response.webSocket!;
  dashboard.accept();
  const live = inbox<LiveSnapshot>(dashboard);
  const party = env.PARTY.get(env.PARTY.newUniqueId());
  const peer = { id: crypto.randomUUID(), name: "Test viewer", emoji: "🍿" };
  const destination = {
    url: "https://www.youtube.com/watch?v=private-video#secret",
    title: "Private video title",
  };
  const join = async (identity = peer) => {
    const response = await party.fetch(
      new Request("https://example.com", { headers: { Upgrade: "websocket" } }),
    );
    const socket = response.webSocket!;
    socket.accept();
    const messages = inbox<ServerMessage>(socket);
    socket.send(JSON.stringify({ type: "join", peer: identity, destination }));
    await messages((message) => message.type === "welcome");
    return { socket, messages };
  };
  const first = await join();
  expect(await live((message) => message.peers === 1)).toMatchObject({
    parties: 1,
    together: 0,
    sites: [{ site: "youtube.com", peers: 1 }],
  });
  const second = await join({ ...peer, id: crypto.randomUUID() });
  expect(await live((message) => message.peers === 2)).toMatchObject({ parties: 1, together: 1 });
  first.socket.send(JSON.stringify({ type: "chat", text: "Private chat content" }));
  expect(await second.messages((message) => message.type === "chat")).toMatchObject({
    type: "chat",
    entry: { text: "Private chat content" },
  });
  first.socket.send(
    JSON.stringify({ type: "playback", action: "play", timeFromEnd: 15, destinationRevision: 1 }),
  );
  expect(await second.messages((message) => message.type === "playback")).toMatchObject({
    action: "play",
  });
  await evictDurableObject(stats);
  expect(await stats.snapshot()).toMatchObject({ peers: 2, parties: 1 });
  first.socket.close(1000);
  expect(await live((message) => message.peers === 1)).toMatchObject({ parties: 1 });
  const rejoined = await join();
  expect(await live((message) => message.peers === 2)).toMatchObject({ parties: 1 });
  rejoined.socket.close(1000);
  second.socket.close(1000);
  expect(await live((message) => message.peers === 0)).toMatchObject({ parties: 0, sites: [] });
  await expect
    .poll(
      async () =>
        await env.ANALYTICS_DB.prepare(
          "SELECT COUNT(*) AS n FROM events WHERE kind = 'play'",
        ).first("n"),
    )
    .toBe(1);
  const rows = (await env.ANALYTICS_DB.prepare("SELECT * FROM events").all()).results;
  expect(rows.filter((row) => row.kind === "party_created")).toHaveLength(1);
  expect(rows.filter((row) => row.kind === "participant_joined")).toHaveLength(2);
  for (const privateValue of [
    peer.id,
    peer.name,
    destination.url,
    destination.title,
    "Private chat content",
    party.id.toString(),
  ]) {
    expect(JSON.stringify(rows)).not.toContain(privateValue);
  }
  const today = new Date().toISOString().slice(0, 10);
  const history = await usageReport(env.ANALYTICS_DB, today, today);
  expect(history.sites).toEqual([{ site: "youtube.com", parties: 1, participants: 2 }]);
  expect(history.sizes).toEqual([{ peak: 2, parties: 1 }]);
  dashboard.close(1000);
});

test("duplicate and older reports cannot resurrect a finished party, even after hibernation", async () => {
  const stats = env.LIVE_STATS.getByName("global");
  const snapshot = {
    key: crypto.randomUUID(),
    revision: 1,
    peers: 3,
    site: "netflix.com",
    updatedAt: Date.now(),
  };
  await stats.update(snapshot);
  await stats.update({ ...snapshot, revision: 2, peers: 0 });
  await evictDurableObject(stats);
  await stats.update(snapshot);
  await stats.update({ ...snapshot, revision: 2 });
  expect(await stats.snapshot()).toMatchObject({ peers: 0, parties: 0 });
});

test("analytics storage failure does not prevent joining or chatting", async () => {
  await env.ANALYTICS_DB.prepare("DROP TABLE events").run();
  await runInDurableObject(env.LIVE_STATS.getByName("global"), async (_instance, state) => {
    state.storage.sql.exec("DROP TABLE parties");
  });
  const party = env.PARTY.get(env.PARTY.newUniqueId());
  const response = await party.fetch(
    new Request("https://example.com", { headers: { Upgrade: "websocket" } }),
  );
  const socket = response.webSocket!;
  socket.accept();
  const messages = inbox<ServerMessage>(socket);
  socket.send(
    JSON.stringify({
      type: "join",
      peer: { id: crypto.randomUUID(), name: "Viewer", emoji: "🍿" },
      destination: { url: "https://example.com/video", title: "Video" },
    }),
  );
  expect(await messages((message) => message.type === "welcome")).toMatchObject({
    type: "welcome",
  });
  socket.send(JSON.stringify({ type: "chat", text: "Still connected" }));
  expect(await messages((message) => message.type === "chat")).toMatchObject({
    entry: { text: "Still connected" },
  });
  socket.close(1000);
  await runInDurableObject(party, async () => {});
});

test("admin rejects missing/forged/expired/wrong-audience tokens and accepts a signed Access token", async () => {
  expect((await exports.default.fetch("https://example.com/admin/api/stats")).status).toBe(401);
  const { privateKey, publicKey } = await generateKeyPair("RS256", { extractable: true });
  const jwk = { ...(await exportJWK(publicKey)), kid: "test", alg: "RS256", use: "sig" };
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ keys: [jwk] }));
  const token = async (audience = "analytics-test", expiration = "1h") =>
    new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuer("https://analytics-test.cloudflareaccess.com")
      .setSubject("test-admin")
      .setAudience(audience)
      .setExpirationTime(expiration)
      .sign(privateKey);
  const request = (jwt: string, query = "?from=2026-09-01&to=2026-09-11") =>
    exports.default.fetch(`https://example.com/admin/api/stats${query}`, {
      headers: { "Cf-Access-Jwt-Assertion": jwt },
    });
  expect((await request("forged")).status).toBe(403);
  expect((await request(await token("wrong"))).status).toBe(403);
  expect((await request(await token("analytics-test", "-1h"))).status).toBe(403);
  const valid = await token();
  expect((await request(valid)).status).toBe(200);
  expect((await request(valid, "?from=bad&to=2026-09-11")).status).toBe(400);
  expect((await request(valid, "?from=2026-02-31&to=2026-09-11")).status).toBe(400);
  expect(
    (
      await exports.default.fetch("https://example.com/admin/api/live", {
        headers: {
          "Cf-Access-Jwt-Assertion": valid,
          Upgrade: "websocket",
          Origin: "https://untrusted.example",
        },
      })
    ).status,
  ).toBe(403);
});

test("domain collection excludes paths, subdomains, private hosts, and IPs", () => {
  expect(analyticsSite("https://viewer.video.bbc.co.uk/watch?id=secret")).toBe("bbc.co.uk");
  for (const url of [
    "http://127.0.0.1/video",
    "http://[::1]/",
    "http://localhost/video",
    "http://host.internal/",
    "file:///video.mp4",
    "invalid",
  ])
    expect(analyticsSite(url)).toBe("unknown");
});

test("party history includes whole parties across midnight and excludes empty gaps from duration", async () => {
  const start = Date.parse("2026-09-10T23:50:00Z");
  vi.spyOn(Date, "now").mockReturnValue(start + 190 * 60000);
  const events: Array<[string, string, number, number, string]> = [
    ["closed", "party_created", 0, 1, "youtube.com"],
    ["closed", "party_size", 0, 1, "youtube.com"],
    ["closed", "participant_joined", 1, 1, "youtube.com"],
    ["closed", "party_size", 10, 2, "youtube.com"],
    ["closed", "participant_joined", 10, 1, "youtube.com"],
    ["closed", "party_size", 20, 0, "youtube.com"],
    ["closed", "party_size", 120, 1, "netflix.com"],
    ["closed", "chat_sent", 121, 1, "netflix.com"],
    ["closed", "party_size", 150, 0, "netflix.com"],
    ["active", "party_created", 170, 1, "youtube.com"],
    ["active", "party_size", 170, 1, "youtube.com"],
    ["active", "participant_joined", 170, 1, "youtube.com"],
  ];
  await env.ANALYTICS_DB.batch(
    events.map(([key, kind, minute, value, site]) =>
      env.ANALYTICS_DB.prepare("INSERT INTO events VALUES (?, ?, ?, ?, ?, ?)").bind(
        crypto.randomUUID(),
        start + minute * 60000,
        kind,
        key,
        site,
        value,
      ),
    ),
  );
  const yesterday = await usageReport(env.ANALYTICS_DB, "2026-09-10", "2026-09-10");
  expect(yesterday.parties).toEqual([
    {
      key: "closed",
      startedAt: start,
      durationMs: 50 * 60000,
      participants: 2,
      peak: 2,
      connected: 0,
      messages: 1,
      sites: ["netflix.com", "youtube.com"],
    },
  ]);
  expect(yesterday.hasMoreParties).toBe(false);
  const today = await usageReport(env.ANALYTICS_DB, "2026-09-11", "2026-09-11");
  expect(today.parties).toMatchObject([
    {
      key: "active",
      durationMs: 20 * 60000,
      connected: 1,
      participants: 1,
      peak: 1,
    },
  ]);
});
