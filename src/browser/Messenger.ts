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
    data: {
      variant: DataFrameMediaVariantType;
      tick: number | undefined;
    };
  };
  context: "JellyParty";
}

export interface SimpleRequestFrame {
  type: "videoStateRequest" | "joinPartyRequest" | "baseLinkRequest";
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

export type MultiFrame =
  | NotyfFrame
  | MediaCommandFrame
  | SimpleRequestFrame
  | VideoStateResponseFrame
  | JoinPartyCommandFrame
  | BaseLinkResponseFrame;

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
    window.addEventListener("message", (event: Event & { data?: any }) => {
      // Reset the event counter
      this.videoHandler.eventsToProcess = 0;
      // Load the message
      const msg: MultiFrame = event.data;
      if (!(msg.context === "JellyParty")) {
        console.log("Received message that's probably not from JellyParty.");
        return;
      }
      switch (msg.type) {
        case "media": {
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
        default: {
          console.log(
            `Jelly-Party: ${this.messengerType} received erroneous message:`
          );
          console.log(msg);
        }
      }
    });
  }
  sendData(dataFrame: MultiFrame) {
    (document.querySelector(
      "#jellyPartyRoot"
    ) as any).contentWindow.postMessage(dataFrame, "*");
  }
}

export class IFrameMessenger {
  // Playing, pausing and seeking in this context means notifying peers
  // We do not have access to the video inside the IFrame.
  party: JellyParty;
  messengerType: string;
  constructor(party: JellyParty) {
    this.messengerType = "IFrameMessenger";
    this.party = party;
    console.log("Jelly-Party: Attempting to connect IFrame with MainFrame.");
    window.addEventListener("message", (event: Event & { data?: any }) => {
      // Load the message
      const msg: MultiFrame = event.data;
      if (!(msg.context === "JellyParty")) {
        console.log("Received message that's probably not from JellyParty.");
        return;
      }
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
            this.party.partyState.partyId
          );
          this.party.resolveMagicLink(magicLink.toString());
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
  }
  sendData(dataFrame: MultiFrame) {
    window.parent.postMessage(dataFrame, "*");
  }
}
