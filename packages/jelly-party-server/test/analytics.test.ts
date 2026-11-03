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
import {
  MAX_PARTY_CONNECTIONS,
  MAX_PENDING_CONNECTIONS,
  PARTY_JOIN_TIMEOUT_MS,
} from "../src/limits";

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

test("only the private reconnect credential can replace an active connection", async () => {
  const party = env.PARTY.get(env.PARTY.newUniqueId());
  const peer = { id: crypto.randomUUID(), name: "Viewer", emoji: "🍿" };
  const reconnectToken = crypto.randomUUID();
  const sockets: WebSocket[] = [];
  const connect = async (identity = peer, token: string | null = reconnectToken) => {
    const response = await party.fetch(
      new Request("https://example.com", { headers: { Upgrade: "websocket" } }),
    );
    const socket = response.webSocket!;
    socket.accept();
    sockets.push(socket);
    const messages = inbox<ServerMessage>(socket);
    socket.send(
      JSON.stringify({
        type: "join",
        peer: identity,
        reconnectToken: token ?? undefined,
        destination: { url: "https://example.com/watch", title: "Video" },
      }),
    );
    return { socket, messages };
  };
  try {
    const original = await connect();
    expect(await original.messages((message) => message.type === "welcome")).toMatchObject({
      peerId: peer.id,
      leaderId: peer.id,
    });
    const guest = await connect({ ...peer, id: crypto.randomUUID() }, crypto.randomUUID());
    await guest.messages((message) => message.type === "welcome");
    await evictDurableObject(party);

    for (const token of [null, crypto.randomUUID()]) {
      const rejected = await connect(peer, token);
      expect(await rejected.messages((message) => message.type === "error")).toMatchObject({
        code: "invalid-message",
      });
    }
    original.socket.send(JSON.stringify({ type: "chat", text: "Still connected" }));
    expect(await guest.messages((message) => message.type === "chat")).toMatchObject({
      entry: { peer: { id: peer.id }, text: "Still connected" },
    });
    const originalClosed = new Promise<number>((resolve) =>
      original.socket.addEventListener("close", (event) => resolve(event.code), { once: true }),
    );
    const resumed = await connect();
    const welcome = await resumed.messages((message) => message.type === "welcome");
    expect(welcome).toMatchObject({ peerId: peer.id, leaderId: peer.id });
    expect(JSON.stringify(welcome)).not.toContain(reconnectToken);
    expect(await originalClosed).toBe(1000);
    resumed.socket.send(JSON.stringify({ type: "chat", text: "Resumed" }));
    expect(await guest.messages((message) => message.type === "chat")).toMatchObject({
      entry: { peer: { id: peer.id }, text: "Resumed" },
    });
  } finally {
    for (const socket of sockets) socket.close();
  }
});

test("published clients can join without a credential but cannot replace an active peer", async () => {
  const party = env.PARTY.get(env.PARTY.newUniqueId());
  const peer = { id: crypto.randomUUID(), name: "Viewer", emoji: "🍿" };
  const sockets: WebSocket[] = [];
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await party.fetch(
        new Request("https://example.com", { headers: { Upgrade: "websocket" } }),
      );
      const socket = response.webSocket!;
      socket.accept();
      sockets.push(socket);
      const messages = inbox<ServerMessage>(socket);
      socket.send(
        JSON.stringify({
          type: "join",
          peer,
          destination: { url: "https://example.com/watch", title: "Video" },
        }),
      );
      const reply = await messages(
        (message) => message.type === "welcome" || message.type === "error",
      );
      expect(reply.type).toBe(attempt === 0 ? "welcome" : "error");
    }
    const messages = inbox<ServerMessage>(sockets[0]!);
    sockets[0]!.send(JSON.stringify({ type: "chat", text: "Still here" }));
    expect(await messages((message) => message.type === "chat")).toMatchObject({
      entry: { text: "Still here" },
    });
  } finally {
    for (const socket of sockets) socket.close();
  }
});

test("a full party accepts authenticated replacement but rejects a new participant", async () => {
  const party = env.PARTY.get(env.PARTY.newUniqueId());
  const peer = { id: crypto.randomUUID(), name: "Viewer", emoji: "🍿" };
  const reconnectToken = crypto.randomUUID();
  const sockets: WebSocket[] = [];
  const connect = async (identity = peer, token = reconnectToken) => {
    const response = await party.fetch(
      new Request("https://example.com", { headers: { Upgrade: "websocket" } }),
    );
    expect(response.status).toBe(101);
    const socket = response.webSocket!;
    socket.accept();
    sockets.push(socket);
    const messages = inbox<ServerMessage>(socket);
    const closed = new Promise<number>((resolve) =>
      socket.addEventListener("close", (event) => resolve(event.code), { once: true }),
    );
    socket.send(
      JSON.stringify({
        type: "join",
        peer: identity,
        reconnectToken: token,
        destination: { url: "https://example.com/watch", title: "Video" },
      }),
    );
    return { socket, messages, closed };
  };
  try {
    const original = await connect();
    await original.messages((message) => message.type === "welcome");
    for (let index = 1; index < MAX_PARTY_CONNECTIONS; index++) {
      const guest = await connect({ ...peer, id: crypto.randomUUID() }, crypto.randomUUID());
      await guest.messages((message) => message.type === "welcome");
    }
    await evictDurableObject(party);
    const unauthorized = await connect(peer, crypto.randomUUID());
    expect(await unauthorized.messages((message) => message.type === "error")).toMatchObject({
      message: "That participant is already connected. Rejoin with a new session.",
    });
    expect(await unauthorized.closed).toBe(1008);
    const extra = await connect({ ...peer, id: crypto.randomUUID() }, crypto.randomUUID());
    expect(await extra.messages((message) => message.type === "error")).toMatchObject({
      message: "This party is full",
    });
    expect(await extra.closed).toBe(1008);
    const resumed = await connect();
    expect(await resumed.messages((message) => message.type === "welcome")).toMatchObject({
      peerId: peer.id,
      leaderId: peer.id,
    });
    expect(await original.closed).toBe(1000);
    await runInDurableObject(party, (_instance, state) => {
      expect(
        state.getWebSockets().filter((socket) => socket.readyState === WebSocket.OPEN),
      ).toHaveLength(MAX_PARTY_CONNECTIONS);
    });
    resumed.socket.send(JSON.stringify({ type: "chat", text: "Reconnected to a full party" }));
    expect(await resumed.messages((message) => message.type === "chat")).toMatchObject({
      entry: { peer: { id: peer.id }, text: "Reconnected to a full party" },
    });
  } finally {
    for (const socket of sockets) socket.close();
  }
});

test("pending joins are bounded and keep their own expiry through hibernation", async () => {
  const party = env.PARTY.get(env.PARTY.newUniqueId());
  const sockets: WebSocket[] = [];
  const closed: Promise<number>[] = [];
  const open = () =>
    party.fetch(new Request("https://example.com", { headers: { Upgrade: "websocket" } }));
  try {
    const before = Date.now();
    for (let index = 0; index < MAX_PENDING_CONNECTIONS; index++) {
      const response = await open();
      expect(response.status).toBe(101);
      const socket = response.webSocket!;
      socket.accept();
      sockets.push(socket);
      closed.push(
        new Promise<number>((resolve) =>
          socket.addEventListener("close", (event) => resolve(event.code), { once: true }),
        ),
      );
    }
    const rejected = await open();
    expect(rejected.status).toBe(429);
    expect(await rejected.text()).toBe("Too many pending party connections");
    await evictDurableObject(party);
    await runInDurableObject(party, async (instance, state) => {
      const alarm = await state.storage.getAlarm();
      expect(alarm).toBeGreaterThanOrEqual(before + PARTY_JOIN_TIMEOUT_MS);
      expect(alarm).toBeLessThanOrEqual(Date.now() + PARTY_JOIN_TIMEOUT_MS);
      const pending = state.getWebSockets();
      for (const socket of pending) socket.serializeAttachment({ joinDeadline: Date.now() - 1 });
      const laterDeadline = Date.now() + PARTY_JOIN_TIMEOUT_MS;
      pending.at(-1)!.serializeAttachment({ joinDeadline: laterDeadline });
      await state.storage.deleteAlarm();
      await instance.alarm();
      expect(
        state.getWebSockets().filter((socket) => socket.readyState === WebSocket.OPEN),
      ).toHaveLength(1);
      expect(await state.storage.getAlarm()).toBe(laterDeadline);
      pending.at(-1)!.serializeAttachment({ joinDeadline: Date.now() - 1 });
      await instance.alarm();
    });
    expect(await Promise.all(closed)).toEqual(Array(MAX_PENDING_CONNECTIONS).fill(1008));
    const reopened = await open();
    expect(reopened.status).toBe(101);
    reopened.webSocket!.accept();
    sockets.push(reopened.webSocket!);
  } finally {
    for (const socket of sockets) socket.close();
  }
});

test("an expired pending socket cannot join before its alarm runs", async () => {
  const party = env.PARTY.get(env.PARTY.newUniqueId());
  const response = await party.fetch(
    new Request("https://example.com", { headers: { Upgrade: "websocket" } }),
  );
  const socket = response.webSocket!;
  socket.accept();
  try {
    await runInDurableObject(party, (_instance, state) => {
      state.getWebSockets()[0]!.serializeAttachment({ joinDeadline: Date.now() - 1 });
    });
    const closed = new Promise<number>((resolve) =>
      socket.addEventListener("close", (event) => resolve(event.code), { once: true }),
    );
    socket.send(
      JSON.stringify({
        type: "join",
        peer: { id: crypto.randomUUID(), name: "Viewer", emoji: "🍿" },
        destination: { url: "https://example.com/watch", title: "Video" },
      }),
    );
    expect(await closed).toBe(1008);
  } finally {
    socket.close();
  }
});

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
  const messageHandler = await runInDurableObject(party, (instance) =>
    vi.spyOn(instance, "webSocketMessage"),
  );
  first.socket.send(JSON.stringify({ type: "heartbeat" }));
  expect(await first.messages((message) => message.type === "heartbeat-ack")).toEqual({
    type: "heartbeat-ack",
  });
  expect(messageHandler).not.toHaveBeenCalled();
  messageHandler.mockRestore();
  await evictDurableObject(party);
  first.socket.send(JSON.stringify({ type: "heartbeat" }));
  expect(await first.messages((message) => message.type === "heartbeat-ack")).toEqual({
    type: "heartbeat-ack",
  });
  await runInDurableObject(party, (_instance, state) => {
    expect(
      state
        .getWebSockets()
        .some((socket) => state.getWebSocketAutoResponseTimestamp(socket) !== null),
    ).toBe(true);
  });
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
      env.ANALYTICS_DB.prepare(
        "INSERT INTO events (id,occurred_at,kind,party_key,site,value) VALUES (?, ?, ?, ?, ?, ?)",
      ).bind(crypto.randomUUID(), start + minute * 60000, kind, key, site, value),
    ),
  );
  const yesterday = await usageReport(env.ANALYTICS_DB, "2026-09-10", "2026-09-10");
  expect(yesterday.parties).toMatchObject([
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
      durationMs: 0,
      status: "uncertain",
      connected: 1,
      participants: 1,
      peak: 1,
    },
  ]);
});

async function insertEvent(
  key: string,
  kind: string,
  at: number,
  value = 1,
  extra: { site?: string; browser?: string; source?: string; outcome?: string } = {},
) {
  await env.ANALYTICS_DB.prepare(
    "INSERT INTO events (id,occurred_at,kind,party_key,site,value,browser,version,source,outcome) VALUES (?,?,?,?,?,?,?,?,?,?)",
  )
    .bind(
      crypto.randomUUID(),
      at,
      kind,
      key,
      extra.site ?? "youtube.com",
      value,
      extra.browser ?? "chrome",
      "2.4.0",
      extra.source ?? "production",
      extra.outcome ?? "",
    )
    .run();
}

test("reports zero days, previous cohorts, confirmed together time, filters, and stale lower bounds", async () => {
  const start = Date.parse("2026-09-10T12:00:00Z");
  vi.spyOn(Date, "now").mockReturnValue(start + 60 * 60000);
  for (const [key, at, extra] of [
    ["current", start, {}],
    ["previous", start - 86400000, {}],
    ["test", start, { source: "test" }],
    ["firefox", start, { browser: "firefox", site: "netflix.com" }],
  ] as const) {
    await insertEvent(key, "party_created", at, 1, extra);
    await insertEvent(key, "party_size", at, 1, extra);
    await insertEvent(key, "participant_joined", at, 1, extra);
  }
  await insertEvent("current", "party_size", start + 60000, 2);
  await insertEvent("current", "sync_result", start + 120000, 1, { outcome: "applied" });
  await env.ANALYTICS_DB.prepare("INSERT INTO party_presence VALUES (?,?,?,?)")
    .bind("current", 3, 2, start + 8 * 60000)
    .run();
  const report = await usageReport(env.ANALYTICS_DB, "2026-09-10", "2026-09-11");
  expect(report.daily).toEqual([
    { day: "2026-09-10", parties: 2, participants: 2, messages: 0 },
    { day: "2026-09-11", parties: 0, participants: 0, messages: 0 },
  ]);
  expect(report.funnel).toEqual({
    started: 2,
    together: 1,
    fiveMinutes: 1,
    synced: 1,
    uncertain: 2,
    medianTimeToJoinMs: 60000,
  });
  expect(report.previousFunnel.started).toBe(1);
  expect(report.parties.find((p) => p.key === "current")).toMatchObject({
    durationMs: 8 * 60000,
    togetherMs: 7 * 60000,
    status: "uncertain",
  });
  const filtered = await usageReport(env.ANALYTICS_DB, "2026-09-10", "2026-09-10", {
    site: "netflix.com",
    browser: "firefox",
    version: "2.4.0",
  });
  expect(filtered.parties.map((p) => p.key)).toEqual(["firefox"]);
  const tests = await usageReport(env.ANALYTICS_DB, "2026-09-10", "2026-09-10", { source: "test" });
  expect(tests.totalParties).toBe(1);
  await expect(
    usageReport(env.ANALYTICS_DB, "2026-09-10", "2026-09-10", { page: -1 }),
  ).rejects.toThrow(RangeError);
});

test("history paginates more than 100 matching starts deterministically", async () => {
  const start = Date.parse("2026-09-10T12:00:00Z");
  await env.ANALYTICS_DB.batch(
    Array.from({ length: 102 }, (_, i) =>
      env.ANALYTICS_DB.prepare(
        "INSERT INTO events (id,occurred_at,kind,party_key,site,value) VALUES (?,?,'party_created',?,'youtube.com',1)",
      ).bind(`event-${i}`, start, `party-${String(i).padStart(3, "0")}`),
    ),
  );
  const first = await usageReport(env.ANALYTICS_DB, "2026-09-10", "2026-09-10");
  const second = await usageReport(env.ANALYTICS_DB, "2026-09-10", "2026-09-10", { page: 1 });
  expect(first.parties).toHaveLength(100);
  expect(first.hasMoreParties).toBe(true);
  expect(first.totalParties).toBe(102);
  expect(second.parties.map((p) => p.key)).toEqual(["party-100", "party-101"]);
  expect(second.hasMoreParties).toBe(false);
});

test("live snapshots exclude tests and separate stale membership without deleting quiet parties", async () => {
  const stats = env.LIVE_STATS.getByName("global");
  const now = Date.now();
  await stats.update({ key: "fresh", revision: 1, peers: 2, site: "youtube.com", updatedAt: now });
  await stats.update({
    key: "stale",
    revision: 1,
    peers: 3,
    site: "netflix.com",
    updatedAt: now - 300000,
  });
  await stats.update({
    key: "test",
    revision: 1,
    peers: 8,
    site: "example.com",
    updatedAt: now,
    source: "test",
  });
  expect(await stats.snapshot()).toMatchObject({
    parties: 1,
    peers: 2,
    together: 1,
    uncertainParties: 1,
    uncertainPeers: 3,
    sites: [{ site: "youtube.com", peers: 2, parties: 1 }],
  });
  await stats.update({ key: "stale", revision: 2, peers: 3, site: "netflix.com", updatedAt: now });
  expect(await stats.snapshot()).toMatchObject({ parties: 2, peers: 5, uncertainParties: 0 });
});

test("persisted telemetry retries after delivery failure and does not duplicate participation", async () => {
  const party = env.PARTY.get(env.PARTY.newUniqueId());
  const { PartyAnalytics } = await import("../src/analytics");
  await runInDurableObject(party, async (_instance, state) => {
    const analytics = new PartyAnalytics(state, env);
    // A SQL trigger simulates an unavailable sink without discarding existing data.
    await env.ANALYTICS_DB.prepare(
      "CREATE TRIGGER fail_events BEFORE INSERT ON events BEGIN SELECT RAISE(FAIL, 'offline'); END",
    ).run();
    analytics.membership(["local-peer"], "youtube.com", true, "local-peer");
    await analytics.flush();
    expect(analytics.pending()).toBe(true);
    await env.ANALYTICS_DB.prepare("DROP TRIGGER fail_events").run();
    const resumed = new PartyAnalytics(state, env);
    await resumed.flush();
    expect(resumed.pending()).toBe(false);
    resumed.membership(["local-peer"], "youtube.com", false, "local-peer");
    await resumed.flush();
  });
  const counts = (
    await env.ANALYTICS_DB.prepare("SELECT kind,COUNT(*) AS n FROM events GROUP BY kind").all()
  ).results;
  expect(counts).toEqual(
    expect.arrayContaining([
      { kind: "party_created", n: 1 },
      { kind: "participant_joined", n: 1 },
      { kind: "party_size", n: 1 },
    ]),
  );
});

test("membership alarms preserve responsive peers and clean up timed-out sockets", async () => {
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
      destination: { url: "https://youtube.com/watch", title: "Video" },
    }),
  );
  await messages((m) => m.type === "welcome");
  await runInDurableObject(party, async (instance, state) => {
    await instance.alarm();
    expect(state.getWebSockets().filter((s) => s.readyState === WebSocket.OPEN)).toHaveLength(1);
    for (const server of state.getWebSockets())
      server.serializeAttachment({
        ...server.deserializeAttachment(),
        lastSeen: Date.now() - 100000,
        joinedAt: Date.now() - 100000,
      });
    await instance.alarm();
  });
  await expect
    .poll(async () => (await env.LIVE_STATS.getByName("global").snapshot()).peers)
    .toBe(0);
  const today = new Date().toISOString().slice(0, 10);
  await expect
    .poll(async () => (await usageReport(env.ANALYTICS_DB, today, today)).parties[0]?.status)
    .toBe("ended");
  socket.close();
});

test("playback outcomes require a matching recipient command and duplicate acknowledgements are ignored", async () => {
  const party = env.PARTY.get(env.PARTY.newUniqueId());
  const connect = async () => {
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
        destination: { url: "https://youtube.com/watch", title: "Video" },
        client: { browser: "firefox", version: "2.4.0", source: "production" },
      }),
    );
    await messages((m) => m.type === "welcome");
    return { socket, messages };
  };
  const host = await connect(),
    guest = await connect();
  guest.socket.send(
    JSON.stringify({ type: "sync-result", commandId: crypto.randomUUID(), outcome: "applied" }),
  );
  host.socket.send(
    JSON.stringify({ type: "playback", action: "seek", timeFromEnd: 10, destinationRevision: 1 }),
  );
  const message = await guest.messages((m) => m.type === "playback");
  if (message.type !== "playback") throw new Error("Expected playback");
  expect(message.commandId).toBeDefined();
  for (const outcome of ["autoplay-blocked", "applied", "applied"])
    guest.socket.send(
      JSON.stringify({ type: "sync-result", commandId: message.commandId, outcome }),
    );
  await expect
    .poll(
      async () =>
        await env.ANALYTICS_DB.prepare(
          "SELECT COUNT(*) AS n FROM events WHERE kind='sync_result'",
        ).first("n"),
    )
    .toBe(2);
  expect(
    (
      await env.ANALYTICS_DB.prepare(
        "SELECT outcome FROM events WHERE kind='sync_result' ORDER BY occurred_at,rowid",
      ).all()
    ).results,
  ).toEqual([{ outcome: "autoplay-blocked" }, { outcome: "applied" }]);
  host.socket.close();
  guest.socket.close();
});

test("invite telemetry validates bounded reports and never persists extra private fields", async () => {
  const party = env.PARTY.get(env.PARTY.newUniqueId());
  const client = { browser: "chrome", version: "2.4.0", source: "test" };
  const post = (body: string) =>
    party.fetch(
      new Request("https://example.com/telemetry", {
        method: "POST",
        body,
      }),
    );
  expect((await post("{")).status).toBe(400);
  expect((await post("x".repeat(1025))).status).toBe(413);
  expect((await post(JSON.stringify({ outcome: "arbitrary", client }))).status).toBe(400);
  expect(
    (
      await post(
        JSON.stringify({
          outcome: "invite_opened",
          client: { ...client, browser: "raw user agent" },
        }),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await post(
        JSON.stringify({
          outcome: "invite_opened",
          client,
          title: "Private video title",
          url: "https://example.com/private-path",
          text: "Private message",
        }),
      )
    ).status,
  ).toBe(204);
  await expect
    .poll(async () => env.ANALYTICS_DB.prepare("SELECT COUNT(*) AS n FROM events").first("n"))
    .toBe(1);
  const rows = (await env.ANALYTICS_DB.prepare("SELECT * FROM events").all()).results;
  expect(rows[0]).toMatchObject({
    kind: "invite_opened",
    browser: "chrome",
    version: "2.4.0",
    source: "test",
    site: "unknown",
  });
  expect(JSON.stringify(rows)).not.toMatch(/Private|private-path|raw user agent/);
});

test("playback rates attribute replies across midnight to the attempted command's date", async () => {
  const start = Date.parse("2026-09-10T23:59:59Z");
  for (const [kind, at, outcome] of [
    ["sync_attempt", start, ""],
    ["sync_result", start + 2000, "applied"],
  ] as const) {
    await env.ANALYTICS_DB.prepare(
      "INSERT INTO events (id,occurred_at,kind,party_key,site,value,command_id,outcome) VALUES (?,?,?,?,?,1,?,?)",
    )
      .bind(crypto.randomUUID(), at, kind, "party", "youtube.com", "command", outcome)
      .run();
  }
  const yesterday = await usageReport(env.ANALYTICS_DB, "2026-09-10", "2026-09-10");
  expect(yesterday.outcomes.map((row) => [row.kind, row.count])).toEqual([
    ["sync_attempt", 1],
    ["sync_result", 1],
  ]);
  const today = await usageReport(env.ANALYTICS_DB, "2026-09-11", "2026-09-11");
  expect(today.outcomes).toEqual([]);
  expect(yesterday.playbackResults).toMatchObject([
    { attempts: 1, applied: 1, blocked: 0, failed: 0 },
  ]);
  expect(today.playbackResults).toEqual([]);
  for (const outcome of ["video-missing", "autoplay-blocked", "timeout", "failed"]) {
    await env.ANALYTICS_DB.prepare(
      "INSERT INTO events (id,occurred_at,kind,party_key,site,value,command_id,outcome) VALUES (?,?, 'sync_result','party','youtube.com',1,'command',?)",
    )
      .bind(crypto.randomUUID(), start + 3000, outcome)
      .run();
  }
  const retried = await usageReport(env.ANALYTICS_DB, "2026-09-10", "2026-09-10");
  expect(retried.playbackResults).toMatchObject([
    { attempts: 1, applied: 1, blocked: 1, failed: 1 },
  ]);
});
