import { ProtoframePubsub } from "protoframe";
import JellyParty from "@/iFrame/JellyParty";
import { state as optionsState } from "@/iFrame/store/options/index";
import toHHMMSS from "@/helpers/toHHMMSS";
import {
  Protocol,
  MediaMessage,
  ProtocolInterface,
} from "./protocols/Protocol";

// Playing, pausing and seeking in this context means notifying peers.
// We do not have access to the video inside the IFrame.

export class IFrameMessenger {
  private party: JellyParty;
  public messenger: ProtoframePubsub<ProtocolInterface>;

  constructor(party: JellyParty) {
    this.party = party;
    this.messenger = ProtoframePubsub.iframe(Protocol);
    this.initializeMessenger();
  }

  initializeMessenger() {
    console.log("Jelly-Party: Initializing iFrameMessenger");
    this.messenger.handleTell("joinParty", ({ partyId }) => {
      this.joinParty(partyId);
    });
    this.messenger.handleTell("forwardMediaEvent", msg => {
      this.forwardMediaEvent(msg);
    });
    this.messenger.handleTell("forwardNavigation", msg => {
      const clientCommand = {
        type: "navigate",
        data: {
          url: msg.url,
        },
      };
      const serverCommand = {
        type: "forward",
        data: { commandToForward: clientCommand },
      };
      this.party.ws.send(JSON.stringify(serverCommand));
    });
  }

  joinParty(partyId: string) {
    this.party.joinParty(partyId);
  }

  forwardMediaEvent(msg: MediaMessage) {
    switch (msg.event) {
      case "play":
        return this.handleMediaPlay(msg);
      case "pause":
        return this.handleMediaPause(msg);
      case "seek":
        return this.handleMediaSeek(msg);
    }
  }

  handleMediaPlay(msg: MediaMessage) {
    const notificationText = "You played the video.";
    if (optionsState?.showNotificationsForSelf) {
      if (optionsState?.statusNotificationsNotyf) {
        this.party.displayNotification(notificationText);
      }
      if (optionsState?.statusNotificationsInChat) {
        this.party.logToChat(notificationText);
      }
    }
    this.party.requestPeersToPlay(msg.tick);
  }

  handleMediaPause(msg: MediaMessage) {
    if (optionsState?.showNotificationsForSelf) {
      const notificationText = "You paused the video.";
      if (optionsState.statusNotificationsNotyf) {
        this.party.displayNotification(notificationText);
      }
      if (optionsState?.statusNotificationsInChat) {
        this.party.logToChat(notificationText);
      }
    }
    this.party.requestPeersToPause(msg.tick);
  }

  handleMediaSeek(msg: MediaMessage) {
    if (optionsState?.showNotificationsForSelf) {
      const notificationText = `You jumped to ${toHHMMSS(msg.tick)}.`;
      if (optionsState.statusNotificationsNotyf) {
        this.party.displayNotification(notificationText);
      }
      if (optionsState?.statusNotificationsInChat) {
        this.party.logToChat(notificationText);
      }
    }
    this.party.requestPeersToSeek(msg.tick);
  }
}
