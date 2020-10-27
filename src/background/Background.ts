import {
  JellyPartyDescriptor,
  JellyPartyProtocol,
  VideoControllerProtocol,
  VideoDescriptor,
} from "@/apps/messaging/Protocol";
import { ProtoframePubsub } from "@/helpers/protoframe-webext";
import { browser, Runtime } from "webextension-polyfill-ts";
import { DeferredPromise } from "@/helpers/deferredPromise";

type awaitablePubsubConnection = DeferredPromise<
  ProtoframePubsub<JellyPartyProtocol>
>;
let ws: WebSocket;
let iframePubsub: awaitablePubsubConnection = new DeferredPromise();
let hostFramePubsub: awaitablePubsubConnection = new DeferredPromise();
let videoControllerPubsub: awaitablePubsubConnection = new DeferredPromise();
let allPorts: Runtime.Port[] = [];
let currentVideoSize = 0;
let connectedToTab = false;

async function wait(ms: number) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(true);
    }, ms);
  });
}

async function resetConnections() {
  await Promise.race([
    // eslint-disable-next-line no-async-promise-executor
    new Promise(async resolve => {
      (await iframePubsub).destroy();
      (await hostFramePubsub).destroy();
      (await videoControllerPubsub).destroy();
      resolve();
    }),
    wait(500),
  ]);
  allPorts.forEach(port => {
    port.disconnect();
  });
  allPorts = [];
  iframePubsub = new DeferredPromise();
  hostFramePubsub = new DeferredPromise();
  videoControllerPubsub = new DeferredPromise();
  connectedToTab = false;
  currentVideoSize = 0;
}

function setupIframeHandlers(pubsub: ProtoframePubsub<JellyPartyProtocol>) {
  //
  pubsub.handleTell("joinParty", async ({ partyId }) => {
    if (ws) {
      console.error(
        "Jelly-Party: Already connected to a party.. Cannot connect twice!",
      );
    } else {
      ws = new WebSocket("");
    }
  });
}

function setupVideoControllerHandlers(
  pubsub: ProtoframePubsub<VideoControllerProtocol>,
) {
  //
}

function setupHostControllerHandlers(
  pubsub: ProtoframePubsub<JellyPartyProtocol>,
) {
  //
}

browser.runtime.onConnect.addListener(async (port: Runtime.Port) => {
  allPorts.push(port);
  switch (port.name) {
    case "iframe": {
      if (connectedToTab) {
        // We must connect to a new tab, therefore let's kill all previous connections
        await resetConnections();
      }
      iframePubsub.resolve(ProtoframePubsub.build(JellyPartyDescriptor, port));
      setupIframeHandlers(await iframePubsub);
      // (await iframePubsub).handleAsk()
      connectedToTab = true;
      break;
    }
    case "videoController": {
      const pubsub = ProtoframePubsub.build(VideoDescriptor, port);
      pubsub.handleTell("tellVideo", async ({ videoSize }) => {
        if (videoSize > currentVideoSize) {
          // This port has a larger video source that we must connect to
          // Close the previous pubsub
          videoControllerPubsub.then(previousPubsub => {
            console.log("Jelly-Party: Closing previous pubsub");
            previousPubsub.destroy();
          });
          // Create a new pubsub
          videoControllerPubsub = new DeferredPromise();
          videoControllerPubsub.resolve(
            ProtoframePubsub.build(JellyPartyDescriptor, port),
          );
          // Set up handlers
          setupVideoControllerHandlers(pubsub);
        } else {
          // Abandon this port. We have a larger video already.
          pubsub.destroy();
          port.disconnect();
        }
      });
      break;
    }
    case "hostController": {
      hostFramePubsub.resolve(
        ProtoframePubsub.build(JellyPartyDescriptor, port),
      );
      setupHostControllerHandlers(await hostFramePubsub);
      break;
    }
    default: {
      console.error("Received unknown connection");
      console.log(port);
    }
  }
});
