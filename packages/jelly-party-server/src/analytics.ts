import { DurableObject } from "cloudflare:workers";
import { parse } from "tldts";
import { logOperationalEvent } from "./operational-log";
import {
  MEMBERSHIP_FRESH_MS,
  UNKNOWN_CLIENT,
  type ClientInfo,
  type LiveSnapshot,
  type PartySnapshot,
  type UsageEvent,
  type SyncOutcome,
} from "jelly-party-lib";
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

interface StoredEvent {
  id: string;
  at: number;
  kind: UsageEvent;
  key: string;
  site: string;
  value: number;
  client: ClientInfo;
  outcome: string;
  commandId: string;
  revision: number;
}

const FAILURE_LOG_INTERVAL_MS = 5 * 60_000;
type StagingStage = "membership" | "deduplication" | "event";
type DeliveryStage = "outbox_read" | "d1" | "live_stats" | "outbox_checkpoint";
type DeliveryFailure = { stage: DeliveryStage; since: number; loggedAt: number };

export class PartyAnalytics {
  private ready = false;
  private flushing: Promise<void> | undefined;
  private dirty = false;
  private readonly stagingLogAt = new Map<StagingStage, number>();
  private nextDelayedLogAt = 0;
  private deliveryFailure?: DeliveryFailure;
  constructor(
    private ctx: DurableObjectState,
    private env: Env,
  ) {}

  private identity(): { key: string; revision: number } {
    const sql = this.ctx.storage.sql;
    if (!this.ready) {
      sql.exec(`CREATE TABLE IF NOT EXISTS analytics_state (singleton INTEGER PRIMARY KEY CHECK (singleton=1), key TEXT NOT NULL, revision INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS analytics_peers (peer_id TEXT PRIMARY KEY);
        CREATE TABLE IF NOT EXISTS analytics_outbox (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS analytics_snapshot (singleton INTEGER PRIMARY KEY CHECK (singleton=1), payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS analytics_outcomes (key TEXT PRIMARY KEY);
        CREATE TABLE IF NOT EXISTS analytics_delivery (singleton INTEGER PRIMARY KEY CHECK (singleton=1), revision INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS analytics_delivery_failure (singleton INTEGER PRIMARY KEY CHECK (singleton=1), stage TEXT NOT NULL, since INTEGER NOT NULL, logged_at INTEGER NOT NULL);`);
      sql.exec("INSERT OR IGNORE INTO analytics_state VALUES (1, ?, 0)", crypto.randomUUID());
      this.deliveryFailure ??= sql
        .exec<DeliveryFailure>(
          "SELECT stage, since, logged_at AS loggedAt FROM analytics_delivery_failure",
        )
        .toArray()[0];
      this.ready = true;
    }
    return sql
      .exec<{ key: string; revision: number }>("SELECT key,revision FROM analytics_state")
      .one();
  }

  membership(
    peerIds: string[],
    site: string,
    created = false,
    joiningPeer?: string,
    client = UNKNOWN_CLIENT,
  ): void {
    try {
      const { key } = this.identity();
      const { revision } = this.ctx.storage.sql
        .exec<{ revision: number }>(
          "UPDATE analytics_state SET revision = revision + 1 RETURNING revision",
        )
        .one();
      const count = new Set(peerIds).size;
      const previous = this.ctx.storage.sql
        .exec<{ payload: string }>("SELECT payload FROM analytics_snapshot")
        .toArray()[0];
      const old = previous ? (JSON.parse(previous.payload) as PartySnapshot) : undefined;
      client = { ...client, source: old?.source ?? client.source };
      const snapshot: PartySnapshot = {
        key,
        revision,
        peers: count,
        site,
        updatedAt: Date.now(),
        source: client.source,
      };
      this.ctx.storage.sql.exec(
        "INSERT OR REPLACE INTO analytics_snapshot VALUES (1, ?)",
        JSON.stringify(snapshot),
      );
      if (created) this.event("party_created", site, client, `${key}:created`);
      if (joiningPeer) {
        const inserted = this.ctx.storage.sql
          .exec("INSERT OR IGNORE INTO analytics_peers VALUES (?) RETURNING peer_id", joiningPeer)
          .toArray();
        if (inserted.length) this.event("participant_joined", site, client);
      }
      if (!old || old.peers !== count || old.site !== site)
        this.event(
          "party_size",
          site,
          client,
          `${key}:size:${revision}`,
          count,
          undefined,
          "",
          revision,
        );
      this.kick();
    } catch {
      this.logStagingFailure("membership");
    }
  }

  once(kind: UsageEvent, site: string, token: string, client = UNKNOWN_CLIENT): void {
    try {
      this.identity();
      if (
        this.ctx.storage.sql
          .exec(
            "INSERT OR IGNORE INTO analytics_outcomes VALUES (?) RETURNING key",
            `${kind}:${token}`,
          )
          .toArray().length
      )
        this.event(kind, site, client);
    } catch {
      this.logStagingFailure("deduplication");
    }
  }

  event(
    kind: UsageEvent,
    site: string,
    client = UNKNOWN_CLIENT,
    id: string = crypto.randomUUID(),
    value = 1,
    outcome?: SyncOutcome,
    commandId = "",
    revision = 0,
  ): void {
    try {
      const { key } = this.identity();
      const snapshot = this.ctx.storage.sql
        .exec<{ payload: string }>("SELECT payload FROM analytics_snapshot")
        .toArray()[0];
      if (snapshot)
        client = {
          ...client,
          source: (JSON.parse(snapshot.payload) as PartySnapshot).source ?? client.source,
        };
      const event: StoredEvent = {
        id,
        at: Date.now(),
        kind,
        key,
        site,
        value,
        client,
        outcome: outcome ?? "",
        commandId,
        revision,
      };
      this.ctx.storage.sql.exec(
        "INSERT OR IGNORE INTO analytics_outbox VALUES (?, ?)",
        id,
        JSON.stringify(event),
      );
      this.kick();
    } catch {
      this.logStagingFailure("event");
    }
  }

  private logStagingFailure(stage: StagingStage): void {
    const now = Date.now();
    if (now < (this.stagingLogAt.get(stage) ?? 0)) return;
    this.stagingLogAt.set(stage, now + FAILURE_LOG_INTERVAL_MS);
    logOperationalEvent(this.ctx, "warn", { event: "analytics_staging", outcome: "failed", stage });
  }

  private kick(): void {
    this.dirty = true;
    this.ctx.waitUntil(this.flush());
  }

  flush(): Promise<void> {
    if (this.flushing) return this.flushing;
    let pending: boolean | undefined;
    this.flushing = Promise.resolve()
      .then(async () => {
        this.dirty = false;
        pending = await this.deliver();
      })
      .finally(() => {
        this.flushing = undefined;
        if (pending !== undefined && (pending || this.dirty)) this.kick();
      });
    return this.flushing;
  }

  private async deliver(): Promise<boolean | undefined> {
    let stage: DeliveryStage = "outbox_read";
    let batchSize = 0;
    let oldestEventAt: number | undefined;
    try {
      this.identity();
      // One bounded batch per turn. The party alarm drains any backlog after an outage.
      const rows = this.ctx.storage.sql
        .exec<{ id: string; payload: string }>(
          "SELECT id,payload FROM analytics_outbox ORDER BY rowid LIMIT 100",
        )
        .toArray();
      batchSize = rows.length;
      const events = rows.map((row) => JSON.parse(row.payload) as StoredEvent);
      oldestEventAt = events[0]?.at;
      const stored = this.ctx.storage.sql
        .exec<{ payload: string }>("SELECT payload FROM analytics_snapshot")
        .toArray()[0];
      const snapshot = stored ? (JSON.parse(stored.payload) as PartySnapshot) : undefined;
      stage = "d1";
      const statements = events.map((e) =>
        this.env.ANALYTICS_DB.prepare(
          "INSERT OR IGNORE INTO events (id,occurred_at,kind,party_key,site,value,browser,version,source,outcome,command_id,revision) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        ).bind(
          e.id,
          e.at,
          e.kind,
          e.key,
          e.site,
          e.value,
          e.client.browser,
          e.client.version,
          e.client.source,
          e.outcome,
          e.commandId,
          e.revision,
        ),
      );
      if (snapshot)
        statements.push(
          this.env.ANALYTICS_DB.prepare(
            `INSERT INTO party_presence VALUES (?,?,?,?) ON CONFLICT(party_key) DO UPDATE SET revision=excluded.revision,peers=excluded.peers,observed_at=excluded.observed_at WHERE excluded.revision > party_presence.revision`,
          ).bind(snapshot.key, snapshot.revision, snapshot.peers, snapshot.updatedAt),
        );
      if (statements.length) await this.env.ANALYTICS_DB.batch(statements);
      // Keep the snapshot until both destinations accepted it. Revision checks make replay safe.
      stage = "live_stats";
      if (snapshot) await this.env.LIVE_STATS.getByName("global").update(snapshot);
      stage = "outbox_checkpoint";
      if (snapshot)
        this.ctx.storage.sql.exec(
          "INSERT OR REPLACE INTO analytics_delivery VALUES (1, ?)",
          snapshot.revision,
        );
      for (const row of rows)
        this.ctx.storage.sql.exec("DELETE FROM analytics_outbox WHERE id = ?", row.id);
      const pending = this.dirty || this.pending();
      const now = Date.now();
      const oldestEventAge = oldestEventAt === undefined ? 0 : now - oldestEventAt;
      if (this.deliveryFailure && !pending) {
        const { stage, since } = this.deliveryFailure;
        this.ctx.storage.sql.exec("DELETE FROM analytics_delivery_failure");
        this.deliveryFailure = undefined;
        logOperationalEvent(this.ctx, "info", {
          event: "analytics_delivery",
          outcome: "recovered",
          stage,
          outage_ms: now - since,
        });
      } else if (
        !this.deliveryFailure &&
        oldestEventAge >= MEMBERSHIP_FRESH_MS &&
        now >= this.nextDelayedLogAt
      ) {
        this.nextDelayedLogAt = now + FAILURE_LOG_INTERVAL_MS;
        logOperationalEvent(this.ctx, "warn", {
          event: "analytics_delivery",
          outcome: "delayed",
          batch_size: batchSize,
          oldest_event_age_ms: oldestEventAge,
        });
      }
      return pending;
    } catch {
      this.logDeliveryFailure(stage, batchSize, oldestEventAt);
      return undefined;
    }
  }

  private logDeliveryFailure(
    stage: DeliveryStage,
    batchSize: number,
    oldestEventAt?: number,
  ): void {
    const now = Date.now();
    const previous = this.deliveryFailure;
    if (previous?.stage === stage && now - previous.loggedAt < FAILURE_LOG_INTERVAL_MS) return;
    const since = previous?.since ?? now;
    this.deliveryFailure = { stage, since, loggedAt: now };
    logOperationalEvent(this.ctx, "warn", {
      event: "analytics_delivery",
      outcome: "retry_pending",
      stage,
      batch_size: batchSize,
      oldest_event_age_ms: oldestEventAt === undefined ? undefined : now - oldestEventAt,
      outage_ms: now - since,
    });
    try {
      this.ctx.storage.sql.exec(
        "INSERT OR REPLACE INTO analytics_delivery_failure VALUES (1, ?, ?, ?)",
        stage,
        since,
        now,
      );
    } catch {
      // Keep reporting failures even when local storage cannot checkpoint the log.
    }
  }

  pending(): boolean {
    this.identity();
    return (
      this.ctx.storage.sql
        .exec<{ n: number }>(`SELECT (SELECT COUNT(*) FROM analytics_outbox) +
      COALESCE((SELECT json_extract(payload,'$.revision') > COALESCE((SELECT revision FROM analytics_delivery),0) FROM analytics_snapshot),0) AS n`)
        .one().n > 0
    );
  }
}

export class LiveStats extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.storage.sql
      .exec(`CREATE TABLE IF NOT EXISTS parties (key TEXT PRIMARY KEY,revision INTEGER NOT NULL,peers INTEGER NOT NULL,site TEXT NOT NULL,updated_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS active_parties ON parties(peers) WHERE peers > 0;
      CREATE TABLE IF NOT EXISTS test_parties (key TEXT PRIMARY KEY);`);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  update(snapshot: PartySnapshot): void {
    if (snapshot.source === "test")
      this.ctx.storage.sql.exec("INSERT OR IGNORE INTO test_parties VALUES (?)", snapshot.key);
    const changed = this.ctx.storage.sql
      .exec(
        `INSERT INTO parties VALUES (?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET revision=excluded.revision,peers=excluded.peers,site=excluded.site,updated_at=excluded.updated_at WHERE excluded.revision > parties.revision RETURNING key`,
        snapshot.key,
        snapshot.revision,
        snapshot.peers,
        snapshot.site,
        snapshot.updatedAt,
      )
      .toArray();
    if (changed.length) this.push();
  }

  snapshot(): LiveSnapshot {
    const fresh = Date.now() - MEMBERSHIP_FRESH_MS;
    const totals = this.ctx.storage.sql
      .exec<{
        parties: number;
        peers: number;
        together: number;
        uncertainParties: number;
        uncertainPeers: number;
        observedAt: number | null;
      }>(
        `SELECT COALESCE(SUM(updated_at >= ?),0) AS parties, COALESCE(SUM(CASE WHEN updated_at >= ? THEN peers ELSE 0 END),0) AS peers,
      COALESCE(SUM(peers >= 2 AND updated_at >= ?),0) AS together, COALESCE(SUM(updated_at < ?),0) AS uncertainParties,
      COALESCE(SUM(CASE WHEN updated_at < ? THEN peers ELSE 0 END),0) AS uncertainPeers, MAX(updated_at) AS observedAt
      FROM parties WHERE peers > 0 AND key NOT IN (SELECT key FROM test_parties)`,
        fresh,
        fresh,
        fresh,
        fresh,
        fresh,
      )
      .one();
    const sites = this.ctx.storage.sql
      .exec<{ site: string; peers: number; parties: number }>(
        "SELECT site,SUM(peers) AS peers,COUNT(*) AS parties FROM parties WHERE peers > 0 AND updated_at >= ? AND key NOT IN (SELECT key FROM test_parties) GROUP BY site ORDER BY peers DESC,site LIMIT 100",
        fresh,
      )
      .toArray();
    return { ...totals, sites, updatedAt: Date.now() };
  }

  private push(): void {
    const message = JSON.stringify(this.snapshot());
    for (const socket of this.ctx.getWebSockets()) {
      if (socket.readyState !== WebSocket.OPEN) continue;
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

  async alarm(): Promise<void> {
    this.push();
    if (this.ctx.getWebSockets().some((s) => s.readyState === WebSocket.OPEN))
      await this.ctx.storage.setAlarm(Date.now() + 30_000);
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
      return new Response("WebSocket required", { status: 426 });
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(Number(request.headers.get("X-Analytics-Expires")));
    server.send(JSON.stringify(this.snapshot()));
    await this.ctx.storage.setAlarm(Date.now() + 30_000);
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(socket: WebSocket): void {
    socket.close(1008, "Read-only connection");
  }
}
