export interface RootState {
  sideBarMinimized: boolean;
  connectedToServer: boolean;
  connectingToServer: boolean;
  appTitle: string;
  appMode: string;
}

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

export interface AvatarState {
  accessoriesType: string;
  clotheType: string;
  clotheColor: string;
  eyebrowType: string;
  eyeType: string;
  facialHairColor: string;
  facialHairType: string;
  graphicType: string;
  hairColor: string;
  mouthType: string;
  skinColor: string;
  topType: string;
}

export interface PreviousParty {
  partyId: string;
  members: Array<string>;
  dateInfo: object;
}

export interface OptionsState {
  clientName: string;
  darkMode: boolean;
  onlyIHaveControls: boolean;
  statusNotificationsInChat: boolean;
  statusNotificationsNotyf: boolean;
  guid: string;
  avatarState: AvatarState;
  previousParties: Array<PreviousParty>;
  lastPartyId: string;
  showNotificationsForSelf: boolean;
}

export interface VideoState {
  paused: boolean;
  tick: number;
}
