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
import { AppStateInterface, InitialState } from "@/apps/iframe/store/store";
import uuidv4 from "@/helpers/uuidv4";
import { sample as _sample } from "lodash-es";
import { userNames } from "@/helpers/userNames";
import { OptionsState } from "@/apps/iframe/store/types";

(async () => {
  browser.runtime.onInstalled.addListener(function() {
    const options: OptionsState = {
      ...InitialState.OptionsState,
      ...{ guid: uuidv4(), clientName: _sample(userNames) ?? "guest" },
    };
    browser.storage.local.set({ options }).then(function() {
      console.log("Jelly-Party has been initialized. Initial options set:");
      console.log(options);
    });
  });

  async function getInitialState(): Promise<AppStateInterface> {
    const res = new DeferredPromise<AppStateInterface>();
    browser.storage.local.get("options").then(async res => {
      const storedOptions: OptionsState = res.options;
      if (!storedOptions.guid) {
        console.log("Jelly-Party. GUID lost, resetting GUID.");
        const newOptions: OptionsState = {
          ...storedOptions,
          ...{ guid: uuidv4() },
        };
        await browser.storage.local.set({ options: newOptions });
        res.resolve({
          ...InitialState.PartyState,
          ...InitialState.RootState,
          ...{
            OptionsState: { ...InitialState.OptionsState, ...newOptions },
          },
        });
      }
      res.resolve({
        ...InitialState.PartyState,
        ...InitialState.RootState,
        ...{
          OptionsState: { ...InitialState.OptionsState, ...storedOptions },
        },
      });
    });
    return res;
  }

  const appState = await getInitialState();

  async function saveOptions() {
    browser.storage.local.set({ options: appState.OptionsState });
  }

  let ws: WebSocket;
  let iframePubsub: ProtoframePubsub<JellyPartyProtocol>;
  let hostFramePubsub: ProtoframePubsub<HostControllerProtocol>;
  let videoControllerPubsub: ProtoframePubsub<VideoControllerProtocol>;
  let allPorts: Runtime.Port[] = [];
  let currentVideoSize = 0;
  let connectedToTab = false;
  let intervalUpdate: number;

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

  async function updateState() {
    appState.PartyState.videoState = (
      await videoControllerPubsub.ask("getVideoState", {})
    ).videoState;
  }

  async function pushAppState() {
    await updateState();
    iframePubsub.tell("setAppState", { appState });
  }

  async function pushVideoState() {
    await updateState();
    iframePubsub.tell("setVideoState", {
      videoState: appState.PartyState.videoState,
    });
  }

  async function setupWebsocketListeners(ws: WebSocket) {
    //@ts-ignore
    ws.onmessage = (ev: MessageEvent<ClientInstructions>) => {
      switch (ev.data.type) {
        case "partyStateUpdate": {
          appState.PartyState = {
            ...appState.PartyState,
            ...ev.data.data.partyState,
          };
          pushAppState();
          break;
        }
        case "setUUID": {
          appState.PartyState.selfUUID = ev.data.data.uuid;
          pushAppState();
          break;
        }
        case "videoUpdate": {
          switch (ev.data.data.variant) {
            case "play": {
              videoControllerPubsub.tell("playVideo", {
                tick: ev.data.data.tick,
              });
              break;
            }
            case "pause": {
              videoControllerPubsub.tell("pauseVideo", {
                tick: ev.data.data.tick,
              });
              break;
            }
            case "seek": {
              videoControllerPubsub.tell("seekVideo", {
                tick: ev.data.data.tick,
              });
              break;
            }
          }
          break;
        }
        default: {
          console.error("Jelly-Party: Websocket received erroneous message.");
          console.log(ev.data);
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
            guid: appState.OptionsState.guid,
            clientState: {
              clientName: appState.OptionsState.clientName,
              currentlyWatching: (await hostFramePubsub.ask("getURL", {})).url,
              uuid: appState.PartyState.selfUUID,
              videoState: (await videoControllerPubsub.ask("getVideoState", {}))
                .videoState,
              avatarState: appState.OptionsState.avatarState,
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
    pubsub.handleTell("saveOptions", async ({ options }) => {
      appState.OptionsState = { ...appState.OptionsState, ...options };
      saveOptions();
    });
  }

  async function setupVideoControllerHandlers(
    pubsub: ProtoframePubsub<VideoControllerProtocol>,
  ) {
    await connectionsEstablished();
    // Constantly push the video state to the IFrame
    clearInterval(intervalUpdate);
    intervalUpdate = setInterval(() => {
      pushVideoState();
    }, 200);
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

  function redirectToParty(
    redirectURL: string,
    resolve: (arg0?: any) => void,
    reject: (arg0?: any) => void,
  ) {
    // We attempt to inject the content script several times. If we've been
    // successful, further injections will yield no effect.
    // The root of the problem lies in the fact that browser.tabs.update's
    // callback function sometimes seems to execute before the tab's DOM content
    // has been loaded. This leads to the content script sometimes disappearing
    // into a void inbetween join.jelly-party.com and redirectURL.
    browser.tabs
      .update(undefined, { url: redirectURL })
      .then(async tab => {
        const activeTabId = tab.id;
        const delays = [3000, 5000, 10000];
        delays.forEach(delay => {
          setTimeout(() => {
            console.log("Jelly-Party: Attempting script injection.");
            browser.tabs
              .executeScript(activeTabId, {
                file: "js/sidebar.js",
              })
              .then(() => {
                resolve("Jelly-Party: Redirection to party successful.");
              })
              .catch(err => {
                if (delay === delays.splice(-1)[0]) {
                  reject("Jelly-Party: Redirection to party failed.");
                } else {
                  console.log(
                    `Could not redirect to party. Will attempt redirection again in ${delay}.`,
                  );
                  console.log(err);
                }
              });
          }, delay);
        });
      })
      .catch(e => console.log(e));
  }

  interface RedirectFrame {
    type: "redirectToParty";
    data: {
      redirectURL: string;
    };
  }

  browser.runtime.onMessage.addListener((req: string) => {
    const request: RedirectFrame = JSON.parse(req);
    switch (request.type) {
      case "redirectToParty": {
        return new Promise((resolve, reject) => {
          redirectToParty(
            (request as RedirectFrame).data.redirectURL,
            resolve,
            reject,
          );
        });
      }
      default: {
        console.log(`Jelly-Party: Received unknown message: ${request}`);
      }
    }
  });
})();
