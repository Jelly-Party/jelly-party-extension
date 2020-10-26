import {
  JellyPartyDescriptor,
  JellyPartyProtocol,
} from "@/apps/messaging/Protocol";
import { ProtoframePubsub } from "@/helpers/protoframe-webext";
import { browser, Runtime } from "webextension-polyfill-ts";

type awaitablePubsubConnection = Promise<ProtoframePubsub<JellyPartyProtocol>>;
type awaitableWebsocket = Promise<WebSocket>;
let ws: awaitableWebsocket;
let iframePubsub: awaitablePubsubConnection;
let hostFramePubsub: awaitablePubsubConnection;
let videoControllerPubsub: awaitablePubsubConnection;
let partyActive = false;

browser.runtime.onConnect.addListener((port: Runtime.Port) => {
  switch (port.name) {
    case "iframe": {
      const a = ProtoframePubsub.build(JellyPartyDescriptor, port);
      break;
    }
    case "videoController": {
      break;
    }
    case "styleController": {
      break;
    }
    default: {
      console.error("Received unknown connection");
      console.log(port);
    }
  }
});
