import JellyParty from "@/browser/JellyParty";
import VideoHandler from "@/browser/videoHandler";
import { VideoState } from "@/browser/videoHandler";
import { MainFrame } from "@/browser/mainFrame";
import { state as optionsState } from "@/store/options";
import toHHMMSS from "./toHHMMSS.js";
import { DeferredPromise } from "@/helpers/deferredPromise";
import uuidv4 from "@/helpers/uuidv4.js";

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
  context: "JellyParty";
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
    deferredPromiseId?: string;
    data: {
      variant: DataFrameMediaVariantType;
      tick?: number;
    };
  };
  context: "JellyParty";
}

export interface SimpleRequestFrame {
  type:
    | "videoStateRequest"
    | "joinPartyRequest"
    | "baseLinkRequest"
    | "chatNotification"
    | "toggleFullScreen";
  context: "JellyParty";
}

export interface VideoStateResponseFrame {
  type: "videoStateResponse";
  payload: VideoState;
  context: "JellyParty";
}

export interface JoinPartyCommandFrame {
  type: "joinPartyCommand";
  payload: {
    partyId: string;
  };
  context: "JellyParty";
}

export interface BaseLinkResponseFrame {
  type: "baseLinkResponse";
  payload: {
    baseLink: string;
  };
  context: "JellyParty";
}

export interface MediaPromiseResolvedFrame {
  type: "mediaPromiseResolved";
  payload: {
    promiseId: string;
  };
  context: "JellyParty";
}

export type MultiFrame =
  | NotyfFrame
  | MediaCommandFrame
  | SimpleRequestFrame
  | VideoStateResponseFrame
  | JoinPartyCommandFrame
  | BaseLinkResponseFrame
  | MediaPromiseResolvedFrame;

export class MainFrameMessenger {
  // Playing, pausing and seeking means actually playing, pausing and seeking the video in this context
  // We have direct access to the video, but no access to the JellyParty object.
  videoHandler!: VideoHandler;
  mainFrame: MainFrame;
  messengerType: string;

  showNotification: (arg0: string) => void;
  constructor(showNotification: (arg0: string) => void, mainFrame: MainFrame) {
    this.messengerType = "MainFrameMessenger";
    this.showNotification = showNotification;
    this.mainFrame = mainFrame;
    window.addEventListener(
      "message",
      async (event: Event & { data?: any }) => {
        // Load the message
        const msg: MultiFrame = event.data;
        if (!(msg.context === "JellyParty")) {
          return;
        }
        switch (msg.type) {
          case "media": {
            const confirmationMsg: MediaPromiseResolvedFrame = {
              type: "mediaPromiseResolved",
              payload: { promiseId: msg.payload.deferredPromiseId ?? "" },
              context: "JellyParty",
            };
            switch (msg.payload.data.variant) {
              case "play": {
                await this.videoHandler.play();
                this.sendData(confirmationMsg);
                break;
              }
              case "pause": {
                await this.videoHandler.pause();
                this.sendData(confirmationMsg);
                break;
              }
              case "seek": {
                await this.videoHandler.seek(msg.payload.data.tick ?? 0);
                this.sendData(confirmationMsg);
                break;
              }
              case "togglePlayPause": {
                await this.videoHandler.togglePlayPause();
                this.sendData(confirmationMsg);
              }
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
              context: "JellyParty",
            };
            this.sendData(videoStateDataFrame);
            break;
          }
          case "baseLinkRequest": {
            const baseLink = this.mainFrame.getBaseLink();
            const baseLinkResponse: BaseLinkResponseFrame = {
              type: "baseLinkResponse",
              payload: {
                baseLink: baseLink,
              },
              context: "JellyParty",
            };
            this.sendData(baseLinkResponse);
            break;
          }
          case "chatNotification": {
            this.mainFrame.showChatNotificationIfMinimized();
            break;
          }
          case "toggleFullScreen": {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              document.documentElement.requestFullscreen();
            }
            break;
          }
          default: {
            console.log(
              `Jelly-Party: ${this.messengerType} received erroneous message:`,
            );
            console.log(msg);
          }
        }
      },
    );
  }
  sendData(dataFrame: MultiFrame) {
    (document.querySelector(
      "#jellyPartyRoot",
    ) as any).contentWindow.postMessage(dataFrame, "*");
  }
}

export class IFrameMessenger {
  // Playing, pausing and seeking in this context means notifying peers.
  // We do not have access to the video inside the IFrame.
  party: JellyParty;
  messengerType: string;
  deferredPromises: { [id: string]: DeferredPromise };

  constructor(party: JellyParty) {
    this.messengerType = "IFrameMessenger";
    this.party = party;
    this.deferredPromises = {};
    console.log("Jelly-Party: Attempting to connect IFrame with MainFrame.");
    window.addEventListener(
      "message",
      async (event: Event & { data?: any }) => {
        // Load the message
        const msg: MultiFrame = event.data;
        if (!(msg.context === "JellyParty")) {
          return;
        }
        switch (msg.type) {
          case "media": {
            if (msg.payload.type === "videoUpdate") {
              switch (msg.payload.data.variant) {
                case "play": {
                  const notificationText = "You played the video.";
                  if (optionsState?.showNotificationsForSelf) {
                    if (optionsState?.statusNotificationsNotyf) {
                      this.party.displayNotification(notificationText);
                    }
                    if (optionsState?.statusNotificationsInChat) {
                      this.party.logToChat(notificationText);
                    }
                  }
                  this.party.requestPeersToPlay(msg.payload.data.tick);
                  break;
                }
                case "pause": {
                  if (optionsState?.showNotificationsForSelf) {
                    const notificationText = "You paused the video.";
                    if (optionsState.statusNotificationsNotyf) {
                      this.party.displayNotification(notificationText);
                    }
                    if (optionsState?.statusNotificationsInChat) {
                      this.party.logToChat(notificationText);
                    }
                  }
                  this.party.requestPeersToPause(msg.payload.data.tick);
                  break;
                }
                case "seek": {
                  if (optionsState?.showNotificationsForSelf) {
                    const notificationText = `You jumped to ${toHHMMSS(
                      msg.payload.data.tick,
                    )}.`;
                    if (optionsState.statusNotificationsNotyf) {
                      this.party.displayNotification(notificationText);
                    }
                    if (optionsState?.statusNotificationsInChat) {
                      this.party.logToChat(notificationText);
                    }
                  }

                  this.party.requestPeersToSeek(msg.payload.data.tick);
                  break;
                }
                default: {
                  console.log(
                    `Jelly-Party: ${this.messengerType} received erroneous message:`,
                  );
                  console.error(msg);
                }
              }
            } else {
              console.log(
                `Jelly-Party: ${this.messengerType} received erroneous message:`,
              );
              console.log(event);
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
          case "baseLinkResponse": {
            const magicLink = new URL("https://join.jelly-party.com/");
            const redirectURL = encodeURIComponent(msg.payload.baseLink);
            magicLink.searchParams.append("redirectURL", redirectURL);
            magicLink.searchParams.append(
              "jellyPartyId",
              this.party.partyState.partyId,
            );
            this.party.resolveMagicLink(magicLink.toString());
            break;
          }
          case "mediaPromiseResolved": {
            const promiseId = msg.payload.promiseId;
            console.log(`Resolving promise with Id of ${promiseId}`);
            try {
              this.deferredPromises[promiseId].resolve();
            } catch (e) {
              console.log("Jelly-Party: Error resolving deferred promise.");
              console.log(e);
            }
            break;
          }
          default: {
            console.log(
              `Jelly-Party: ${this.messengerType} received erroneous message:`,
            );
            console.log(msg);
          }
        }
      },
    );
  }
  sendData(dataFrame: MultiFrame) {
    window.parent.postMessage(dataFrame, "*");
  }

  async sendMediaCommandFrameAndWaitForConfirmation(
    dataFrame: MediaCommandFrame,
  ) {
    // Create a unique identifier for the deferred promise
    const deferredPromiseId = uuidv4();
    // Add the unique Id to the dataframe, so we can match against the response frame Id
    dataFrame.payload.deferredPromiseId = deferredPromiseId;
    console.log(`Creating deferred with Id of ${deferredPromiseId}`);
    // Create the deferred promise
    const deferredPromise = new DeferredPromise();
    // Save the deferred promise to a dictionary, so we can access it by Id later
    this.deferredPromises[deferredPromiseId] = deferredPromise;
    // Send out the actual request
    window.parent.postMessage(dataFrame, "*");
    deferredPromise.then(() => {
      // Remove the promise from the dictionary
      delete this.deferredPromises[deferredPromiseId];
    });
    // Resolve either when the deferredPromise resolves or after a 2s timeout
    return Promise.race([
      deferredPromise,
      new Promise((resolve, reject) => {
        setTimeout(() => {
          delete this.deferredPromises[deferredPromiseId];
          reject("Jelly-Party: Deferred promise timed out.");
        }, 2000);
      }),
    ]);
  }
}
