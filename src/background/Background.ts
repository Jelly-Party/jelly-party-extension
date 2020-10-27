import {
  ClientInstructions,
  HostControllerProtocol,
  HostDescriptor,
  JellyPartyDescriptor,
  JellyPartyProtocol,
  SendChatMessage,
  SendForward,
  SendJoin,
  SendVideoUpdate,
  VideoControllerProtocol,
  VideoDescriptor,
} from "@/messaging/Protocol";
import { ProtoframePubsub } from "@/helpers/protoframe-webext";
import { browser, Runtime } from "webextension-polyfill-ts";
import { DeferredPromise } from "@/helpers/deferredPromise";

let ws: WebSocket;
let iframePubsub: ProtoframePubsub<JellyPartyProtocol>;
let hostFramePubsub: ProtoframePubsub<HostControllerProtocol>;
let videoControllerPubsub: ProtoframePubsub<VideoControllerProtocol>;
let allPorts: Runtime.Port[] = [];
let currentVideoSize = 0;
let connectedToTab = false;

let IFrameConnected = new DeferredPromise();
let HostFrameConnected = new DeferredPromise();
let VideoFrameConnected = new DeferredPromise();

async function connectionsEstablished() {
  return Promise.all([
    IFrameConnected,
    HostFrameConnected,
    VideoFrameConnected,
  ]);
}

async function resetConnections() {
  // Let's destroy pubsubs and remove listeners
  iframePubsub.destroy();
  hostFramePubsub.destroy();
  videoControllerPubsub.destroy();
  // Let's destroy ports
  allPorts.forEach(port => {
    port.disconnect();
  });
  // Reset some variables
  allPorts = [];
  connectedToTab = false;
  currentVideoSize = 0;
  // Initiate new deferred promises to enable awaiting connections
  IFrameConnected = new DeferredPromise();
  HostFrameConnected = new DeferredPromise();
  VideoFrameConnected = new DeferredPromise();
}

async function setupWebsocketListeners(ws: WebSocket) {
  ws.onmessage = (ev: MessageEvent<ClientInstructions>) => {
    switch (ev.data.type) {
      case "partyStateUpdate": {
        break;
      }
      case "setUUID": {
        break;
      }
      case "videoUpdate": {
        break;
      }
    }
  };
}

async function setupIframeHandlers(
  pubsub: ProtoframePubsub<JellyPartyProtocol>,
) {
  await connectionsEstablished();
  pubsub.handleTell("joinParty", async ({ partyId }) => {
    if (ws.readyState !== 3) {
      console.error("Jelly-Party: Socket not closed! Cannot reconnect!");
    } else {
      ws = new WebSocket(process.env.VUE_APP_WS_ADDRESS);
      const joinMsg: SendJoin = {
        type: "join",
        data: {
          partyId: partyId,
          guid: "123",
          clientState: {
            clientName: "",
            currentlyWatching: "",
            uuid: "",
            videoState: (await videoControllerPubsub.ask("getVideoState", {}))
              .videoState,
          },
        },
      };
      ws.send(JSON.stringify(joinMsg));
    }
    setupWebsocketListeners(ws);
  });
  pubsub.handleTell("leaveParty", async () => {
    ws.close();
  });
  pubsub.handleTell("toggleFullscreen", async () => {
    // Forward message to host frame
    hostFramePubsub.tell("toggleFullscreen", {});
  });
  pubsub.handleTell("togglePlayPause", async () => {
    // Forward message to video controller
    videoControllerPubsub.tell("togglePlayPause", {});
  });
  pubsub.handleTell("displayNotification", async ({ text }) => {
    // Forward message to host controller, where notyf resides
    hostFramePubsub.tell("displayNotification", { text: text });
  });
  pubsub.handleTell("sendChatMessage", async ({ text }) => {
    // Forward message to WebSocket
    const msg: SendChatMessage = {
      type: "forward",
      data: {
        commandToForward: {
          type: "chatMessage",
          data: {
            text: text,
            timestamp: Date.now(),
          },
        },
      },
    };
    ws.send(JSON.stringify(msg));
  });
}

async function setupVideoControllerHandlers(
  pubsub: ProtoframePubsub<VideoControllerProtocol>,
) {
  await connectionsEstablished();
  pubsub.handleTell("requestPeersToPlay", async ({ tick }) => {
    const msg: SendForward<SendVideoUpdate> = {
      type: "forward",
      data: {
        commandToForward: {
          type: "videoUpdate",
          data: {
            variant: "play",
            tick: tick,
          },
        },
      },
    };
    ws.send(JSON.stringify(msg));
  });
  pubsub.handleTell("requestPeersToPause", async ({ tick }) => {
    const msg: SendForward<SendVideoUpdate> = {
      type: "forward",
      data: {
        commandToForward: {
          type: "videoUpdate",
          data: {
            variant: "pause",
            tick: tick,
          },
        },
      },
    };
    ws.send(JSON.stringify(msg));
  });
  pubsub.handleTell("requestPeersToSeek", async ({ tick }) => {
    const msg: SendForward<SendVideoUpdate> = {
      type: "forward",
      data: {
        commandToForward: {
          type: "videoUpdate",
          data: {
            variant: "seek",
            tick: tick,
          },
        },
      },
    };
    ws.send(JSON.stringify(msg));
  });
}

async function setupHostControllerHandlers(
  pubsub: ProtoframePubsub<HostControllerProtocol>,
) {
  await connectionsEstablished();
}

browser.runtime.onConnect.addListener(async (port: Runtime.Port) => {
  allPorts.push(port);
  switch (port.name) {
    case "iframe": {
      if (connectedToTab) {
        // We must connect to a new tab, therefore let's kill all previous connections
        await resetConnections();
      }
      IFrameConnected.resolve();
      iframePubsub = ProtoframePubsub.build(JellyPartyDescriptor, port);
      setupIframeHandlers(iframePubsub);
      connectedToTab = true;
      break;
    }
    case "videoController": {
      const pubsub = ProtoframePubsub.build(VideoDescriptor, port);
      pubsub.handleTell("tellVideo", async ({ videoSize }) => {
        if (videoSize > currentVideoSize) {
          // This port has a larger video source that we must connect to
          // Close the previous pubsub
          try {
            videoControllerPubsub.destroy();
          } catch {
            console.log(
              "Cannot close previous VideoController Pubsub connection. Creating new connection.",
            );
          }
          // Create a new pubsub
          VideoFrameConnected.resolve();
          (videoControllerPubsub = ProtoframePubsub.build(
            VideoDescriptor,
            port,
          )),
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
      HostFrameConnected.resolve();
      hostFramePubsub = ProtoframePubsub.build(HostDescriptor, port);
      setupHostControllerHandlers(hostFramePubsub);
      break;
    }
    default: {
      console.error("Received unknown connection");
      console.log(port);
    }
  }
});
