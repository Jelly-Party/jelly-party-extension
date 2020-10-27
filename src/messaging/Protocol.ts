import { ProtoframeDescriptor } from "@/helpers/protoframe-webext";
import { AppState } from "../apps/iframe/store/store";
import { VideoState } from "../apps/iframe/store/types";

export type JellyPartyProtocol = {
  setAppState: {
    body: { appState: AppState };
  };
  setVideoState: {
    body: { videoState: VideoState };
  };
  joinParty: {
    body: { partyId: string };
  };
  leaveParty: {
    body: {};
  };
  toggleFullscreen: {
    body: {};
  };
  togglePlayPause: {
    body: {};
  };
  displayNotification: {
    body: { text: string };
  };
  sendChatMessage: {
    body: { text: string };
  };
};

export const JellyPartyDescriptor: ProtoframeDescriptor<JellyPartyProtocol> = {
  type: "jellyPartyProtocol",
};

export type VideoControllerProtocol = {
  tellVideo: {
    body: { videoSize: number };
  };
  getVideoState: {
    body: {};
    response: { videoState: VideoState };
  };
  togglePlayPause: {
    body: {};
  };
  enqueuePlay: {
    body: { tick: number };
  };
  enqueuePause: {
    body: { tick: number };
  };
  enqueueSeek: {
    body: { tick: number };
  };
  requestPeersToPlay: {
    body: { tick: number };
  };
  requestPeersToPause: {
    body: { tick: number };
  };
  requestPeersToSeek: {
    body: { tick: number };
  };
};

export const VideoDescriptor: ProtoframeDescriptor<VideoControllerProtocol> = {
  type: "videoControllerProtocol",
};

export type HostControllerProtocol = {
  getURL: {
    body: {};
    response: { url: string };
  };
  toggleFullscreen: {
    body: {};
  };
  displayNotification: {
    body: { text: string };
  };
};

export const HostDescriptor: ProtoframeDescriptor<HostControllerProtocol> = {
  type: "videoControllerProtocol",
};

// SERVER PROTOCOL

// Helpers

export interface ClientState {
  uuid?: string;
  clientName: string;
  currentlyWatching: string;
  videoState: VideoState;
}

export interface PartyState {
  isActive: true;
  partyId: string;
  peers: ClientState[];
}

export interface ChatMessage {
  type: "chatMessage";
  data: {
    text: string;
    timestamp: number;
  };
}

type mediaCommands = "play" | "pause" | "seek";

// Received by server

export interface SendJoin {
  type: "join";
  data: {
    guid: string;
    partyId: string;
    clientState: ClientState;
  };
}

export interface SendForward<T extends forwardInstruction> {
  type: "forward";
  data: {
    commandToForward: T;
  };
}
type forwardInstruction = SendVideoUpdate | SendChatMessage;

export interface SendVideoUpdate {
  type: "videoUpdate";
  data: {
    variant: mediaCommands;
    tick: number;
  };
}

export interface SendChatMessage {
  type: "forward";
  data: {
    commandToForward: ChatMessage;
  };
}

export interface SendUpdateClientState {
  type: "clientUpdate";
  data: {
    newClientState: {
      currentlyWatching: string;
      videoState: VideoState;
    };
  };
}

// Received by client

export interface ReceiveSetUUID {
  type: "setUUID";
  data: {
    uuid: string;
  };
}

export interface ReceivePartyState {
  type: "partyStateUpdate";
  data: {
    partyState: PartyState;
  };
}

export interface ReceiveVideoUpdate {
  type: "videoUpdate";
  data: {
    variant: mediaCommands;
    tick: number;
    peer: {
      uuid: string;
    };
  };
}

export type ClientInstructions =
  | ReceiveSetUUID
  | ReceivePartyState
  | ReceiveVideoUpdate;
