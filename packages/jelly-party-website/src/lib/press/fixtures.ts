import type { ChatEntry, PeerIdentity } from "jelly-party-lib";
import type { ActiveParty } from "../../../../jelly-party-extension/src/background/party-state.ts";

/**
 * Sample content for the store assets. Timestamps are fixed instants rather than "now", so the
 * captured screenshots only change when we change them; `vp run assets:store` renders them in UTC.
 */
const evening = Date.UTC(2026, 0, 16, 20, 0);

function at(minute: number): number {
  return evening + minute * 60_000;
}

export const mira: PeerIdentity = { id: "mira", name: "Mira", emoji: "🍿" };
export const cal: PeerIdentity = { id: "cal", name: "Cal", emoji: "🎬" };
export const ada: PeerIdentity = { id: "ada", name: "Ada", emoji: "🪼" };

export const partyVideo = {
  src: "/sync-demo.webm",
  /** The frame every window is parked on, so both windows in the sync shot really do match. */
  posterTime: 4.05,
  title: "Sundays in the Garden · Episode 4",
  url: "https://example.com/watch/sundays-in-the-garden",
  elapsed: "28:14",
  duration: "52:03",
  progress: 0.54,
};

const conversation: ChatEntry[] = [
  { id: 1, peer: cal, text: "Made it! Start from the beginning?", sentAt: at(11) },
  { id: 2, peer: mira, text: "Pressing play in 3… 2…", sentAt: at(12) },
  { id: 3, peer: cal, text: "Paused, kettle is on ☕", sentAt: at(14) },
  { id: 4, peer: ada, text: "Back! What did I miss? 🌸", sentAt: at(16) },
];

function partyWith(peers: PeerIdentity[], messages: ChatEntry[]): ActiveParty {
  return {
    partyId: "sundays-in-the-garden",
    tabId: 1,
    tabUrl: partyVideo.url,
    tabTitle: partyVideo.title,
    selfId: peers[0]?.id ?? "",
    leaderId: peers[0]?.id ?? "",
    destinationRevision: 1,
    status: "connected",
    peers,
    messages,
    hasMoreHistory: false,
    atDestination: true,
    hasVideo: true,
    accessRequired: false,
    playbackBlocked: false,
    notice: "",
    activity: null,
  };
}

// Each frame picks the party whose peers and message count fill its window without the chat
// scrolling out of view, so nothing is cut off mid-message in a listing image.

/** Two friends watching, the everyday case the listing leads with. */
export const duoParty = partyWith([mira, cal], conversation.slice(0, 3));

/** Two friends in a shorter window. */
export const duoPartyShort = partyWith([mira, cal], conversation.slice(0, 2));

/** A busier party for the chat shot. */
export const groupParty = partyWith([mira, cal, ada], conversation);

/** Three peers in a shorter window. */
export const groupPartyShort = partyWith([mira, cal, ada], conversation.slice(0, 2));

export const inviteLink = "https://join.jelly-party.com/join#5tQ2c9…";
