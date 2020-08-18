import { ProtoframeDescriptor } from "protoframe";
import { MediaEvent } from "./MediaEvent";

export interface VideoState {
  paused: boolean;
  tick: number;
}

export interface MediaMessage {
  type: "media";
  event: MediaEvent;
  tick: number;
}

export const Protocol: ProtoframeDescriptor<{
  joinParty: {
    body: { partyId: string };
  };
  requestAutoJoin: {
    body: {};
    response: { partyId: string };
  };
  replayMediaEvent: {
    body: MediaMessage;
    response: { success: boolean };
  };
  forwardMediaEvent: {
    body: MediaMessage;
  };
  showNotyf: {
    body: { message: string };
  };
  getVideoState: {
    body: {};
    response: VideoState;
  };
  getBaseLink: {
    body: {};
    response: { baseLink: string };
  };
  showUnreadNotification: {
    body: {};
  };
  toggleFullscreen: {
    body: {};
  };
  sendChatMessage: {
    body: { message: string };
  };
}> = { type: "Jelly-Party" };
