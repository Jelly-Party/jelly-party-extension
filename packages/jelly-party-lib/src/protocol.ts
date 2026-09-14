export const MAX_CHAT_LENGTH = 2_000;
export const MAX_CHAT_MESSAGES = 1_000;
export const MAX_NAME_LENGTH = 40;
export const MAX_EMOJI_LENGTH = 16;
export const PARTY_ID_LENGTH = 64;
export const HISTORY_PAGE_SIZE = 100;
export const MAX_DESTINATION_URL_LENGTH = 2048;
export const MAX_DESTINATION_TITLE_LENGTH = 200;

export type PlaybackAction = "play" | "pause" | "seek";

export interface PlaybackSnapshot {
  playing: boolean;
  timeFromEnd: number;
  updatedAt: number;
  destinationRevision: number;
}

export interface PartyDestinationInput {
  url: string;
  title: string;
}

export interface PartyDestination extends PartyDestinationInput {
  revision: number;
}

export interface PeerIdentity {
  id: string;
  name: string;
  emoji: string;
}

export interface ChatEntry {
  id: number;
  kind?: "chat";
  peer: PeerIdentity;
  text: string;
  sentAt: number;
}

export type SystemEntryAction = "party-started" | "video-changed" | "leader-changed";

interface SystemEntryBase {
  id: number;
  kind: "system";
  peer: PeerIdentity;
  sentAt: number;
}

export type SystemEntry =
  | (SystemEntryBase & {
      action: "party-started" | "video-changed";
      destination: PartyDestination;
    })
  | (SystemEntryBase & {
      action: "leader-changed";
      leader: PeerIdentity;
    });

export type PartyEntry = ChatEntry | SystemEntry;

export interface ChatHistoryPage {
  entries: PartyEntry[];
  hasMore: boolean;
}

export type ClientMessage =
  | { type: "join"; peer: PeerIdentity; destination: PartyDestinationInput }
  | { type: "heartbeat" }
  | { type: "chat"; text: string }
  | {
      type: "playback";
      action: PlaybackAction;
      timeFromEnd: number;
      destinationRevision: number;
    }
  | { type: "destination"; destination: PartyDestinationInput }
  | { type: "leader"; peerId: string }
  | { type: "history"; beforeId: number };

export type ServerMessage =
  | { type: "heartbeat-ack" }
  | {
      type: "welcome";
      peerId: string;
      history: ChatHistoryPage;
      destination: PartyDestination;
      leaderId: string;
      playback?: PlaybackSnapshot;
      initializePlayback?: boolean;
    }
  | { type: "presence"; peers: PeerIdentity[]; leaderId: string }
  | { type: "chat"; entry: PartyEntry }
  | { type: "history"; history: ChatHistoryPage }
  | {
      type: "destination";
      peerId: string;
      destination: PartyDestination;
    }
  | {
      type: "playback";
      peerId: string;
      action: PlaybackAction;
      timeFromEnd: number;
      destinationRevision: number;
    }
  | {
      type: "error";
      code: "invalid-message" | "join-required" | "leader-required" | "rate-limited";
      message: string;
    };

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const partyIdPattern = /^[0-9a-f]{64}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parsePartyId(value: unknown): string | null {
  return typeof value === "string" && partyIdPattern.test(value) ? value : null;
}

export function isPeerIdentity(value: unknown): value is PeerIdentity {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    uuidPattern.test(value.id) &&
    isBoundedText(value.name, MAX_NAME_LENGTH) &&
    isBoundedText(value.emoji, MAX_EMOJI_LENGTH)
  );
}

export function parseClientMessage(raw: unknown): ParseResult<ClientMessage> {
  if (typeof raw !== "string" || raw.length > 8192) return invalid("Message must be bounded text");

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return invalid("Message is not valid JSON");
  }
  if (!isRecord(value) || typeof value.type !== "string") return invalid("Missing message type");

  if (value.type === "join") {
    if (!isPeerIdentity(value.peer) || !isPartyDestinationInput(value.destination)) {
      return invalid("Invalid join message");
    }
    return {
      ok: true,
      value: { type: "join", peer: value.peer, destination: value.destination },
    };
  }

  if (value.type === "chat") {
    if (!isBoundedText(value.text, MAX_CHAT_LENGTH)) return invalid("Invalid chat message");
    return { ok: true, value: { type: "chat", text: value.text } };
  }

  if (value.type === "heartbeat") return { ok: true, value: { type: "heartbeat" } };

  if (value.type === "playback") {
    if (
      !isPlaybackAction(value.action) ||
      typeof value.timeFromEnd !== "number" ||
      !Number.isFinite(value.timeFromEnd) ||
      value.timeFromEnd < 0 ||
      value.timeFromEnd > 7 * 24 * 60 * 60 ||
      !isRevision(value.destinationRevision)
    ) {
      return invalid("Invalid playback message");
    }
    return {
      ok: true,
      value: {
        type: "playback",
        action: value.action,
        timeFromEnd: value.timeFromEnd,
        destinationRevision: value.destinationRevision,
      },
    };
  }

  if (value.type === "destination") {
    if (!isPartyDestinationInput(value.destination)) return invalid("Invalid destination");
    return { ok: true, value: { type: "destination", destination: value.destination } };
  }

  if (value.type === "leader") {
    if (typeof value.peerId !== "string" || !uuidPattern.test(value.peerId)) {
      return invalid("Invalid leader");
    }
    return { ok: true, value: { type: "leader", peerId: value.peerId } };
  }

  if (value.type === "history") {
    if (
      typeof value.beforeId !== "number" ||
      !Number.isSafeInteger(value.beforeId) ||
      value.beforeId < 1
    ) {
      return invalid("Invalid history cursor");
    }
    return { ok: true, value: { type: "history", beforeId: value.beforeId } };
  }

  return invalid("Unknown message type");
}

export function isPlaybackAction(value: unknown): value is PlaybackAction {
  return value === "play" || value === "pause" || value === "seek";
}

export function isPartyDestinationInput(value: unknown): value is PartyDestinationInput {
  if (!isRecord(value) || !isBoundedText(value.url, MAX_DESTINATION_URL_LENGTH)) return false;
  if (!isBoundedText(value.title, MAX_DESTINATION_TITLE_LENGTH)) return false;
  try {
    const url = new URL(value.url);
    return (
      (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password
    );
  } catch {
    return false;
  }
}

function isRevision(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isBoundedText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(error: string): ParseResult<never> {
  return { ok: false, error };
}
