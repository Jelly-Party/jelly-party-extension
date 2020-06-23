import VideoHandler from "./videoHandler.js";
import { difference as _difference } from "lodash-es";
import log from "loglevel";
import generateRoomWithoutSeparator from "./randomName.js";
import Notyf from "./libs/js/notyf.min.js";
import store from "@/store.js";
import toHHMMSS from "./toHHMMSS.js";
import "./libs/css/notyf.min.css";
import { browser } from "webextension-polyfill-ts";

let DEBUG = store.state.appMode;

// Let's request the background script to clear the injection interval
// let obj = {
//   type: "clearCSInjectionInterval",
// };
// console.log("Jelly-Party: Requesting clearing of content script injection.");
// browser.runtime.sendMessage(obj);

if (DEBUG) {
  log.enableAll();
} else {
  log.setDefaultLevel("info");
}
log.info(`Jelly-Party: Debug logging is ${DEBUG ? "enabled" : "disabled"}.`);
// Create notyf object
let notyf = new (Notyf())({
  duration: 3000,
  position: { x: "center", y: "top" },
  types: [
    {
      type: "success",
      background: "linear-gradient(to bottom right, #ff9494 0%, #ee64f6 100%)",
      icon: {
        className: "jelly-party-icon",
      },
    },
  ],
});

notyf.success("Jelly Party loaded!");

// Stable Websites; other websites will likely work, but will receive the "experimental"-flag
const stableWebsites = [
  "https://www.netflix.com",
  "https://www.amazon",
  "https://www.youtube.com",
  "https://vimeo.com",
  "https://www.disneyplus.com",
];
const websiteIsTested = (() => {
  for (const stableWebsite of stableWebsites) {
    if (window.location.href.includes(stableWebsite)) {
      return true;
    }
  }
  return false;
})();

export default class JellyParty {
  constructor(localPeerName) {
    this.localPeerName = localPeerName;
    this.magicLinkUsed = false;
    this.partyIdFromURL = new URLSearchParams(window.location.search).get(
      "jellyPartyId"
    );
    if (this.partyIdFromURL) {
      log.debug(`partyIdFromURL is ${this.partyIdFromURL}`);
    }
    this.updateClientStateInterval = null;
    // The VideoHandler handles playing, pausing & seeking videos
    // on different websites. For most websites the generic video.play(),
    // video.pause() & video.currentTime= will work, however some websites,
    // such as Netflix, require direct access to video controllers.
    this.videoHandler = new VideoHandler(window.location.host, notyf, this);
    this.resetPartyState();
    log.debug("Jelly-Party: Global JellyParty Object");
    log.debug(this);
  }

  resetPartyState() {
    this.partyState = {
      isActive: false,
      partyId: "",
      peers: [],
      wsIsConnected: false,
      lastPartyId: "result.lastPartyId",
      websiteIsTested: websiteIsTested,
      favicon: document.querySelector("link[rel=icon]")?.href,
      video: this.partyState ? this.partyState : false,
    };
    if (this.partyIdFromURL && !this.magicLinkUsed) {
      log.debug("Joining party once via magic link.");
      this.magicLinkUsed = true;
      this.joinParty(this.partyIdFromURL);
    }
  }

  updateMagicLink() {
    // Get "clean" website URL without jellyPartyId=..
    let searchParams = new URLSearchParams(window.location.search);
    searchParams.delete("jellyPartyId");
    let redirectURL = encodeURIComponent(
      window.location.origin + window.location.pathname + "?" + searchParams
    );
    // Set the magic link
    this.partyState.magicLink = `https://join.jelly-party.com/?jellyPartyId=${this.partyState.partyId}&redirectURL=${redirectURL}`;
  }

  updateClientState = function() {
    // Request a client state update
    // without "bind", "this" is bound to window, see 'The "this" problem' @ https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setInterval
    try {
      // We craft a command to let the server know about our new client state
      if (this.videoHandler.video) {
        let serverCommand = {
          type: "clientUpdate",
          data: {
            newClientState: {
              currentlyWatching: this.partyState.magicLink,
              favicon: this.partyState.favicon,
              videoState: {
                paused: this.video.paused,
                currentTime: this.video.currentTime,
              },
            },
          },
        };
        this.ws.send(JSON.stringify(serverCommand));
      }
    } catch (error) {
      log.debug("Jelly-Party: Error updating client state..");
      log.error(error);
    }
  }.bind(this);

  startParty() {
    this.connectToPartyHelper();
  }

  joinParty(partyId) {
    this.connectToPartyHelper(partyId);
  }
  connectToPartyHelper(partyId = "") {
    browser.storage.sync.get(["options", "avatarState"]).then(
      function(res) {
        // Start a new party if no partyId is given, else join an existing party
        var start = partyId ? false : true;
        log.info(
          `Jelly-Party: ${
            start ? "Starting a new party." : "Joining a new party."
          }`
        );
        // Let's fetch the latest client name from the chrome API
        this.localPeerName = res.options.localPeerName;
        if (this.partyState.isActive) {
          log.error(
            `Jelly-Party: Error. Cannot ${
              start ? "start" : "join"
            } a party while still in an active party.`
          );
        } else {
          this.admin = Boolean(start);
          this.partyState.isActive = true;
          this.partyState.partyId = start
            ? generateRoomWithoutSeparator()
            : partyId;
          // Set the magic link
          this.updateMagicLink();
          var wsAddress = "";
          switch (store.state.appMode) {
            case "staging":
              wsAddress = "wss://staging.jelly-party.com:8080";
              break;
            default:
              wsAddress = "wss://ws.jelly-party.com:8080";
          }
          log.debug(`Jelly-Party: Connecting to ${wsAddress}`);
          this.ws = new WebSocket(wsAddress);
          store.dispatch("toggleConnectingStatus");
          this.ws.onopen = function() {
            store.dispatch("toggleConnectingStatus");
            store.dispatch("connectToServer");
            log.debug("Jelly-Party: Connected to Jelly-Party Websocket.");
            notyf.success("Connected to server!");
            browser.storage.sync
              .set({ lastPartyId: this.partyState.partyId })
              .then(function() {
                log.debug(
                  `Jelly-Party: Last Party Id set to ${this.partyState.partyId}`
                );
              });

            this.partyState.wsIsConnected = true;
            this.ws.send(
              JSON.stringify({
                type: "join",
                data: {
                  guid: res.options.guid,
                  partyId: this.partyState.partyId,
                  clientState: {
                    clientName: this.localPeerName,
                    currentlyWatching: this.partyState.magicLink,
                    favicon: this.partyState.favicon,
                    videoState: {
                      paused: true,
                      currentTime: 0,
                    },
                    avatarState: res.avatarState,
                  },
                },
              })
            );
            this.updateClientStateInterval = setInterval(
              this.updateClientState,
              5000
            );
          }.bind(this);
          this.ws.onmessage = function(event) {
            var msg = JSON.parse(event.data);
            switch (msg.type) {
              case "videoUpdate":
                // Reset event counter, based on the command we receive. We will not forward
                // events until we have dealt with the command to prevent infinite loops.
                this.videoHandler.eventsToProcess = 0;
                // Find out which peer caused the event
                var peer = this.partyState.peers.filter(
                  (peer) => peer.uuid === msg.data.peer.uuid
                )[0].clientName;
                if (msg.data.variant === "play") {
                  this.playVideo(msg.data.tick);
                  notyf.success(`${peer} played the video.`);
                } else if (msg.data.variant === "pause") {
                  this.pauseVideo(msg.data.tick);
                  notyf.success(`${peer} paused the video.`);
                } else if (msg.data.variant === "seek") {
                  this.seek(msg.data.tick);
                  notyf.success(
                    `${peer} jumped to ${toHHMMSS(msg.data.tick)}.`
                  );
                }
                break;
              case "partyStateUpdate":
                if (
                  this.partyState.peers.length >
                  msg.data.partyState.peers.length
                ) {
                  // Somebody left the party; Let's find out who
                  let previousUUIDs = this.partyState.peers.map(
                    (peer) => peer.uuid
                  );
                  let newUUIDs = msg.data.partyState.peers.map(
                    (peer) => peer.uuid
                  );
                  let peerWhoLeft = this.partyState.peers.filter(
                    (peer) =>
                      peer.uuid === _difference(previousUUIDs, newUUIDs)[0]
                  )[0];
                  if (peerWhoLeft) {
                    notyf.success(`${peerWhoLeft.clientName} left the party.`);
                  }
                } else if (
                  this.partyState.peers.length <
                  msg.data.partyState.peers.length
                ) {
                  // Somebody joined the party
                  let previousUUIDs = this.partyState.peers.map(
                    (peer) => peer.uuid
                  );
                  let newUUIDs = msg.data.partyState.peers.map(
                    (peer) => peer.uuid
                  );
                  if (previousUUIDs.length === 0) {
                    // Let's show all peers in the party
                    for (const peer of msg.data.partyState.peers) {
                      notyf.success(`${peer.clientName} joined the party.`);
                    }
                  } else {
                    let peerWhoJoined = msg.data.partyState.peers.filter(
                      (peer) =>
                        peer.uuid === _difference(newUUIDs, previousUUIDs)[0]
                    )[0];
                    if (peerWhoJoined) {
                      notyf.success(
                        `${peerWhoJoined.clientName} joined the party.`
                      );
                    }
                  }
                }
                this.partyState = {
                  ...this.partyState,
                  ...msg.data.partyState,
                };
                break;
              case "chatMessage":
                // this.chatHandler.chatComponent.receiveChatMessage(msg);
                break;
              case "setUUID":
                this.uuid = msg.data.uuid;
                this.ws.uuid = msg.data.uuid;
                break;
              default:
                log.debug(
                  `Jelly-Party: Received unknown message: ${JSON.stringify(
                    msg
                  )}`
                );
            }
          }.bind(this);
          this.ws.onclose = function() {
            log.debug("Jelly-Party: Disconnected from WebSocket-Server.");
            store.dispatch("disconnectFromServer");
            clearInterval(this.updateClientStateInterval);
            this.partyState.wsIsConnected = false;
          }.bind(this);
        }
      }.bind(this)
    );
  }

  leaveParty() {
    log.info("Jelly-Party: Leaving current party.");
    this.ws.close();
    this.resetPartyState();
    notyf.success("You left the party!");
  }

  filterPeer(skipPeer) {
    return this.remotePeers.filter((e) => e.connection.peer != skipPeer);
  }

  requestPeersToPlay() {
    if (this.partyState.isActive) {
      var clientCommand = {
        type: "videoUpdate",
        data: {
          variant: "play",
          tick: this.video.currentTime,
          peer: { uuid: this.uuid },
        },
      };
      var serverCommand = {
        type: "forward",
        data: { commandToForward: clientCommand },
      };
      this.ws.send(JSON.stringify(serverCommand));
    }
  }

  requestPeersToPause() {
    if (this.partyState.isActive) {
      var clientCommand = {
        type: "videoUpdate",
        data: {
          variant: "pause",
          tick: this.video.currentTime,
          peer: { uuid: this.uuid },
        },
      };
      var serverCommand = {
        type: "forward",
        data: { commandToForward: clientCommand },
      };
      this.ws.send(JSON.stringify(serverCommand));
    }
  }

  requestPeersToSeek() {
    if (this.partyState.isActive) {
      var clientCommand = {
        type: "videoUpdate",
        data: {
          variant: "seek",
          tick: this.video.currentTime,
          peer: { uuid: this.uuid },
        },
      };
      var serverCommand = {
        type: "forward",
        data: { commandToForward: clientCommand },
      };
      this.ws.send(JSON.stringify(serverCommand));
    }
  }

  async playVideo(tick) {
    if (!this.video) {
      log.warn(
        "Jelly-Party: No video defined. I shouldn't be receiving commands.."
      );
    } else {
      // If we're already playing, ignore playVideo request
      if (!this.video.paused) {
        return;
      }
      // At the least, disable forwarding for the play event.
      // The seek event will handle itself.
      await this.seek(tick);
      this.videoHandler.eventsToProcess += 1;
      await this.videoHandler.play();
    }
  }

  async pauseVideo(tick) {
    if (!this.video) {
      log.warn(
        "Jelly-Party: No video defined. I shouldn't be receiving commands.."
      );
    } else {
      // If we're already paused, ignore pauseVideo request
      if (this.video.paused) {
        return;
      }
      // At the least, disable forwarding for the pause event.
      // The seek event will handle itself.
      await this.seek(tick);
      this.videoHandler.eventsToProcess += 1;
      await this.videoHandler.pause();
    }
  }

  async seek(tick) {
    if (!this.video) {
      log.warn(
        "Jelly-Party: No video defined. I shouldn't be receiving commands.."
      );
    } else {
      const timeDelta = Math.abs(tick - this.video.currentTime);
      if (timeDelta > 0.5) {
        // Seeking is actually worth it. We're off by more than half a second.
        // Disable forwarding for the upcoming seek event.
        this.videoHandler.eventsToProcess += 1;
        await this.videoHandler.seek(tick);
      } else {
        log.debug(
          "Jelly-Party: Not actually seeking. Almost at same time already."
        );
      }
    }
  }
}
