import { sharedState } from "@/sidebar/Sidebar";
import { JellyPartyController } from "@/sidebar/main";
import { ProtoframePubsub } from "protoframe";
import { Protocol, MediaMessage } from "./protocols/Protocol";
import { timeoutQuerySelector } from "@/helpers/querySelectors";

// Playing, pausing and seeking means actually playing, pausing and seeking the video in this context
// We have direct access to the video, but no access to the JellyParty object.
const typedMessenger = ProtoframePubsub.iframe(Protocol);

export class HostMessenger {
  public jellyPartyController!: JellyPartyController;
  public messenger!: typeof typedMessenger;

  async initializeMessenger() {
    const iframe = await timeoutQuerySelector("#jellyPartyRoot");
    if (!iframe) {
      console.log(`Jelly-Party: Cannot init messenger without jellyPartyRoot`);
    } else {
      this.messenger = ProtoframePubsub.parent(Protocol, iframe);
      this.messenger.handleAsk("replayMediaEvent", async mediaEvent => {
        return await this.replayMediaEvent(mediaEvent);
      });
      this.messenger.handleTell("showNotyf", ({ message }) => {
        this.jellyPartyController.sidebar.showNotification(message);
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
      this.messenger.handleAsk("requestAutoJoin", async () => {
        return { partyId: sharedState.partyIdFromURL };
      });
      await ProtoframePubsub.connect(this.messenger);
    }
  }

  attachJellyPartyControllerAndStartListening(
    jellyPartyController: JellyPartyController,
  ) {
    this.jellyPartyController = jellyPartyController;
    this.initializeMessenger();
  }

  async replayMediaEvent(mediaMessage: MediaMessage) {
    console.log(`attempting to replay ${JSON.stringify(mediaMessage)}`);
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
    return { success: true };
  }

  getBaseLink = () => {
    const baseLink: URL = new URL(window.location.href);
    baseLink.searchParams.delete("jellyPartyId");
    return baseLink.toString();
  };
}

export const hostMessenger = new HostMessenger();
