export const BROWSERS = ["chrome", "edge", "firefox", "unknown"] as const;
export type ClientInfo = {
  browser: (typeof BROWSERS)[number];
  version: string;
  source: "production" | "test";
};
export const UNKNOWN_CLIENT: ClientInfo = {
  browser: "unknown",
  version: "unknown",
  source: "production",
};
export const CLIENT_OUTCOMES = [
  "invite_opened",
  "permission_granted",
  "permission_denied",
  "permission_required",
  "join_attempt",
  "video_ready",
  "video_missing",
  "connection_recovered",
] as const;
export type ClientOutcome = (typeof CLIENT_OUTCOMES)[number];
export const SYNC_OUTCOMES = [
  "applied",
  "autoplay-blocked",
  "video-missing",
  "permission-required",
  "failed",
  "timeout",
  "superseded",
] as const;
export type SyncOutcome = (typeof SYNC_OUTCOMES)[number];
export type UsageEvent =
  | "party_created"
  | "participant_joined"
  | "party_size"
  | "chat_sent"
  | "play"
  | "pause"
  | "seek"
  | "video_changed"
  | ClientOutcome
  | "sync_attempt"
  | "sync_result";
export const MEMBERSHIP_CHECK_MS = 60_000;
export const MEMBERSHIP_FRESH_MS = 150_000;
export interface PartySnapshot {
  key: string;
  revision: number;
  peers: number;
  site: string;
  updatedAt: number;
  source?: ClientInfo["source"];
}
export interface LiveSnapshot {
  parties: number;
  peers: number;
  together: number;
  uncertainParties: number;
  uncertainPeers: number;
  sites: Array<{ site: string; peers: number; parties: number }>;
  updatedAt: number;
  observedAt: number | null;
}
export interface ReportFilters {
  site?: string;
  browser?: ClientInfo["browser"];
  version?: string;
  source?: "production" | "test" | "all";
  page?: number;
}
export interface Funnel {
  started: number;
  together: number;
  fiveMinutes: number;
  synced: number;
  uncertain: number;
  medianTimeToJoinMs: number | null;
}
export interface UsageParty {
  key: string;
  startedAt: number;
  durationMs: number;
  togetherMs: number;
  participants: number;
  peak: number;
  connected: number;
  status: "active" | "ended" | "uncertain";
  observedAt: number;
  messages: number;
  sites: string[];
}
export interface UsageReport {
  from: string;
  to: string;
  generatedAt: number;
  lastEventAt: number | null;
  totals: Array<{ kind: UsageEvent; count: number }>;
  previousTotals: Array<{ kind: UsageEvent; count: number }>;
  funnel: Funnel;
  previousFunnel: Funnel;
  daily: Array<{ day: string; parties: number; participants: number; messages: number }>;
  sites: Array<{ site: string; parties: number; participants: number }>;
  sizes: Array<{ peak: number; parties: number }>;
  playbackResults: Array<{
    site: string;
    browser: string;
    version: string;
    attempts: number;
    applied: number;
    blocked: number;
    failed: number;
  }>;
  outcomes: Array<{
    site: string;
    browser: string;
    version: string;
    kind: UsageEvent;
    outcome: string;
    count: number;
  }>;
  filters: { sites: string[]; browsers: string[]; versions: string[] };
  parties: UsageParty[];
  hasMoreParties: boolean;
  page: number;
  totalParties: number;
}
export function isClientInfo(value: unknown): value is ClientInfo {
  if (!value || typeof value !== "object") return false;
  const info = value as Record<string, unknown>;
  return (
    BROWSERS.includes(info.browser as ClientInfo["browser"]) &&
    typeof info.version === "string" &&
    /^(?:unknown|\d{1,4}\.\d{1,4}\.\d{1,4}(?:\.\d{1,4})?)$/.test(info.version) &&
    (info.source === "production" || info.source === "test")
  );
}
