import { ChatMessage } from "../iframe/store/types";
import * as Types from "./Protocol";

export const RequestAutoJoin: Types.RequestAutoJoin = {
  type: "RequestAutoJoin",
  payload: {},
};

export const RequestPartyStateReset: Types.RequestPartyStateReset = {
  type: "RequestPartyStateReset",
  payload: {},
};

export const RequestPartyConnect: Types.RequestPartyConnect = {
  type: "RequestPartyConnect",
  payload: {
    /* Set a partyId here, if applicable */
    partyId: "",
  },
};

export const RequestSendChatMessage = (text: string) => {
  const req: Types.RequestSendChatMessage = {
    type: "RequestSendChatMessage",
    payload: {
      type: "chatMessage",
      data: {
        text: text,
        timestamp: Date.now(),
      },
    },
  };
  return req;
};

export const RequestUpdateMagicLink: Types.RequestUpdateMagicLink = {
  type: "RequestUpdateMagicLink",
  payload: {},
};

export const RequestUploadPartyState: Types.RequestUploadPartyState = {
  type: "RequestUploadPartyState",
  payload: {},
};

export const RequestDisplayNotification: Types.RequestDisplayNotification = {
  type: "RequestDisplayNotification",
  payload: {},
};

export const RequestPeersToPlay: Types.RequestPeersToPlay = {
  type: "RequestPeersToPlay",
  payload: {},
};

export const RequestPeersToPause: Types.RequestPeersToPause = {
  type: "RequestPeersToPause",
  payload: {},
};

export const RequestPeersToSeek: Types.RequestPeersToSeek = {
  type: "RequestPeersToSeek",
  payload: {},
};

export const RequestPlay = (tick: number): Types.RequestPlay => {
  return { type: "RequestPlay", payload: { tick: tick } };
};

export const RequestPause = (tick: number): Types.RequestPause => {
  return { type: "RequestPause", payload: { tick: tick } };
};

export const RequestSeek = (tick: number): Types.RequestSeek => {
  return { type: "RequestSeek", payload: { tick: tick } };
};

export const RequestTogglePlayPause: Types.RequestTogglePlayPause = {
  type: "RequestTogglePlayPause",
  payload: {},
};

export const RequestToggleFullscreen: Types.RequestToggleFullscreen = {
  type: "RequestToggleFullscreen",
  payload: {},
};

export const RequestVideoState: Types.RequestVideoState = {
  type: "RequestVideoState",
  payload: {},
};
