import { adminRequest } from "./admin";
import { PartyAnalytics, analyticsSite } from "./analytics";
export { LiveStats } from "./analytics";
import {
  HISTORY_PAGE_SIZE,
  MAX_CHAT_MESSAGES,
  parseClientMessage,
  parsePartyId,
  type ChatEntry,
  type ChatHistoryPage,
  type PartyEntry,
  type PartyDestination,
  type PartyDestinationInput,
  type PeerIdentity,
  type PlaybackSnapshot,
  type ServerMessage,
  type SystemEntry,
  type SystemEntryAction,
} from "jelly-party-lib";
import { DurableObject } from "cloudflare:workers";
import { RELEASE_VERSION } from "../../../config/release";
import {
  CHAT_BURST_LIMIT,
  CHAT_COOLDOWN_MS,
  maxPartiesPerMonth,
  MAX_PARTY_CONNECTIONS,
  monthKey,
  PARTY_RETENTION_MS,
  SOCKET_MESSAGE_LIMIT,
  SOCKET_MESSAGE_WINDOW_MS,
} from "./limits";

const SCHEMA_VERSION = 4;
const API_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
};

interface ChatRow extends Record<string, string | number | null> {
  id: number;
  kind: string;
  peerId: string;
  peerName: string;
  peerEmoji: string;
  text: string;
  destinationUrl: string | null;
  destinationRevision: number | null;
  targetPeerId: string | null;
  targetPeerName: string | null;
  targetPeerEmoji: string | null;
  sentAt: number;
}

interface ConnectionAttachment {
  peer: PeerIdentity;
  joinedAt: number;
  leader?: boolean;
  playback?: PlaybackSnapshot;
}

interface DestinationRow extends Record<string, string | number> {
  url: string;
  title: string;
  revision: number;
}

interface MessageWindow {
  startedAt: number;
  messages: number;
  chatTokens: number;
  chatRefilledAt: number;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.hostname === "dashboard.jelly-party.com" && url.pathname === "/")
      return Response.redirect(new URL("/admin", url), 302);
    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/"))
      return adminRequest(request, env);
    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ status: "ok", version: RELEASE_VERSION });
    }
    if (url.pathname === "/party" && request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...API_HEADERS,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
      });
    }
    if (url.pathname === "/party" && request.method === "POST") {
      return createParty(request, env);
    }

    const partyId = /^\/party\/([^/]+)$/.exec(url.pathname)?.[1];
    if (!partyId || !parsePartyId(partyId)) return env.ASSETS.fetch(request);
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required", { status: 426 });
    }
    const { success } = await env.PARTY_CONNECTION_RATE_LIMITER.limit({
      key: clientKey(request),
    });
    if (!success) return new Response("Too many party connections", { status: 429 });

    try {
      return env.PARTY.get(env.PARTY.idFromString(partyId)).fetch(request);
    } catch {
      return new Response("Not found", { status: 404 });
    }
  },
} satisfies ExportedHandler<Env>;

async function createParty(request: Request, env: Env): Promise<Response> {
  const { success } = await env.PARTY_CREATION_RATE_LIMITER.limit({ key: clientKey(request) });
  if (!success) {
    return Response.json(
      { error: "Too many parties were started from this network. Try again in a minute." },
      { status: 429, headers: { ...API_HEADERS, "Retry-After": "60" } },
    );
  }

  const limit = maxPartiesPerMonth(env.MAX_PARTIES_PER_MONTH);
  const reservation = await env.PARTY_QUOTA.getByName("global").reserveParty(limit);
  if (!reservation.allowed) {
    console.warn("Monthly party creation safety limit reached", { limit });
    return Response.json(
      { error: "Jelly Party reached its monthly safety limit. Please try again later." },
      { status: 429, headers: API_HEADERS },
    );
  }
  if (reservation.count === Math.ceil(limit / 2) || reservation.count === Math.ceil(limit * 0.8)) {
    console.warn("Party creation safety limit threshold reached", {
      count: reservation.count,
      limit,
    });
  }

  return Response.json(
    { partyId: env.PARTY.newUniqueId().toString() },
    { status: 201, headers: API_HEADERS },
  );
}

function clientKey(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? "unknown";
}

export class PartyQuota extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS monthly_party_creations (
          month TEXT PRIMARY KEY,
          count INTEGER NOT NULL CHECK (count > 0)
        )
      `);
    });
  }

  async reserveParty(limit: number): Promise<{ allowed: boolean; count: number }> {
    const month = monthKey();
    const row = this.ctx.storage.sql
      .exec<{ count: number }>(
        `INSERT INTO monthly_party_creations (month, count) VALUES (?, 1)
         ON CONFLICT(month) DO UPDATE SET count = count + 1 WHERE count < ?
         RETURNING count`,
        month,
        limit,
      )
      .toArray()[0];
    this.ctx.storage.sql.exec("DELETE FROM monthly_party_creations WHERE month < ?", month);
    return row ? { allowed: true, count: row.count } : { allowed: false, count: limit };
  }
}

export class Party extends DurableObject<Env> {
  private schemaReady = false;
  private analytics = new PartyAnalytics(this.ctx.storage, this.env);
  private readonly messageWindows = new WeakMap<WebSocket, MessageWindow>();

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required", { status: 426 });
    }
    const connections = this.ctx
      .getWebSockets()
      .filter((socket) => socket.readyState === WebSocket.OPEN).length;
    if (connections >= MAX_PARTY_CONNECTIONS) {
      return new Response("This party is full", { status: 429 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (!this.allowMessage(socket)) return;
    const parsed = parseClientMessage(
      typeof raw === "string" ? raw : new TextDecoder().decode(raw),
    );
    if (!parsed.ok)
      return this.send(socket, { type: "error", code: "invalid-message", message: parsed.error });

    const message = parsed.value;
    const peer = this.peer(socket);
    if (message.type === "join") {
      if (peer)
        return this.send(socket, {
          type: "error",
          code: "invalid-message",
          message: "Already joined",
        });
      this.ensureSchema();
      const initializePlayback = this.peers().length === 0;
      let destination = this.destination();
      const created = !destination;
      if (!destination) {
        destination = this.saveDestination(message.destination);
        this.saveSystemEntry(message.peer, "party-started", destination);
      }
      const playback = this.playback(destination.revision);
      socket.serializeAttachment({
        peer: message.peer,
        joinedAt: Date.now(),
        leader: initializePlayback,
        playback,
      });
      await this.ctx.storage.deleteAlarm();
      const leaderId = this.leader()?.peer.id ?? message.peer.id;
      this.send(socket, {
        type: "welcome",
        peerId: message.peer.id,
        history: this.history(),
        destination,
        leaderId,
        playback,
        initializePlayback,
      });
      this.broadcastPresence();
      this.reportMembership(created, message.peer.id);
      return;
    }
    if (!peer) {
      return this.send(socket, {
        type: "error",
        code: "join-required",
        message: "Join a party before sending messages",
      });
    }
    if (message.type === "heartbeat") return;
    this.ensureSchema();
    if (message.type === "history")
      return this.send(socket, { type: "history", history: this.history(message.beforeId) });
    if (message.type === "chat") {
      if (!this.allowChat(socket)) return;
      const entry = this.saveChat(peer, message.text);
      this.broadcast({ type: "chat", entry });
      this.analytics.event("chat_sent", this.analyticsSite());
      return;
    }
    if (message.type === "destination") {
      if (this.leader()?.peer.id !== peer.id) {
        return this.send(socket, {
          type: "error",
          code: "leader-required",
          message: "Only the party leader can change the video",
        });
      }
      const destination = this.saveDestination(message.destination);
      const entry = this.saveSystemEntry(peer, "video-changed", destination);
      this.clearPlayback();
      this.broadcast({ type: "chat", entry });
      this.broadcast({ type: "destination", peerId: peer.id, destination });
      this.analytics.event("video_changed", this.analyticsSite());
      this.reportMembership();
      return;
    }
    if (message.type === "leader") {
      if (this.leader()?.peer.id !== peer.id) {
        return this.send(socket, {
          type: "error",
          code: "leader-required",
          message: "Only the party leader can choose a new leader",
        });
      }
      const target = this.connection(message.peerId);
      if (!target) {
        return this.send(socket, {
          type: "error",
          code: "invalid-message",
          message: "That person is no longer in the party",
        });
      }
      if (target.attachment.peer.id === peer.id) return;
      for (const candidate of this.ctx.getWebSockets()) {
        const attachment = this.attachment(candidate);
        if (attachment) {
          candidate.serializeAttachment({
            ...attachment,
            leader: candidate === target.socket,
          });
        }
      }
      const entry = this.saveLeaderEntry(peer, target.attachment.peer);
      this.broadcast({ type: "chat", entry });
      this.broadcastPresence();
      return;
    }
    const destination = this.destination();
    if (!destination || message.destinationRevision !== destination.revision) return;
    const current = this.playback(destination.revision);
    const playback: PlaybackSnapshot = {
      playing:
        message.action === "play"
          ? true
          : message.action === "pause"
            ? false
            : (current?.playing ?? false),
      timeFromEnd: message.timeFromEnd,
      updatedAt: Date.now(),
      destinationRevision: destination.revision,
    };
    this.rememberPlayback(playback);
    this.broadcast(
      {
        type: "playback",
        peerId: peer.id,
        action: message.action,
        timeFromEnd: message.timeFromEnd,
        destinationRevision: destination.revision,
      },
      socket,
    );
    this.analytics.event(message.action, this.analyticsSite());
  }

  async webSocketClose(socket: WebSocket): Promise<void> {
    if (!this.peer(socket)) return;
    socket.serializeAttachment(null);
    this.broadcastPresence();
    this.reportMembership();
    if (this.peers().length === 0) await this.ctx.storage.setAlarm(Date.now() + PARTY_RETENTION_MS);
  }

  async alarm(): Promise<void> {
    if (this.peers().length === 0) {
      await this.ctx.storage.deleteAll();
      this.schemaReady = false;
      this.analytics = new PartyAnalytics(this.ctx.storage, this.env);
    }
  }

  private analyticsSite(): string {
    try {
      return analyticsSite(this.destination()?.url ?? "");
    } catch {
      return "unknown";
    }
  }

  private reportMembership(created = false, joiningPeer?: string): void {
    this.analytics.membership(
      this.peers().map((peer) => peer.id),
      this.analyticsSite(),
      created,
      joiningPeer,
    );
  }

  private saveChat(peer: PeerIdentity, text: string): ChatEntry {
    const entry = this.ctx.storage.sql
      .exec<ChatRow>(
        `INSERT INTO chat (peer_id, peer_name, peer_emoji, text, sent_at)
         VALUES (?, ?, ?, ?, ?)
         RETURNING id, kind, peer_id AS peerId, peer_name AS peerName,
                   peer_emoji AS peerEmoji, text, destination_url AS destinationUrl,
                   destination_revision AS destinationRevision,
                   target_peer_id AS targetPeerId, target_peer_name AS targetPeerName,
                   target_peer_emoji AS targetPeerEmoji, sent_at AS sentAt`,
        peer.id,
        peer.name,
        peer.emoji,
        text,
        Date.now(),
      )
      .one();
    this.pruneHistory(entry.id);
    return toChatEntry(entry);
  }

  private saveSystemEntry(
    peer: PeerIdentity,
    action: Exclude<SystemEntryAction, "leader-changed">,
    destination: PartyDestination,
  ): SystemEntry {
    const entry = this.ctx.storage.sql
      .exec<ChatRow>(
        `INSERT INTO chat (
           kind, peer_id, peer_name, peer_emoji, text, destination_url,
           destination_revision, sent_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id, kind, peer_id AS peerId, peer_name AS peerName,
                   peer_emoji AS peerEmoji, text, destination_url AS destinationUrl,
                   destination_revision AS destinationRevision,
                   target_peer_id AS targetPeerId, target_peer_name AS targetPeerName,
                   target_peer_emoji AS targetPeerEmoji, sent_at AS sentAt`,
        action,
        peer.id,
        peer.name,
        peer.emoji,
        destination.title,
        destination.url,
        destination.revision,
        Date.now(),
      )
      .one();
    this.pruneHistory(entry.id);
    return {
      id: entry.id,
      kind: "system",
      action,
      peer,
      destination,
      sentAt: entry.sentAt,
    };
  }

  private saveLeaderEntry(peer: PeerIdentity, leader: PeerIdentity): SystemEntry {
    const entry = this.ctx.storage.sql
      .exec<ChatRow>(
        `INSERT INTO chat (
           kind, peer_id, peer_name, peer_emoji, text,
           target_peer_id, target_peer_name, target_peer_emoji, sent_at
         ) VALUES ('leader-changed', ?, ?, ?, '', ?, ?, ?, ?)
         RETURNING id, kind, peer_id AS peerId, peer_name AS peerName,
                   peer_emoji AS peerEmoji, text, destination_url AS destinationUrl,
                   destination_revision AS destinationRevision,
                   target_peer_id AS targetPeerId, target_peer_name AS targetPeerName,
                   target_peer_emoji AS targetPeerEmoji, sent_at AS sentAt`,
        peer.id,
        peer.name,
        peer.emoji,
        leader.id,
        leader.name,
        leader.emoji,
        Date.now(),
      )
      .one();
    this.pruneHistory(entry.id);
    return {
      id: entry.id,
      kind: "system",
      action: "leader-changed",
      peer,
      leader,
      sentAt: entry.sentAt,
    };
  }

  private pruneHistory(latestId: number): void {
    const pruneThroughId = latestId - MAX_CHAT_MESSAGES;
    if (pruneThroughId > 0)
      this.ctx.storage.sql.exec("DELETE FROM chat WHERE id <= ?", pruneThroughId);
  }

  private history(beforeId = Number.MAX_SAFE_INTEGER): ChatHistoryPage {
    const entries = this.ctx.storage.sql
      .exec<ChatRow>(
        `SELECT id, kind, peer_id AS peerId, peer_name AS peerName, peer_emoji AS peerEmoji,
                text, destination_url AS destinationUrl,
                destination_revision AS destinationRevision,
                target_peer_id AS targetPeerId, target_peer_name AS targetPeerName,
                target_peer_emoji AS targetPeerEmoji, sent_at AS sentAt
         FROM chat
         WHERE id < ?
         ORDER BY id DESC
         LIMIT ?`,
        beforeId,
        HISTORY_PAGE_SIZE + 1,
      )
      .toArray();
    return {
      entries: entries.slice(0, HISTORY_PAGE_SIZE).reverse().map(toPartyEntry),
      hasMore: entries.length > HISTORY_PAGE_SIZE,
    };
  }

  private migrate(): void {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY CHECK (version > 0)
      )
    `);
    const { version } = this.ctx.storage.sql
      .exec<{ version: number }>(
        "SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations",
      )
      .one();
    if (version > SCHEMA_VERSION) throw new Error("Party storage uses a newer schema version");
    if (version === 0) {
      this.ctx.storage.sql.exec(`
        CREATE TABLE chat (
          id INTEGER PRIMARY KEY,
          peer_id TEXT NOT NULL,
          peer_name TEXT NOT NULL,
          peer_emoji TEXT NOT NULL,
          text TEXT NOT NULL,
          sent_at INTEGER NOT NULL
        );
        INSERT INTO schema_migrations (version) VALUES (1);
      `);
    }
    if (version < 2) {
      this.ctx.storage.sql.exec(`
        CREATE TABLE party_state (
          singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
          destination_url TEXT NOT NULL,
          destination_title TEXT NOT NULL,
          destination_revision INTEGER NOT NULL CHECK (destination_revision > 0)
        );
        INSERT INTO schema_migrations (version) VALUES (2);
      `);
    }
    if (version < 3) {
      this.ctx.storage.sql.exec(`
        ALTER TABLE chat ADD COLUMN kind TEXT NOT NULL DEFAULT 'chat';
        ALTER TABLE chat ADD COLUMN destination_url TEXT;
        ALTER TABLE chat ADD COLUMN destination_revision INTEGER;
        INSERT INTO schema_migrations (version) VALUES (3);
      `);
    }
    if (version < 4) {
      this.ctx.storage.sql.exec(`
        ALTER TABLE chat ADD COLUMN target_peer_id TEXT;
        ALTER TABLE chat ADD COLUMN target_peer_name TEXT;
        ALTER TABLE chat ADD COLUMN target_peer_emoji TEXT;
        INSERT INTO schema_migrations (version) VALUES (4);
      `);
    }
  }

  private ensureSchema(): void {
    if (this.schemaReady) return;
    this.migrate();
    this.schemaReady = true;
  }

  private allowMessage(socket: WebSocket): boolean {
    const now = Date.now();
    const previous = this.messageWindows.get(socket);
    const window =
      !previous || now - previous.startedAt >= SOCKET_MESSAGE_WINDOW_MS
        ? {
            startedAt: now,
            messages: 0,
            chatTokens: previous?.chatTokens ?? CHAT_BURST_LIMIT,
            chatRefilledAt: previous?.chatRefilledAt ?? now,
          }
        : previous;
    window.messages += 1;
    this.messageWindows.set(socket, window);
    if (window.messages <= SOCKET_MESSAGE_LIMIT) return true;

    socket.close(1008, "Message rate limit exceeded");
    return false;
  }

  private allowChat(socket: WebSocket): boolean {
    const now = Date.now();
    const window = this.messageWindows.get(socket);
    if (!window) return false;

    const refill = Math.floor((now - window.chatRefilledAt) / CHAT_COOLDOWN_MS);
    if (refill > 0) {
      window.chatTokens = Math.min(CHAT_BURST_LIMIT, window.chatTokens + refill);
      window.chatRefilledAt += refill * CHAT_COOLDOWN_MS;
    }
    if (window.chatTokens >= 1) {
      window.chatTokens -= 1;
      return true;
    }
    this.send(socket, {
      type: "error",
      code: "rate-limited",
      message: "Messages can be sent once per second.",
    });
    return false;
  }

  private peers(): PeerIdentity[] {
    return this.ctx.getWebSockets().flatMap((socket) => {
      const peer = this.peer(socket);
      return peer && socket.readyState === WebSocket.OPEN ? [peer] : [];
    });
  }

  private peer(socket: WebSocket): PeerIdentity | null {
    return this.attachment(socket)?.peer ?? null;
  }

  private attachment(socket: WebSocket): ConnectionAttachment | null {
    const value = socket.deserializeAttachment();
    // Accept the previous attachment shape during a rolling deployment.
    if (isPeer(value)) return { peer: value, joinedAt: 0 };
    if (!isRecord(value) || !isPeer(value.peer)) return null;
    return {
      peer: value.peer,
      joinedAt:
        typeof value.joinedAt === "number" && Number.isFinite(value.joinedAt) ? value.joinedAt : 0,
      playback: isPlaybackSnapshot(value.playback) ? value.playback : undefined,
      leader: value.leader === true,
    };
  }

  private playback(destinationRevision: number): PlaybackSnapshot | undefined {
    let latest: PlaybackSnapshot | undefined;
    for (const socket of this.ctx.getWebSockets()) {
      const playback = this.attachment(socket)?.playback;
      if (
        playback?.destinationRevision === destinationRevision &&
        (!latest || playback.updatedAt > latest.updatedAt)
      ) {
        latest = playback;
      }
    }
    return latest;
  }

  private rememberPlayback(playback: PlaybackSnapshot): void {
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = this.attachment(socket);
      if (attachment) socket.serializeAttachment({ ...attachment, playback });
    }
  }

  private clearPlayback(): void {
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = this.attachment(socket);
      if (!attachment) continue;
      const { playback: _playback, ...rest } = attachment;
      socket.serializeAttachment(rest);
    }
  }

  private destination(): PartyDestination | undefined {
    const row = this.ctx.storage.sql
      .exec<DestinationRow>(
        `SELECT destination_url AS url, destination_title AS title,
                destination_revision AS revision
         FROM party_state WHERE singleton = 1`,
      )
      .toArray()[0];
    return row ? { url: row.url, title: row.title, revision: row.revision } : undefined;
  }

  private saveDestination(input: PartyDestinationInput): PartyDestination {
    const destination = {
      ...input,
      revision: (this.destination()?.revision ?? 0) + 1,
    };
    this.ctx.storage.sql.exec(
      `INSERT INTO party_state (
         singleton, destination_url, destination_title, destination_revision
       ) VALUES (1, ?, ?, ?)
       ON CONFLICT(singleton) DO UPDATE SET
         destination_url = excluded.destination_url,
         destination_title = excluded.destination_title,
         destination_revision = excluded.destination_revision`,
      destination.url,
      destination.title,
      destination.revision,
    );
    return destination;
  }

  private leader(): ConnectionAttachment | undefined {
    const connections = this.ctx
      .getWebSockets()
      .filter((socket) => socket.readyState === WebSocket.OPEN)
      .map((socket) => this.attachment(socket))
      .filter((attachment): attachment is ConnectionAttachment => Boolean(attachment))
      .sort((left, right) => left.joinedAt - right.joinedAt);
    return connections.find((connection) => connection.leader) ?? connections[0];
  }

  private connection(
    peerId: string,
  ): { socket: WebSocket; attachment: ConnectionAttachment } | undefined {
    for (const socket of this.ctx.getWebSockets()) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      const attachment = this.attachment(socket);
      if (attachment?.peer.id === peerId) return { socket, attachment };
    }
    return undefined;
  }

  private broadcastPresence(): void {
    const leaderId = this.leader()?.peer.id;
    if (leaderId) this.broadcast({ type: "presence", peers: this.peers(), leaderId });
  }

  private broadcast(message: ServerMessage, exclude?: WebSocket): void {
    for (const socket of this.ctx.getWebSockets())
      if (socket !== exclude) this.send(socket, message);
  }

  private send(socket: WebSocket, message: ServerMessage): void {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }
}

function toPartyEntry(row: ChatRow): PartyEntry {
  if (
    row.kind === "leader-changed" &&
    row.targetPeerId &&
    row.targetPeerName &&
    row.targetPeerEmoji
  ) {
    return {
      id: row.id,
      kind: "system",
      action: "leader-changed",
      peer: { id: row.peerId, name: row.peerName, emoji: row.peerEmoji },
      leader: {
        id: row.targetPeerId,
        name: row.targetPeerName,
        emoji: row.targetPeerEmoji,
      },
      sentAt: row.sentAt,
    };
  }
  if (
    (row.kind === "party-started" || row.kind === "video-changed") &&
    row.destinationUrl &&
    row.destinationRevision
  ) {
    return {
      id: row.id,
      kind: "system",
      action: row.kind,
      peer: { id: row.peerId, name: row.peerName, emoji: row.peerEmoji },
      destination: {
        url: row.destinationUrl,
        title: row.text,
        revision: row.destinationRevision,
      },
      sentAt: row.sentAt,
    };
  }
  return toChatEntry(row);
}

function toChatEntry(row: ChatRow): ChatEntry {
  return {
    id: row.id,
    kind: "chat",
    peer: { id: row.peerId, name: row.peerName, emoji: row.peerEmoji },
    text: row.text,
    sentAt: row.sentAt,
  };
}

function isPeer(value: unknown): value is PeerIdentity {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    "emoji" in value
  );
}

function isPlaybackSnapshot(value: unknown): value is PlaybackSnapshot {
  return (
    isRecord(value) &&
    typeof value.playing === "boolean" &&
    typeof value.timeFromEnd === "number" &&
    Number.isFinite(value.timeFromEnd) &&
    typeof value.updatedAt === "number" &&
    Number.isFinite(value.updatedAt) &&
    typeof value.destinationRevision === "number" &&
    Number.isSafeInteger(value.destinationRevision) &&
    value.destinationRevision > 0
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
