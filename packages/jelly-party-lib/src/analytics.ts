export type UsageEvent =
  | "party_created"
  | "participant_joined"
  | "party_size"
  | "chat_sent"
  | "play"
  | "pause"
  | "seek"
  | "video_changed";
export interface PartySnapshot {
  key: string;
  revision: number;
  peers: number;
  site: string;
  updatedAt: number;
}
export interface LiveSnapshot {
  parties: number;
  peers: number;
  together: number;
  sites: Array<{ site: string; peers: number; parties: number }>;
  updatedAt: number;
}
export interface UsageReport {
  totals: Array<{ kind: UsageEvent; count: number }>;
  daily: Array<{ day: string; parties: number; participants: number; messages: number }>;
  sites: Array<{ site: string; parties: number; participants: number }>;
  sizes: Array<{ peak: number; parties: number }>;
}
