import { DurableObject } from "cloudflare:workers";
import { parse } from "tldts";
import type { LiveSnapshot, PartySnapshot, UsageEvent, UsageReport } from "jelly-party-lib";

export function analyticsSite(value: string): string {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return "unknown";
    const result = parse(url.hostname, { allowPrivateDomains: false, validateHostname: true });
    return result.isIcann && result.domain ? result.domain : "unknown";
  } catch {
    return "unknown";
  }
}

// Short, bounded retries; analytics must never reject a party operation.
export async function reportSafely(operation: () => Promise<unknown>): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await operation();
      return;
    } catch {
      if (attempt === 2) console.warn("Analytics report failed");
    }
  }
}

export class PartyAnalytics {
  private ready = false;
  constructor(
    private storage: DurableObjectStorage,
    private env: Env,
  ) {}

  private identity(): { key: string; revision: number } {
    if (!this.ready) {
      this.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS analytics_state (
          singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
          key TEXT NOT NULL, revision INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS analytics_peers (peer_id TEXT PRIMARY KEY);
      `);
      this.storage.sql.exec(
        "INSERT OR IGNORE INTO analytics_state VALUES (1, ?, 0)",
        crypto.randomUUID(),
      );
      this.ready = true;
    }
    return this.storage.sql
      .exec<{ key: string; revision: number }>("SELECT key, revision FROM analytics_state")
      .one();
  }

  membership(peerIds: string[], site: string, created = false, joiningPeer?: string): void {
    try {
      const { key } = this.identity();
      const { revision } = this.storage.sql
        .exec<{ revision: number }>(
          "UPDATE analytics_state SET revision = revision + 1 RETURNING revision",
        )
        .one();
      const count = new Set(peerIds).size;
      const snapshot: PartySnapshot = { key, revision, peers: count, site, updatedAt: Date.now() };
      void reportSafely(() => this.env.LIVE_STATS.getByName("global").update(snapshot));
      if (created) this.event("party_created", site, `${key}:created`);
      if (joiningPeer) {
        const inserted = this.storage.sql
          .exec<{ peer_id: string }>(
            "INSERT OR IGNORE INTO analytics_peers VALUES (?) RETURNING peer_id",
            joiningPeer,
          )
          .toArray();
        if (inserted.length) this.event("participant_joined", site);
      }
      this.event("party_size", site, undefined, count);
    } catch {
      console.warn("Analytics membership unavailable");
    }
  }

  event(kind: UsageEvent, site: string, id: string = crypto.randomUUID(), value = 1): void {
    try {
      const { key } = this.identity();
      const at = Date.now();
      void reportSafely(() =>
        this.env.ANALYTICS_DB.prepare(
          "INSERT OR IGNORE INTO events (id, occurred_at, kind, party_key, site, value) VALUES (?, ?, ?, ?, ?, ?)",
        )
          .bind(id, at, kind, key, site, value)
          .run(),
      );
    } catch {
      console.warn("Analytics event unavailable");
    }
  }
}

export class LiveStats extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS parties (
      key TEXT PRIMARY KEY, revision INTEGER NOT NULL, peers INTEGER NOT NULL,
      site TEXT NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS active_parties ON parties(peers) WHERE peers > 0`);
  }

  update(snapshot: PartySnapshot): void {
    const changed = this.ctx.storage.sql
      .exec<{ key: string }>(
        `INSERT INTO parties VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET revision = excluded.revision, peers = excluded.peers,
         site = excluded.site, updated_at = excluded.updated_at
       WHERE excluded.revision > parties.revision RETURNING key`,
        snapshot.key,
        snapshot.revision,
        snapshot.peers,
        snapshot.site,
        snapshot.updatedAt,
      )
      .toArray();
    // Keep the zero-peer revision so a late retry cannot resurrect a finished party.
    if (!changed.length) return;
    const message = JSON.stringify(this.snapshot());
    for (const socket of this.ctx.getWebSockets()) {
      if (socket.readyState === WebSocket.OPEN) {
        const expires = socket.deserializeAttachment();
        if (typeof expires !== "number" || expires <= Date.now()) {
          socket.close(1008, "Sign in again");
          continue;
        }
        try {
          socket.send(message);
        } catch {
          socket.close(1011, "Reconnect");
        }
      }
    }
  }

  snapshot(): LiveSnapshot {
    const totals = this.ctx.storage.sql
      .exec<{ parties: number; peers: number; together: number }>(
        "SELECT COUNT(*) AS parties, COALESCE(SUM(peers), 0) AS peers, COALESCE(SUM(peers >= 2), 0) AS together FROM parties WHERE peers > 0",
      )
      .one();
    const sites = this.ctx.storage.sql
      .exec<{ site: string; peers: number; parties: number }>(
        "SELECT site, SUM(peers) AS peers, COUNT(*) AS parties FROM parties WHERE peers > 0 GROUP BY site ORDER BY peers DESC, site LIMIT 100",
      )
      .toArray();
    return { ...totals, sites, updatedAt: Date.now() };
  }

  fetch(request: Request): Response {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
      return new Response("WebSocket required", { status: 426 });
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(Number(request.headers.get("X-Analytics-Expires")));
    server.send(JSON.stringify(this.snapshot()));
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(socket: WebSocket): void {
    socket.close(1008, "Read-only connection");
  }
}

export async function usageReport(db: D1Database, from: string, to: string): Promise<UsageReport> {
  const start = Date.parse(from);
  const end = Date.parse(to) + 86400000;
  if (
    ![from, to].every((day) => /^\d{4}-\d{2}-\d{2}$/.test(day)) ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    new Date(start).toISOString().slice(0, 10) !== from ||
    new Date(end - 86400000).toISOString().slice(0, 10) !== to ||
    end <= start ||
    end - start > 366 * 86400000
  ) {
    throw new RangeError("Choose a date range of up to one year.");
  }
  const results = await db.batch([
    db
      .prepare(`SELECT kind, SUM(value) AS count FROM events
      WHERE occurred_at >= ? AND occurred_at < ? AND kind != 'party_size' GROUP BY kind`)
      .bind(start, end),
    db
      .prepare(`SELECT strftime('%Y-%m-%d', occurred_at / 1000, 'unixepoch') AS day,
      SUM(kind = 'party_created') AS parties, SUM(kind = 'participant_joined') AS participants,
      SUM(kind = 'chat_sent') AS messages FROM events WHERE occurred_at >= ? AND occurred_at < ?
      GROUP BY day ORDER BY day`)
      .bind(start, end),
    db
      .prepare(`SELECT site, COUNT(DISTINCT party_key) AS parties,
      SUM(CASE WHEN kind = 'participant_joined' THEN value ELSE 0 END) AS participants
      FROM events WHERE occurred_at >= ? AND occurred_at < ? GROUP BY site ORDER BY parties DESC, site LIMIT 100`)
      .bind(start, end),
    db
      .prepare(`SELECT peak, COUNT(*) AS parties FROM (
      SELECT MAX(value) AS peak FROM events WHERE kind = 'party_size' AND occurred_at >= ? AND occurred_at < ?
      GROUP BY party_key) GROUP BY peak ORDER BY peak`)
      .bind(start, end),
    db
      .prepare(`WITH recent AS (
      SELECT party_key, occurred_at AS startedAt FROM events
      WHERE kind = 'party_created' AND occurred_at >= ? AND occurred_at < ?
      ORDER BY occurred_at DESC, party_key LIMIT 101
    ), membership AS (
      SELECT e.party_key, e.value, e.occurred_at,
        LEAD(e.occurred_at, 1, ?) OVER (
          PARTITION BY e.party_key ORDER BY e.occurred_at, e.rowid
        ) AS next_at,
        ROW_NUMBER() OVER (
          PARTITION BY e.party_key ORDER BY e.occurred_at DESC, e.rowid DESC
        ) AS latest
      FROM events e JOIN recent USING (party_key) WHERE e.kind = 'party_size'
    ), presence AS (
      SELECT party_key,
        SUM(CASE WHEN value > 0 THEN MAX(0, next_at - occurred_at) ELSE 0 END) AS durationMs,
        MAX(value) AS peak, MAX(CASE WHEN latest = 1 THEN value ELSE 0 END) AS connected
      FROM membership GROUP BY party_key
    )
    SELECT recent.party_key AS key, recent.startedAt,
      COALESCE(presence.durationMs, 0) AS durationMs,
      COALESCE(presence.peak, 0) AS peak, COALESCE(presence.connected, 0) AS connected,
      SUM(e.kind = 'participant_joined') AS participants,
      SUM(e.kind = 'chat_sent') AS messages, GROUP_CONCAT(DISTINCT e.site) AS sites
    FROM recent JOIN events e USING (party_key) LEFT JOIN presence USING (party_key)
    GROUP BY recent.party_key ORDER BY recent.startedAt DESC, recent.party_key`)
      .bind(start, end, Date.now()),
  ]);
  const parties = results[4].results as Array<
    Omit<UsageReport["parties"][number], "sites"> & { sites: string }
  >;
  return {
    totals: results[0].results as UsageReport["totals"],
    daily: results[1].results as UsageReport["daily"],
    sites: results[2].results as UsageReport["sites"],
    sizes: results[3].results as UsageReport["sizes"],
    parties: parties
      .slice(0, 100)
      .map((party) => ({ ...party, sites: party.sites.split(",").sort() })),
    hasMoreParties: parties.length > 100,
  };
}
