import { sharedState } from "@/sidebar/Sidebar";
import { JellyPartyController } from "@/sidebar/main";
import { ProtoframePubsub } from "protoframe";
import { JellyPartyProtocol, MediaMessage } from "./protocol";

// Playing, pausing and seeking means actually playing, pausing and seeking the video in this context
// We have direct access to the video, but no access to the JellyParty object.
const typedMessenger = ProtoframePubsub.iframe(JellyPartyProtocol);

export class HostMessenger {
  public jellyPartyController!: JellyPartyController;
  public messenger!: typeof typedMessenger;

  constructor() {
    this.initializeMessenger();
  }

  async initializeMessenger() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const waitForJellyPartyRoot = async () => {
      const iframe = document.getElementById(
        "jellyPartyRoot",
      ) as HTMLIFrameElement | null;
      if (!iframe) {
        console.log(`Jelly-Party: HostMessenger waiting for jellyPartyRoot`);
        setTimeout(() => {
          waitForJellyPartyRoot();
        }, 100);
      } else {
        this.messenger = ProtoframePubsub.parent(JellyPartyProtocol, iframe);
        await ProtoframePubsub.connect(this.messenger);
        this.messenger.handleTell("replayMediaEvent", mediaEvent => {
          this.replayMediaEvent(mediaEvent);
        });
        this.messenger.handleTell("showNotyf", ({ message }) => {
          this.jellyPartyController.sidebar.showNotification(message);
        });
        this.messenger.handleTell("requestAutojoin", () => {
          this.attemptAutojoin();
        });
        this.messenger.handleTell("showUnreadNotification", () => {
          this.jellyPartyController.sidebar.fab.showUnreadNotificationIfMinimized();
        });
        this.messenger.handleTell("toggleFullscreen", () => {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen();
          }
        });
        this.messenger.handleAsk("getVideoState", async () => {
          return this.jellyPartyController.provider.controller.getVideoState();
        });
        this.messenger.handleAsk("getBaseLink", async () => {
          return { baseLink: this.getBaseLink() };
        });
      }
    };
  }

  attachJellyPartyControllerAndStartListening(
    jellyPartyController: JellyPartyController,
  ) {
    this.jellyPartyController = jellyPartyController;
    this.initializeMessenger();
  }

  async replayMediaEvent(mediaMessage: MediaMessage) {
    switch (mediaMessage.event) {
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
          mediaMessage.tick ?? 0,
        );
        break;
      }
      case "toggle": {
        await this.jellyPartyController.provider.controller.togglePlayPause();
        break;
      }
    }
  }

  attemptAutojoin = () => {
    console.log("Jelly-Party: Attempting to autojoin.");
    if (!sharedState.magicLinkUsed && sharedState.partyIdFromURL) {
      console.log("Jelly-Party: Joining party once via magic link.");
      sharedState.magicLinkUsed = true;
      this.messenger.tell("requestAutojoin", {
        partyId: sharedState.partyIdFromURL,
      });
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
