/* eslint-disable @typescript-eslint/no-explicit-any */
import { difference as _difference } from "lodash-es";
import log from "loglevel";
import generateRoomWithoutSeparator from "./randomName.js";
// @ts-ignore
import toHHMMSS from "./toHHMMSS.js";
import "./libs/css/notyf.min.css";
import { Peer as PeerType, ChatMessage } from "@/store/party/types";
import store from "@/store/store";
import { RootState as RootStateType } from "@/store/types";
import { OptionsState as OptionsStateType } from "@/store/options/types";
import { PartyState as PartyStateType } from "@/store/party/types";
import { state as optionsState } from "@/store/options/index";
import { state as partyState } from "@/store/party/index";
import { stableWebsites } from "@/helpers/stableWebsites";
import { IFrameMessenger } from "@/browser/Messenger";
import {
  DataFrameMediaVariantType,
  MediaCommandFrame,
  SimpleRequestFrame,
} from "@/browser/Messenger";
import { VideoState } from "./videoHandler.js";

export default class JellyParty {
  // Root State
  readonly rootState: RootStateType;
  // Options State
  readonly optionsState: OptionsStateType;
  // Party State
  readonly partyState: PartyStateType;
  // Local state
  locallySyncPartyStateInterval: number | undefined;
  ws!: WebSocket & { uuid?: string };
  notyf: any;
  stableWebsite!: boolean;
  iFrameMessenger: IFrameMessenger;
  videoState!: VideoState;
  resolveVideoState!: (arg0: VideoState) => VideoState;
  resolveMagicLink!: (arg0: string) => string;

  constructor() {
    this.rootState = store.state;
    this.optionsState = optionsState;
    this.partyState = partyState;
    for (const stableWebsite of stableWebsites) {
      if (window.location.href.includes(stableWebsite)) {
        this.stableWebsite = true;
      }
    }
    this.locallySyncPartyStateInterval = undefined;
    if (["staging", "development"].includes(this.rootState.appMode)) {
      log.enableAll();
    } else {
      log.setDefaultLevel("info");
    }
    log.info(
      `Jelly-Party: Debug logging is ${
        ["staging", "development"].includes(this.rootState.appMode)
          ? "enabled"
          : "disabled"
      }.`
    );
    this.iFrameMessenger = new IFrameMessenger(this);
    log.debug("Jelly-Party: Global JellyParty Object");
    log.debug(this);
    this.displayNotification("Jelly Party loaded!", true);
    // Let's request autojoin
    this.iFrameMessenger.sendData({
      type: "joinPartyRequest",
      context: "JellyParty",
    });
  }
  resetPartyState() {
    store.dispatch("party/resetPartyState");
  }

  async updateMagicLink() {
    // Deferred used in similar way to VideoState request
    let magicLink: any = new Promise((resolve, reject) => {
      this.resolveMagicLink = resolve as (arg0: string) => string;
    });
    const request: SimpleRequestFrame = {
      type: "baseLinkRequest",
      context: "JellyParty",
    };
    this.iFrameMessenger.sendData(request);
    magicLink = await magicLink;
    store.dispatch("party/setMagicLink", magicLink);
  }

  locallySyncPartyState = async () => {
    try {
      // We craft a command to let the server know about our new client state
      const videoState: VideoState = (await this.getVideoState()) as VideoState;
      partyState.videoState = {
        paused: videoState.paused ?? true,
        currentTime: videoState.currentTime ?? 0,
      };
    } catch (error) {
      log.debug("Jelly-Party: Error updating client state..");
      log.error(error);
    }
  };

  uploadPartyState = async () => {
    // We craft a command to let the server know about our new client state
    await this.locallySyncPartyState();
    const serverCommand = {
      type: "clientUpdate",
      data: {
        newClientState: {
          currentlyWatching: this.partyState.magicLink,
          videoState: this.partyState.videoState,
          clientName: this.optionsState.clientName,
          avatarState: this.optionsState.avatarState,
        },
      },
    };
    this.ws.send(JSON.stringify(serverCommand));
  };

  startParty() {
    this.connectToPartyHelper();
  }

  joinParty(partyId: string) {
    this.connectToPartyHelper(partyId);
  }

  displayNotification(notificationText: string, forceDisplay = false) {
    if (forceDisplay || optionsState.statusNotificationsNotyf) {
      const notyfDataFrame = {
        type: "notyf" as "notyf",
        payload: {
          type: "notification" as "notification",
          message: notificationText,
        },
        context: "JellyParty" as "JellyParty",
      };
      this.iFrameMessenger.sendData(notyfDataFrame);
    }
  }

  connectToPartyHelper = function(this: JellyParty, partyId = "") {
    // Start a new party if no partyId is given, else join an existing party
    const start = partyId ? false : true;
    log.info(
      `Jelly-Party: ${start ? "Starting a new party." : "Joining a new party."}`
    );
    if (this.partyState.isActive) {
      log.error(
        `Jelly-Party: Error. Cannot ${
          start ? "start" : "join"
        } a party while still in an active party.`
      );
      return;
    }
    // this.admin = Boolean(start);
    store.dispatch("party/setActive", true);
    const finalPartyId = start ? generateRoomWithoutSeparator() : partyId;
    store.dispatch("party/setPartyId", finalPartyId);
    store.dispatch("options/setLastPartyId", finalPartyId);
    // Set the magic link
    this.updateMagicLink();
    let wsAddress = "";
    log.log(`APPMODE IS: ${this.rootState.appMode}`);
    switch (this.rootState.appMode) {
      case "staging":
        wsAddress = "wss://staging.jelly-party.com:8080";
        break;
      default:
        wsAddress = "wss://ws.jelly-party.com:8080";
    }
    log.debug(`Jelly-Party: Connecting to ${wsAddress}`);
    this.ws = new WebSocket(wsAddress);
    store.dispatch("setConnectingToServer", true);
    this.ws.onopen = function(this: JellyParty) {
      store.dispatch("setConnectingToServer", false);
      store.dispatch("setConnectedToServer", true);
      log.debug("Jelly-Party: Connected to Jelly-Party Websocket.");
      this.displayNotification("Connected to server!");
      this.ws.send(
        JSON.stringify({
          type: "join",
          data: {
            guid: this.optionsState.guid,
            partyId: this.partyState.partyId,
            clientState: {
              clientName: this.optionsState.clientName,
              currentlyWatching: this.partyState.magicLink,
              videoState: {},
              avatarState: this.optionsState.avatarState,
            },
          },
        })
      );
      this.locallySyncPartyStateInterval = setInterval(
        this.locallySyncPartyState,
        200
      );
    }.bind(this);

    this.ws.onmessage = (event: any) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case "videoUpdate": {
          // Find out which peer caused the event
          const peer = this.partyState.peers.filter(
            (peer) => peer.uuid === msg.data.peer.uuid
          )[0].clientName;
          switch (msg.data.variant) {
            case "play": {
              this.playVideo(msg.data.tick);
              break;
            }
            case "pause": {
              this.pauseVideo(msg.data.tick);
              break;
            }
            case "seek": {
              this.seek(msg.data.tick);
              break;
            }
          }
          const notificationText =
            msg.data.variant === "play"
              ? `${peer} played the video.`
              : msg.data.variant === "pause"
              ? `${peer} paused the video.`
              : `${peer} jumped to ${toHHMMSS(msg.data.tick)}.`;
          this.displayNotification(notificationText);
          this.logToChat(notificationText);
          break;
        }
        case "partyStateUpdate": {
          if (this.partyState.peers.length > msg.data.partyState.peers.length) {
            // Somebody left the party; Let's find out who
            const previousUUIDs = this.partyState.peers.map(
              (peer) => peer.uuid
            );
            const newUUIDs = msg.data.partyState.peers.map(
              (peer: PeerType) => peer.uuid
            );
            const peerWhoLeft = this.partyState.peers.filter(
              (peer: PeerType) =>
                peer.uuid === _difference(previousUUIDs, newUUIDs)[0]
            )[0];
            if (peerWhoLeft) {
              this.displayNotification(
                `${peerWhoLeft.clientName} left the party.`
              );
            }
          } else if (
            this.partyState.peers.length < msg.data.partyState.peers.length
          ) {
            // Somebody joined the party
            const previousUUIDs = this.partyState.peers.map(
              (peer: PeerType) => peer.uuid
            );
            const newUUIDs = msg.data.partyState.peers.map(
              (peer: PeerType) => peer.uuid
            );
            if (previousUUIDs.length === 0) {
              // Let's show all peers in the party
              for (const peer of msg.data.partyState.peers) {
                this.displayNotification(
                  `${peer.clientName} joined the party.`
                );
              }
            } else {
              // Show only the peer that joined
              const peerWhoJoined = msg.data.partyState.peers.filter(
                (peer: PeerType) =>
                  peer.uuid === _difference(newUUIDs, previousUUIDs)[0]
              )[0];
              if (peerWhoJoined) {
                this.displayNotification(
                  `${peerWhoJoined.clientName} joined the party.`
                );
              }
            }
          }
          store.dispatch("party/updatePartyState", msg.data.partyState);
          break;
        }
        case "chatMessage": {
          this.sendChatMessage(msg);
          const chatMessage: ChatMessage = msg;
          store.commit("party/addChatMessage", chatMessage);
          break;
        }
        case "setUUID": {
          store.commit("party/setSelfUUID", msg.data.uuid);
          break;
        }
        default: {
          log.debug(
            `Jelly-Party: Received unknown message: ${JSON.stringify(msg)}`
          );
        }
      }
    };

    this.ws.onclose = () => {
      log.debug("Jelly-Party: Disconnected from WebSocket-Server.");
      clearInterval(this.locallySyncPartyStateInterval);
      store.dispatch("setConnectedToServer", false);
    };
  };

  leaveParty() {
    log.info("Jelly-Party: Leaving current party.");
    this.ws.close();
    this.resetPartyState();
    this.displayNotification("You left the party!");
  }

  logToChat(text: string) {
    if (optionsState.statusNotificationsInChat) {
      const chatMessage: ChatMessage = {
        type: "chatMessage",
        peer: { uuid: "jellyPartyLogMessage" }, // will be added by server
        data: {
          text: text,
          timestamp: Date.now(),
        },
      };
      store.commit("party/addChatMessage", chatMessage);
    }
  }

  sendChatMessage(text: string) {
    if (text.length > 0) {
      const chatMessage: ChatMessage = {
        type: "chatMessage",
        // peer: { uuid: partyState.selfUUID }, // will be added by server
        data: {
          text: text,
          timestamp: Date.now(),
        },
      };
      const serverCommand = {
        type: "forward",
        data: {
          commandToForward: chatMessage,
        },
      };
      this.ws.send(JSON.stringify(serverCommand));
      store.commit("party/addChatMessage", {
        peer: { uuid: partyState.selfUUID }, // for ourself, we must add the UUID
        ...chatMessage,
      });
    } else {
      log.log(`Jelly-Party: Not sending empty chat message.`);
    }
  }

  requestPeersToPlay(tick: number | undefined) {
    if (this.partyState.isActive) {
      const clientCommand = {
        type: "videoUpdate",
        data: {
          variant: "play",
          tick: tick ?? 0,
          peer: { uuid: partyState.selfUUID },
        },
      };
      const serverCommand = {
        type: "forward",
        data: { commandToForward: clientCommand },
      };
      this.ws.send(JSON.stringify(serverCommand));
    }
  }

  requestPeersToPause(tick: number | undefined) {
    if (this.partyState.isActive) {
      const clientCommand = {
        type: "videoUpdate",
        data: {
          variant: "pause",
          tick: tick ?? 0,
          peer: { uuid: partyState.selfUUID },
        },
      };
      const serverCommand = {
        type: "forward",
        data: { commandToForward: clientCommand },
      };
      this.ws.send(JSON.stringify(serverCommand));
    }
  }

  requestPeersToSeek(tick: number | undefined) {
    if (this.partyState.isActive) {
      const clientCommand = {
        type: "videoUpdate",
        data: {
          variant: "seek",
          tick: tick ?? 0,
          peer: { uuid: partyState.selfUUID },
        },
      };
      const serverCommand = {
        type: "forward",
        data: { commandToForward: clientCommand },
      };
      this.ws.send(JSON.stringify(serverCommand));
    }
  }

  async playVideo(tick: number) {
    ["seek", "play"].forEach((variant) => {
      const msg: MediaCommandFrame = {
        type: "media",
        payload: {
          type: "videoUpdate",
          resetEventCounter: variant === "seek",
          data: {
            variant: variant as DataFrameMediaVariantType,
            tick: tick,
          },
        },
        context: "JellyParty",
      };
      this.iFrameMessenger.sendData(msg);
    });
  }

  async pauseVideo(tick: number) {
    ["seek", "pause"].forEach((variant) => {
      const msg: MediaCommandFrame = {
        type: "media",
        payload: {
          type: "videoUpdate",
          resetEventCounter: variant === "seek",
          data: {
            variant: variant as DataFrameMediaVariantType,
            tick: tick,
          },
        },
        context: "JellyParty",
      };
      this.iFrameMessenger.sendData(msg);
    });
  }

  async seek(tick: number) {
    const msg: MediaCommandFrame = {
      type: "media",
      payload: {
        type: "videoUpdate",
        resetEventCounter: true,
        data: {
          variant: "seek",
          tick: tick,
        },
      },
      context: "JellyParty",
    };
    this.iFrameMessenger.sendData(msg);
  }
  async getVideoState() {
    const dataframe: SimpleRequestFrame = {
      type: "videoStateRequest",
      context: "JellyParty",
    };
    this.iFrameMessenger.sendData(dataframe);
    // We must await the asynchronous response. We do this by exposing the resolve method
    // to the JellyParty object, so that the Messenger (which has access to JellyParty)
    // can call resolve, once it has received the response
    return new Promise((resolve, reject) => {
      this.resolveVideoState = resolve as (arg0: VideoState) => VideoState;
    });
  }
}
