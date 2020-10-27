import { ProtoframeDescriptor } from "@/helpers/protoframe-webext";
import { AppState } from "../iframe/store/store";
import { VideoState } from "../iframe/store/types";

export type JellyPartyProtocol = {
  getVideoState: {
    body: {};
    response: { videoState: VideoState };
  };
  getURL: {
    body: {};
    response: { url: URL };
  };
  setAppState: {
    body: { appState: AppState };
  };
  setVideoState: {
    body: { videoState: VideoState };
  };
  resetPartyState: {
    body: {};
  };
  seek: {
    body: { tick: number };
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
  connectToParty: {
    body: { partyId: string };
  };
  sendChatMessage: {
    body: { text: string };
  };
  getBaseLink: {
    body: {};
    response: { baseLink: string };
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
};

export const VideoDescriptor: ProtoframeDescriptor<VideoControllerProtocol> = {
  type: "videoControllerProtocol",
};

export type HostControllerProtocol = {
  getURL: {
    body: {};
    response: { url: string };
  };
};

export const HostDescriptor: ProtoframeDescriptor<HostControllerProtocol> = {
  type: "videoControllerProtocol",
};
