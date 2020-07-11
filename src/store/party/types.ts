import { AvatarState } from "@/store/options/types";

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
  videoState: {
    paused: boolean;
    currentTime: number;
  };
}

export interface PartyState {
  isActive: boolean;
  partyId: string;
  peers: Array<Peer>;
  cachedPeers: Array<Peer>;
  wsIsConnected: boolean;
  websiteIsTested: boolean;
  magicLink: string;
  selfUUID: string;
  chatMessages: Array<ChatMessage>;
  maxChatMessagesDisplay: number;
  paused: boolean;
}

// The video state is not stored in the PartyState, since it updates all the time,
// but we don't need to react to its updates. Instead, we query it upon certain events.
