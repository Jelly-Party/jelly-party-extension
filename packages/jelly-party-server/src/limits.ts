export const DEFAULT_MAX_PARTIES_PER_MONTH = 1_000_000;
export const MAX_PARTY_CONNECTIONS = 20;
export const MAX_PENDING_CONNECTIONS = 4;
export const PARTY_JOIN_TIMEOUT_MS = 10_000;
export const PARTY_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;
export const SOCKET_MESSAGE_LIMIT = 60;
export const SOCKET_MESSAGE_WINDOW_MS = 60_000;
export const CHAT_COOLDOWN_MS = 1_000;
export const CHAT_BURST_LIMIT = 20;

export function monthKey(timestamp = Date.now()): string {
  return new Date(timestamp).toISOString().slice(0, 7);
}

export function maxPartiesPerMonth(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_PARTIES_PER_MONTH;
}
