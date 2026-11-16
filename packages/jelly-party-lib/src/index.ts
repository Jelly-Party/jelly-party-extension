export * from "./analytics.js";
export { buildMagicLink, parseMagicLink, type MagicLink } from "./magic-link.js";
export {
  liveTimeFromEnd,
  reachedTarget,
  RemoteEchoGuard,
  RemoteSeekGuard,
  targetTime,
  timeFromEnd,
} from "./playback.js";
export {
  type ChatEntry,
  type ChatHistoryPage,
  type ClientMessage,
  HISTORY_PAGE_SIZE,
  isPlaybackAction,
  MAX_CHAT_LENGTH,
  MAX_CHAT_MESSAGES,
  MAX_EMOJI_LENGTH,
  MAX_NAME_LENGTH,
  parseClientMessage,
  parsePartyId,
  type PartyEntry,
  type PeerIdentity,
  type PartyDestination,
  type PartyDestinationInput,
  type PlaybackAction,
  type PlaybackSnapshot,
  type ServerMessage,
  type SystemEntry,
  type SystemEntryAction,
} from "./protocol.js";

const partyEmojis = ["🎉", "🥳", "🍿", "🎬", "✨", "🪼", "🦄", "🐳", "🦊", "🐼"];

export function getRandomEmoji(): string {
  return partyEmojis[Math.floor(Math.random() * partyEmojis.length)] as string;
}
