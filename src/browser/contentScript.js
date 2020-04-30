import VideoHandler from "./videoHandler.js";
import ChatHandler from "./chatHandler.js";
import { difference as _difference } from "lodash-es";
import log from "loglevel";
import generateRoomWithoutSeparator from "./randomName.js";
import Notyf from "./libs/js/notyf.min.js";
import "./libs/css/notyf.min.css";

if (!window.contentScriptInjected) {
  // scriptAlreadyInjected is undefined, therefore let's load everything
  window.contentScriptInjected = true;
  var DEBUG;
  switch (process.env.VUE_APP_MODE) {
    case "production":
      window.mode = "production";
      DEBUG = false;
      break;
    case "development":
      window.mode = "development";
      DEBUG = true;
      break;
    case "staging":
      window.mode = "staging";
      DEBUG = true;
      break;
    default:
      DEBUG = true;
  }

  if (DEBUG) {
    log.enableAll();
  } else {
    log.setDefaultLevel("info");
  }
  log.info(`Jelly-Party: Debug logging is ${DEBUG ? "enabled" : "disabled"}.`);
  // Create notyf object
  var notyf = new (Notyf())({
    duration: 3000,
    position: { x: "center", y: "top" },
    types: [
      {
        type: "success",
        background:
          "linear-gradient(to bottom right, #ff9494 0%, #ee64f6 100%)",
        icon: {
          className: "jelly-party-icon",
        },
      },
    ],
  });

  notyf.success("Jelly Party loaded!");

  // Needed to disable event forwarding for some time
  var eventsToProcess;
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

  class JellyParty {
    constructor(localPeerName, video) {
      this.localPeerName = localPeerName;
      this.video = video;
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
      // video.pause() & video.seek() will work, however some websites,
      // such as Netflix, require direct access to video controllers.
      this.videoHandler = new VideoHandler(window.location.host);
      this.chatHandler = new ChatHandler(window.location.host);
      this.resetPartyState();
      log.debug("Jelly-Party: Global JellyParty Object");
      log.debug(this);
    }

    resetPartyState() {
      const outerThis = this;
      chrome.storage.sync.get(["lastPartyId"], function(result) {
        outerThis.partyState = {
          isActive: false,
          partyId: "",
          peers: [],
          wsIsConnected: false,
          lastPartyId: result.lastPartyId,
          websiteIsTested: websiteIsTested,
          favicon: document.querySelector("link[rel=icon]")?.href,
          video: outerThis.partyState ? outerThis.partyState : false,
        };
        if (outerThis.partyIdFromURL && !outerThis.magicLinkUsed) {
          log.debug("Joining party once via magic link.");
          outerThis.magicLinkUsed = true;
          outerThis.joinParty(outerThis.partyIdFromURL);
        }
      });
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

    updateClientState() {
      // Request a client state update
      // "this" is bound to window, see 'The "this" problem' @ https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setInterval
      try {
        // We craft a command to let the server know about our new client state
        if (party.video) {
          var serverCommand = {
            type: "clientUpdate",
            data: {
              newClientState: {
                currentlyWatching: party.partyState.magicLink,
                favicon: party.partyState.favicon,
                videoState: {
                  paused: party.video.paused,
                  currentTime: party.video.currentTime,
                },
              },
            },
          };
          party.ws.send(JSON.stringify(serverCommand));
        }
      } catch (error) {
        log.debug("Jelly-Party: Error updating client state..");
        log.error(error);
      }
    }

    startParty() {
      this.connectToPartyHelper();
    }

    joinParty(partyId) {
      this.connectToPartyHelper(partyId);
    }
    connectToPartyHelper(partyId = "") {
      const outerThis = this;
      chrome.storage.sync.get(["options"], function(res) {
        // Start a new party if no partyId is given, else join an existing party
        var start = partyId ? false : true;
        log.info(
          `Jelly-Party: ${
            start ? "Starting a new party." : "Joining a new party."
          }`
        );
        // Let's fetch the latest client name from the chrome API
        outerThis.localPeerName = res.options.localPeerName;
        if (outerThis.partyState.isActive) {
          log.error(
            `Jelly-Party: Error. Cannot ${
              start ? "start" : "join"
            } a party while still in an active party.`
          );
        } else {
          outerThis.admin = Boolean(start);
          outerThis.partyState.isActive = true;
          outerThis.partyState.partyId = start
            ? generateRoomWithoutSeparator()
            : partyId;
          // Set the magic link
          outerThis.updateMagicLink();
          var wsAddress = "";
          switch (window.mode) {
            case "staging":
              wsAddress = "wss://staging.jelly-party.com:8080";
              break;
            default:
              wsAddress = "wss://ws.jelly-party.com:8080";
          }
          log.debug(`Connecting to ${wsAddress}`);
          outerThis.ws = new WebSocket(wsAddress);
          outerThis.ws.onopen = function() {
            log.debug("Jelly-Party: Connected to Jelly-Party Websocket.");
            notyf.success("Connected to server!");
            outerThis.chatHandler.connectWebSocket(outerThis.ws);
            chrome.storage.sync.set(
              { lastPartyId: outerThis.partyState.partyId },
              function() {
                log.debug(
                  `Jelly-Party: Last Party Id set to ${outerThis.partyState.partyId}`
                );
              }
            );
            outerThis.partyState.wsIsConnected = true;
            outerThis.ws.send(
              JSON.stringify({
                type: "join",
                data: {
                  guid: res.options.guid,
                  partyId: outerThis.partyState.partyId,
                  clientState: {
                    clientName: outerThis.localPeerName,
                    currentlyWatching: outerThis.partyState.magicLink,
                    favicon: outerThis.partyState.favicon,
                    videoState: {
                      paused: true,
                      currentTime: 0,
                    },
                  },
                },
              })
            );
            outerThis.updateClientStateInterval = setInterval(
              outerThis.updateClientState,
              5000
            );
          };
          outerThis.ws.onmessage = function(event) {
            var msg = JSON.parse(event.data);
            switch (msg.type) {
              case "videoUpdate":
                // Reset event counter, based on the command we receive. We will not forward
                // events until we have dealt with the command to prevent infinite loops.
                eventsToProcess = 0;
                // Find out which peer caused the event
                var peer = outerThis.partyState.peers.filter(
                  (peer) => peer.uuid === msg.data.peer.uuid
                )[0].clientName;
                if (msg.data.variant === "play") {
                  outerThis.playVideo(msg.data.tick);
                  notyf.success(`${peer} played the video.`);
                } else if (msg.data.variant === "pause") {
                  outerThis.pauseVideo(msg.data.tick);
                  notyf.success(`${peer} paused the video.`);
                } else if (msg.data.variant === "seek") {
                  outerThis.seek(msg.data.tick);
                  notyf.success(`${peer} jumped to another location.`);
                }
                break;
              case "partyStateUpdate":
                if (
                  outerThis.partyState.peers.length >
                  msg.data.partyState.peers.length
                ) {
                  // Somebody left the party; Let's find out who
                  let previousUUIDs = outerThis.partyState.peers.map(
                    (peer) => peer.uuid
                  );
                  let newUUIDs = msg.data.partyState.peers.map(
                    (peer) => peer.uuid
                  );
                  let peerWhoLeft = outerThis.partyState.peers.filter(
                    (peer) =>
                      peer.uuid === _difference(previousUUIDs, newUUIDs)[0]
                  )[0];
                  if (peerWhoLeft) {
                    notyf.success(`${peerWhoLeft.clientName} left the party.`);
                  }
                } else if (
                  outerThis.partyState.peers.length <
                  msg.data.partyState.peers.length
                ) {
                  // Somebody joined the party
                  let previousUUIDs = outerThis.partyState.peers.map(
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
                outerThis.partyState = {
                  ...outerThis.partyState,
                  ...msg.data.partyState,
                };
                // We must forward the new partyState to the Chat.
                outerThis.chatHandler.chatComponent.receivePartyStateUpdate(
                  outerThis.partyState
                );
                break;
              case "chatMessage":
                outerThis.chatHandler.chatComponent.receiveChatMessage(msg);
                break;
              case "setUUID":
                outerThis.uuid = msg.data.uuid;
                outerThis.ws.uuid = msg.data.uuid;
                break;
              default:
                log.debug(
                  `Jelly-Party: Received unknown message: ${JSON.stringify(
                    msg
                  )}`
                );
            }
          };
          outerThis.ws.onclose = function() {
            log.debug("Jelly-Party: Disconnected from WebSocket-Server.");
            clearInterval(outerThis.updateClientStateInterval);
            outerThis.partyState.wsIsConnected = false;
          };
        }
      });
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

    playVideo(tick) {
      if (!this.video) {
        log.warn(
          "Jelly-Party: No video defined. I shouldn't be receiving commands.."
        );
      } else {
        // At the least, disable forwarding for the play event.
        // The seek event will handle itself.
        eventsToProcess += 1;
        this.seek(tick);
        this.videoHandler.play(this.video);
      }
    }

    pauseVideo(tick) {
      if (!this.video) {
        log.warn(
          "Jelly-Party: No video defined. I shouldn't be receiving commands.."
        );
      } else {
        // At the least, disable forwarding for the pause event.
        // The seek event will handle itself.
        eventsToProcess += 1;
        this.seek(tick);
        this.videoHandler.pause(this.video);
      }
    }

    seek(tick) {
      if (!this.video) {
        log.warn(
          "Jelly-Party: No video defined. I shouldn't be receiving commands.."
        );
      } else {
        const timeDelta = Math.abs(tick - this.video.currentTime);
        if (timeDelta > 0.5) {
          // Seeking is actually worth it. We're off by more than half a second.
          // Disable forwarding for the upcoming seek event.
          eventsToProcess += 1;
          this.videoHandler.seek(this.video, tick);
        } else {
          log.debug(
            "Jelly-Party: Not actually seeking. Almost at same time already."
          );
        }
      }
    }
  }

  // Define global variables
  var video, party, findVideoAndAttach, findVideoInterval;
  var playListener, pauseListener, seekingListener, emptiedListener;
  chrome.storage.sync.get(["options"], function(result) {
    party = new JellyParty(result.options.localPeerName, video);
    window.party = party;
    chrome.runtime.onMessage.addListener(function(
      request,
      sender,
      sendResponse
    ) {
      switch (request.command) {
        case "startParty":
          // Start an entirely new party
          party.startParty();
          sendResponse({ status: "success" });
          break;
        case "joinParty":
          // Join an existing party
          party.joinParty(request.data.partyId);
          sendResponse({ status: "success" });
          break;
        case "leaveParty":
          // Leave the current party
          party.leaveParty();
          sendResponse({ status: "success" });
          break;
        case "getState":
          // Frontend queried party state, so we must respond
          sendResponse({ status: "success", data: party.partyState });
          break;
      }
    });

    playListener = function() {
      log.debug({ type: "play", tick: video.currentTime });
      if (eventsToProcess > 0) {
        // Somebody else is asking us to play
        // We must not forward the event, otherwise we'll end up in an infinite "play now" loop
        log.debug(
          "Jelly-Party: Not asking party to act - we did not generate the event. Event was caused by a peer."
        );
      } else {
        // We triggered the PlayPause button, so forward it to everybody
        // Trigger play (will sync as well)
        party.requestPeersToPlay();
      }
      eventsToProcess -= 1;
    };

    pauseListener = function() {
      log.debug({ type: "pause", tick: video.currentTime });
      if (eventsToProcess > 0) {
        // Somebody else is asking us to pause
        // We must not forward the event, otherwise we'll end up in an infinite "pause now" loop
        log.debug(
          "Jelly-Party: Not asking party to act - we did not generate the event. Event was caused by a peer."
        );
      } else {
        // We triggered the PlayPause button, so forward it to everybody
        // Trigger pause (will sync as well)
        party.requestPeersToPause();
      }
      eventsToProcess -= 1;
    };

    seekingListener = function() {
      log.debug({ type: "seek", tick: video.currentTime });
      if (eventsToProcess > 0) {
        // Somebody else is asking us to seek
        // We must not forward the event, otherwise we'll end up in an infinite seek loop
        log.debug(
          "Jelly-Party: Not asking party to act - we did not generate the event. Event was caused by a peer."
        );
      } else {
        // We triggered the seek, so forward it to everybody
        party.requestPeersToSeek();
      }
      eventsToProcess -= 1;
    };

    emptiedListener = () => {
      notyf.success("Video lost! Rescanning for video..");
      // Remove open event listeners
      video.removeEventListener("play", playListener);
      video.removeEventListener("pause", pauseListener);
      video.removeEventListener("seeked", seekingListener);
      video.removeEventListener("emptied", emptiedListener);
      video = null;
      party.partyState.video = false;
      findVideoInterval = setInterval(findVideoAndAttach, 1000);
    };

    findVideoAndAttach = () => {
      if (!video) {
        log.debug("Jelly-Party: Scanning for video to attach to.");
        video = document.querySelector("video");
        if (video) {
          clearInterval(findVideoInterval);
          party.chatHandler.resetChat();
          party.video = video;
          party.partyState.video = true;
          if (party.ws?.readyState === 1) {
            party.updateMagicLink();
            party.updateClientState();
          }
          log.info("Jelly-Party: Found video. Attaching to video..");
          notyf.success("Video detected!");
          video.addEventListener("play", playListener);
          video.addEventListener("pause", pauseListener);
          video.addEventListener("seeking", seekingListener);
          video.addEventListener("emptied", emptiedListener);
        }
      } else {
        log.debug("Jelly-Party: Checking if video source has changed..");
      }
    };
    findVideoInterval = setInterval(findVideoAndAttach, 1000);
  });
} else {
  // scriptAlreadyInject true -> let's skip injecting script again.
  log.debug("Jelly-Party: Skipping injection of contentScript.js.");
  // We must still refresh the user options
  chrome.storage.sync.get(["options"], function(result) {
    window.party.localPeerName = result.options.localPeerName;
  });
}
