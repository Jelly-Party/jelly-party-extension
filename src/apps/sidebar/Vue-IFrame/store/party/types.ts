import { AvatarState } from "../options/types";
import { VideoState } from "@/services/messaging/protocols/Protocol";

export interface ChatMessage {
  type: "chatMessage";
  peer?: { uuid: string };
  data: {
    text: string;
    timestamp: number;
  };
}

export interface Peer {
  uuid: string;
  clientName: string;
  currentlyWatching: string;
  avatarState: AvatarState;
  videoState: VideoState;
}

export interface PartyState {
  isActive: boolean;
  partyId: string;
  peers: Array<Peer>;
  cachedPeers: Array<Peer>;
  websiteIsTested: boolean;
  magicLink: string;
  selfUUID: string;
  showChat: boolean;
  chatMessages: Array<ChatMessage>;
  maxChatMessagesDisplay: number;
  videoState: { paused: boolean; tick: number };
}

// The video state is not stored in the PartyState, since it updates all the time,
// but we don't need to react to its updates. Instead, we query it upon certain events.
