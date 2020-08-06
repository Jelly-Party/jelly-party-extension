import {
  AbstractMessenger,
  MultiFrame,
  BaseLinkResponseFrame,
  VideoStateResponseFrame,
  JoinPartyCommandFrame,
  MessageResolvedFrame,
} from "./AbstractMessenger";
import { sharedState } from "@/sidebar/Sidebar";
import { JellyPartyController } from "@/sidebar/main";

// Playing, pausing and seeking means actually playing, pausing and seeking the video in this context
// We have direct access to the video, but no access to the JellyParty object.

export class HostMessenger extends AbstractMessenger {
  public jellyPartyController!: JellyPartyController;
  constructor() {
    super("HostMessenger");
  }

  attachJellyPartyControllerAndStartListening(
    jellyPartyController: JellyPartyController,
  ) {
    this.jellyPartyController = jellyPartyController;
    this.setupMessageHandler();
  }

  setupMessageHandler() {
    window.addEventListener(
      "message",
      async (event: Event & { data?: any }) => {
        // Load the message
        const msg: MultiFrame = event.data;
        if (msg.context !== "JellyParty") {
          return;
        }
        const confirmMessage = () => {
          const messageResolvedFrame: MessageResolvedFrame = {
            type: "messageResolved",
            deferredPromiseId: msg.deferredPromiseId,
            context: "JellyParty",
          };
          this.sendDataFrame(messageResolvedFrame);
        };
        if (msg.type === "messageResolved") {
          // We must not send a confirmation, but rather resolve one
          // of our previously sent dataframes
          this.resolvePromise(msg.deferredPromiseId as string);
        } else {
          switch (msg.type) {
            case "media": {
              switch (msg.payload.data.variant) {
                case "play": {
                  await this.jellyPartyController.provider.controller.play();
                  break;
                }
                case "pause": {
                  await this.jellyPartyController.provider.controller.pause();
                  break;
                }
                case "seek": {
                  await this.jellyPartyController.provider.controller.seek(
                    msg.payload.data.tick ?? 0,
                  );
                  break;
                }
                case "togglePlayPause": {
                  await this.jellyPartyController.provider.controller.togglePlayPause();
                  break;
                }
              }
              // After we have resolved the media action, we must confirm this
              break;
            }
            case "notyf": {
              // Call showNotification to trigger a notyf
              this.jellyPartyController.sidebar.showNotification(
                msg.payload.message,
              );
              break;
            }
            case "joinPartyRequest": {
              this.attemptAutojoin();
              // We only confirm the attempt
              break;
            }
            case "videoStateRequest": {
              // We must respond to this request with the current video state
              // We pass the deferredPromiseId within the VideoStateResponseFrame
              const videoStateDataFrame: VideoStateResponseFrame = {
                type: "videoStateResponse",
                deferredPromiseId: msg.deferredPromiseId,
                payload: this.jellyPartyController.provider.controller.getVideoState(),
                context: "JellyParty",
              };
              this.sendMessage(videoStateDataFrame);
              break;
            }
            case "baseLinkRequest": {
              // We must respond to this request with the current base link
              // We pass the deferredPromiseId within the BaseLinkResponseFrame
              const baseLink = this.getBaseLink();
              const baseLinkResponse: BaseLinkResponseFrame = {
                type: "baseLinkResponse",
                payload: {
                  baseLink: baseLink,
                },
                context: "JellyParty",
              };
              this.sendMessage(baseLinkResponse);
              break;
            }
            case "chatNotification": {
              this.jellyPartyController.sidebar.fab.showChatNotificationIfMinimized();
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
          // Finally, we must confirm that we have handled the message
          confirmMessage();
        }
      },
    );
  }

  sendDataFrame(dataFrame: MultiFrame) {
    const doc: HTMLIFrameElement | null = document.querySelector(
      "#jellyPartyRoot",
    );
    if (doc) {
      doc.contentWindow?.postMessage(dataFrame, "*");
    } else {
      console.log(
        "Jelly-Party: Cannot find #jellyPartyRoot to send message to..",
      );
    }
  }

  attemptAutojoin = () => {
    console.log("Jelly-Party: Attempting to autojoin.");
    if (!sharedState.magicLinkUsed && sharedState.partyIdFromURL) {
      console.log("Jelly-Party: Joining party once via magic link.");
      sharedState.magicLinkUsed = true;
      const msg: JoinPartyCommandFrame = {
        type: "joinPartyCommand",
        payload: {
          partyId: sharedState.partyIdFromURL,
        },
        context: "JellyParty",
      };
      this.sendMessage(msg);
    } else {
      console.log("Jelly-Party: No party found or already used magic link.");
    }
  };
  getBaseLink = () => {
    const baseLink: URL = new URL(window.location.href);
    baseLink.searchParams.delete("jellyPartyId");
    return baseLink.toString();
  };
}

export const hostMessenger = new HostMessenger();
