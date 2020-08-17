import { Message } from "./messages/types/Message";
import { MessageFactory } from "./messengers/MessageFactory";
import { JoinMessage } from "./messages/JoinMessage";
import { LinkMessage } from "./messages/LinkMessage";
import { MediaMessage } from "./messages/MediaMessage";
import { VideoStateMessage } from "./messages/VideoStateMessage";

import { AbstractMessenger, MultiFrame } from "./AbstractMessenger";
import JellyParty from "@/iFrame/JellyParty";
import { state as optionsState } from "@/iFrame/store/options/index";
import toHHMMSS from "@/helpers/toHHMMSS";

// Playing, pausing and seeking in this context means notifying peers.
// We do not have access to the video inside the IFrame.

export class IFrameMessenger extends AbstractMessenger {
  party: JellyParty;
  // Message Factory
  public messaging!: MessageFactory;

  constructor(party: JellyParty) {
    super("IFrameMessenger");
    this.messengerType = "IFrameMessenger";
    this.messaging = new MessageFactory();
    this.party = party;
    this.setupMessageHandler();
  }

  // Handle received message
  handleMessage(msg: { context: "Jelly-Party"; data: Message }) {
    // Ignore non-Jelly-Party messages
    if (msg.data.context === "Jelly-Party") {
      // Handle the message based on its type
      switch (msg.data.type) {
        case "join":
          return this.handleJoin(msg.data);
        case "link":
          return this.handleLink(msg.data);
        case "media":
          return this.handleMedia(msg.data);
        case "state":
          return this.handleVideoState(msg.data);
      }
    }
  }

  handleJoin(msg: JoinMessage) {
    this.party.joinParty(msg.partyId);
  }

  handleLink(msg: LinkMessage) {
    const magicLink = new URL("https://join.jelly-party.com/");
    const redirectURL = encodeURIComponent(msg.redirectURL);
    magicLink.searchParams.append("redirectURL", redirectURL);
    magicLink.searchParams.append(
      "jellyPartyId",
      this.party.partyState.partyId,
    );
    this.party.resolveMagicLink(magicLink.toString());
  }

  handleMedia(msg: MediaMessage) {
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

  handleVideoState(msg: VideoStateMessage) {
    this.party.setVideoState(msg);
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
        if (msg.type === "messageResolved") {
          // We must not send a confirmation, but rather resolve one
          // of our previously sent dataframes
          this.resolvePromise(msg.deferredPromiseId as string);
        } else {
          this.handleMessage(msg.type);
        }
      },
    );
  }

  sendDataFrame(dataFrame: MultiFrame) {
    window.parent.postMessage(dataFrame, "*");
  }
}
