import { ProtoframeDescriptor } from "protoframe";
import { MediaEvent } from "./MediaEvent";
import { Protoframe } from "protoframe/dist/types";

export interface VideoState {
  paused: boolean;
  tick: number;
  duration: number;
}

export interface MediaMessage {
  type: "media";
  event: MediaEvent;
  tick: number;
}

export interface ProtocolInterface extends Protoframe {
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
}

export const Protocol: ProtoframeDescriptor<ProtocolInterface> = {
  type: "Jelly-Party",
};
