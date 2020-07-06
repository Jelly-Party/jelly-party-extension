import { browser, Runtime } from "webextension-polyfill-ts";
import JellyParty from "@/browser/JellyParty";
import VideoHandler from "@/browser/videoHandler";
import { VideoState } from "@/browser/videoHandler";
import { MainFrame } from "@/browser/mainFrame";

// MESSAGING API
// MainFrameMessenger
// (1) MainFrameMessenger -> IFrameMessenger: play/pause/seek command -> No reply
// (2) MainFrameMessenger -> IFrameMessenger: videoState update -> No reply
// (3) MainFrameMessenger -> IFrameMessenger: joinParty command -> No reply
// IFrameMessenger
// (4) IFrameMessenger -> MainFrameMessenger: notyf command (displays notification) -> No reply
// (5) IFrameMessenger -> MainFrameMessenger: videoState dataframe -> Triggers (2)

export interface NotyfFrame {
  type: "notyf";
  payload: {
    type: "notification";
    message: string;
  };
}

export type DataFrameMediaVariantType =
  | "play"
  | "pause"
  | "seek"
  | "togglePlayPause";

export interface MediaCommandFrame {
  type: "media";
  payload: {
    type: "videoUpdate";
    data: {
      variant: DataFrameMediaVariantType;
      tick: number | undefined;
    };
  };
}

export interface SimpleRequestFrame {
  type: "videoStateRequest" | "joinPartyRequest";
}

export interface VideoStateResponseFrame {
  type: "videoStateResponse";
  payload: VideoState;
}

export interface JoinPartyCommandFrame {
  type: "joinPartyCommand";
  payload: {
    partyId: string;
  };
}

export type MultiFrame =
  | NotyfFrame
  | MediaCommandFrame
  | SimpleRequestFrame
  | VideoStateResponseFrame
  | JoinPartyCommandFrame;

class Messenger {
  port!: Runtime.Port;
  messengerType: string;

  constructor(messengerType: string) {
    this.messengerType = messengerType;
  }
  sendData(dataframe: MultiFrame & { counter?: number | undefined }) {
    if (!this.port && !(dataframe.counter ?? 0 > 3)) {
      setTimeout(() => {
        this.sendData({ ...dataframe, ...{ counter: dataframe.counter ?? 0 } });
      }, 100 * (dataframe.counter ?? 1));
    } else {
      this.port.postMessage(dataframe);
    }
  }
}

export class MainFrameMessenger extends Messenger {
  // Playing, pausing and seeking means actually playing, pausing and seeking the video in this context
  // We have direct access to the video, but no access to the JellyParty object.
  videoHandler!: VideoHandler;
  mainFrame: MainFrame;
  showNotification: (arg0: string) => void;
  constructor(showNotification: (arg0: string) => void, mainFrame: MainFrame) {
    super("MainFrameMessenger");
    this.showNotification = showNotification;
    this.mainFrame = mainFrame;
    browser.runtime.onConnect.addListener((port) => {
      this.port = port;
      port.onMessage.addListener((msg: MultiFrame) => {
        // Reset the event counter
        this.videoHandler.eventsToProcess = 0;
        switch (msg.type) {
          case "media": {
            if (msg.payload.type === "videoUpdate") {
              switch (msg.payload.data.variant) {
                case "play": {
                  this.videoHandler.play();
                  break;
                }
                case "pause": {
                  this.videoHandler.pause();
                  break;
                }
                case "seek": {
                  this.videoHandler.seek(msg.payload.data.tick ?? 0);
                  break;
                }
                case "togglePlayPause": {
                  this.videoHandler.togglePlayPause();
                }
              }
            } else {
              console.log(
                `Jelly-Party: ${this.messengerType} received erroneous message:`
              );
              console.log(msg);
            }
            break;
          }
          case "notyf": {
            // Call showNotification to trigger a notyf
            this.showNotification(msg.payload.message);
            break;
          }
          case "joinPartyRequest": {
            this.mainFrame.autojoin();
            break;
          }
          case "videoStateRequest": {
            // We must respond to this request with the current video state
            const videoStateDataFrame: VideoStateResponseFrame = {
              type: "videoStateResponse",
              payload: this.videoHandler.getVideoState(),
            };
            this.sendData(videoStateDataFrame);
            break;
          }
          default: {
            console.log(
              `Jelly-Party: ${this.messengerType} received erroneous message:`
            );
            console.log(msg);
          }
        }
      });
    });
  }
}

export class IFrameMessenger extends Messenger {
  // Playing, pausing and seeking in this context means notifying peers
  // We do not have access to the video inside the IFrame.
  party: JellyParty;
  constructor(party: JellyParty) {
    super("IFrameMessenger");
    this.party = party;
    console.log("Jelly-Party: Attempting to connect IFrame with MainFrame.");
    browser.tabs
      .query({
        currentWindow: true,
        active: true,
      })
      .then((tabs) => {
        if (tabs.length > 0) {
          if (tabs[0]?.id) {
            this.port = browser.tabs.connect(tabs[0].id);
            this.port.onMessage.addListener((msg: MultiFrame) => {
              switch (msg.type) {
                case "media": {
                  if (msg.payload.type === "videoUpdate") {
                    switch (msg.payload.data.variant) {
                      case "play": {
                        this.party.requestPeersToPlay(msg.payload.data.tick);
                        break;
                      }
                      case "pause": {
                        this.party.requestPeersToPause(msg.payload.data.tick);
                        break;
                      }
                      case "seek": {
                        this.party.requestPeersToSeek(msg.payload.data.tick);
                        break;
                      }
                      default: {
                        console.log(
                          `Jelly-Party: ${this.messengerType} received erroneous message:`
                        );
                        console.error(msg);
                      }
                    }
                  } else {
                    console.log(
                      `Jelly-Party: ${this.messengerType} received erroneous message:`
                    );
                    console.log(msg);
                  }
                  break;
                }
                case "videoStateResponse": {
                  // We resolve a video state promise that gets created upon calling the async
                  // JellyParty.getVideoState(). This is essentially the same as using a Deferred
                  // see https://stackoverflow.com/questions/26150232/resolve-javascript-promise-outside-function-scope
                  this.party.resolveVideoState(msg.payload);
                  break;
                }
                case "joinPartyCommand": {
                  this.party.joinParty(msg.payload.partyId);
                  break;
                }
                default: {
                  console.log(
                    `Jelly-Party: ${this.messengerType} received erroneous message:`
                  );
                  console.log(msg);
                }
              }
            });
            this.party.displayNotification("Jelly Party loaded!");
          }
        }
      });
  }
}
