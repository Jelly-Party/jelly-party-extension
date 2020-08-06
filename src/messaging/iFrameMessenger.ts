import {
  AbstractMessenger,
  MultiFrame,
  MessageResolvedFrame,
} from "./AbstractMessenger";
import JellyParty from "@/iFrame/JellyParty";
import { state as optionsState } from "@/iFrame/store/options/index";
import toHHMMSS from "@/helpers/toHHMMSS";

// Playing, pausing and seeking in this context means notifying peers.
// We do not have access to the video inside the IFrame.

export class IFrameMessenger extends AbstractMessenger {
  party: JellyParty;

  constructor(party: JellyParty) {
    super("IFrameMessenger");
    this.messengerType = "IFrameMessenger";
    this.party = party;
    this.setupMessageHandler();
  }

  setupMessageHandler() {
    window.addEventListener(
      "message",
      async (event: Event & { data?: any }) => {
        // Load the message
        const msg: MultiFrame = event.data;
        if (!(msg.context === "JellyParty")) {
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
              // After we have resolved the media action, we must confirm this
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
    window.parent.postMessage(dataFrame, "*");
  }
}
