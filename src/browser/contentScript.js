/* global log, Notyf, _, generateRoomWithoutSeparator */
if (!window.contentScriptInjected) {
  // scriptAlreadyInjected is undefined, therefore let's load everything
  window.contentScriptInjected = true;
  var DEBUG;
  switch (window.mode) {
    case "production":
      DEBUG = false;
      break;
    case "staging":
      DEBUG = true;
      break;
    case "development":
      DEBUG = true;
      break;
    default:
      DEBUG = true;
  }

  if (DEBUG) {
    log.log("Jelly-Party: Injecting Content Script!");
    log.enableAll();
  } else {
    log.setDefaultLevel("info");
  }
  log.info(`Jelly-Party: Debug logging is ${DEBUG ? "enabled" : "disabled"}.`);
  // Create notyf object
  var notyf = new Notyf({
    duration: 3000,
    position: { x: "center", y: "top" },
    types: [
      {
        type: "success",
        background:
          "linear-gradient(to bottom right, #ff9494 0%, #ee64f6 100%)",
        icon: {
          className: "jelly-party-icon"
        }
      }
    ]
  });

  notyf.success("Initialized successfully!");

  // Needed to disable event forwarding for some time
  var eventsToProcess;
  // Stable Websites; other websites will likely work, but will receive the "experimental"-flag
  const stableWebsites = [
    "https://www.netflix.com",
    "https://www.amazon",
    "https://www.youtube.com",
    "https://vimeo.com",
    "https://www.disneyplus.com"
  ];
  const currentWebsite = window.location.href;
  const websiteIsTested = (() => {
    for (const stableWebsite of stableWebsites) {
      if (currentWebsite.includes(stableWebsite)) {
        return true;
      }
    }
    return false;
  })();

  // Required for Netflix hack
  const injectScript = function(func) {
    // See https://stackoverflow.com/questions/9515704/insert-code-into-the-page-context-using-a-content-script
    // This takes a function as an argument and injects + executes it in the current tab, with full access to the global window object
    var actualCode = "(" + func + ")();";
    var script = document.createElement("script");
    script.textContent = actualCode;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  };
  // Have we already injected our netflix hack?
  var netflixHackInjected = false;
  // Netflix-Hack: Used to enable seek in the video. Play & Pause don't require this hacky madness
  const netflixHack = () => {
    console.log("Injecting Netflix hack for seeking..");
    const getSeekHook = function() {
      const videoPlayer = window.netflix.appContext.state.playerApp.getAPI()
        .videoPlayer;
      return videoPlayer.getVideoPlayerBySessionId(
        videoPlayer.getAllPlayerSessionIds()[0]
      ).seek;
    };
    window.addEventListener("seekRequest", function(e) {
      var tick = e.detail * 1000;
      getSeekHook()(tick);
      console.log(
        `Jelly-Party: Netflix Context: Received seek request: ${tick}.`
      );
    });
  };

  // const loadChat = () => {
  //   function setupPage() {
  //     var chatDiv = document.createElement("div");
  //     chatDiv.id = "chatDiv";
  //     var chatButton = document.createElement("img");
  //     chatButton.id = "chatButton";
  //     chatButton.src =
  //       "data:image/png;base64,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";
  //     chatDiv.appendChild(chatButton);
  //     document.body.insertBefore(chatDiv, null);
  //     document
  //       .querySelector("#chatButton")
  //       .setAttribute("style", "width: 100%");
  //     document
  //       .querySelector("#chatDiv")
  //       .setAttribute(
  //         "style",
  //         "position: fixed; bottom: 20vh; right: 3em; height: 70px; width: 70px; z-index: 1000"
  //       );
  //   }
  // };

  class JellyParty {
    constructor(localPeerName, video) {
      this.localPeerName = localPeerName;
      this.video = video;
      this.magicLinkUsed = false;
      this.partyIdFromURL = window.location.search.match(/jellyPartyId=(.+)/);
      if (this.partyIdFromURL) {
        this.partyIdFromURL = this.partyIdFromURL[1];
        log.debug(`partyIdFromURL is ${this.partyIdFromURL}`);
      }
      this.updateClientStateInterval = null;
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
          video: outerThis.partyState ? outerThis.partyState : false
        };
        if (outerThis.partyIdFromURL && !outerThis.magicLinkUsed) {
          log.debug("Joining party once via magic link.");
          outerThis.magicLinkUsed = true;
          outerThis.joinParty(outerThis.partyIdFromURL);
        }
      });
    }

    updateMagicLink() {
      // Get "clean" wesite URL without jellyPartyId=..
      var websiteURL = window.location.href.replace(/[?&]jellyPartyId=.+/g, "");
      // Set the magic link
      this.partyState.magicLink =
        websiteURL +
        (websiteURL.includes("?") ? "&" : "?") +
        `jellyPartyId=${this.partyState.partyId}`;
    }

    updateClientState() {
      // Request a client state update
      // this is bound to window, see 'The "this" problem' @ https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setInterval
      try {
        // We craft a command to let the server know about our new client state
        var serverCommand = {
          type: "clientUpdate",
          data: {
            newClientState: {
              currentlyWatching: party.partyState.magicLink,
              favicon: party.partyState.favicon,
              videoState: {
                paused: party.video.paused,
                currentTime: party.video.currentTime
              }
            }
          }
        };
        party.ws.send(JSON.stringify(serverCommand));
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
                      currentTime: 0
                    }
                  }
                }
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
                if (msg.data.variant === "play") {
                  outerThis.playVideo(msg.data.tick);
                  notyf.success(`${msg.data.peer} played the video.`);
                } else if (msg.data.variant === "pause") {
                  outerThis.pauseVideo(msg.data.tick);
                  notyf.success(`${msg.data.peer} paused the video.`);
                } else if (msg.data.variant === "seek") {
                  outerThis.seek(msg.data.tick);
                  notyf.success(`${msg.data.peer} jumped to another location.`);
                }
                break;
              case "partyStateUpdate":
                if (
                  outerThis.partyState.peers.length >
                  msg.data.partyState.peers.length
                ) {
                  // Somebody left the party; Let's find out who
                  let previousUUIDs = outerThis.partyState.peers.map(
                    peer => peer.uuid
                  );
                  let newUUIDs = msg.data.partyState.peers.map(
                    peer => peer.uuid
                  );
                  let peerWhoLeft = outerThis.partyState.peers.filter(
                    peer =>
                      peer.uuid === _.difference(previousUUIDs, newUUIDs)[0]
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
                    peer => peer.uuid
                  );
                  let newUUIDs = msg.data.partyState.peers.map(
                    peer => peer.uuid
                  );
                  if (previousUUIDs.length === 0) {
                    // Let's show all peers in the party
                    for (const peer of msg.data.partyState.peers) {
                      notyf.success(`${peer.clientName} joined the party.`);
                    }
                  } else {
                    let peerWhoJoined = msg.data.partyState.peers.filter(
                      peer =>
                        peer.uuid === _.difference(newUUIDs, previousUUIDs)[0]
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
                  ...msg.data.partyState
                };
                break;
              case "setUUID":
                outerThis.uuid = msg.data.uuid;
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
      return this.remotePeers.filter(e => e.connection.peer != skipPeer);
    }

    requestPeersToPlay() {
      if (this.partyState.isActive) {
        var clientCommand = {
          type: "videoUpdate",
          data: {
            variant: "play",
            tick: this.video.currentTime
          }
        };
        var serverCommand = {
          type: "forward",
          data: { commandToForward: clientCommand }
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
            peer: this.localPeerName
          }
        };
        var serverCommand = {
          type: "forward",
          partyId: this.partyState.partyId,
          data: { commandToForward: clientCommand }
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
            peer: this.localPeerName
          }
        };
        var serverCommand = {
          type: "forward",
          partyId: this.partyState.partyId,
          data: { commandToForward: clientCommand }
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
        if (this.video.paused) {
          // At the least, disable forwarding for the play event.
          // The seek event will handle itself.
          eventsToProcess += 1;
          this.seek(tick);
          this.video.play();
        } else {
          log.debug(
            "Jelly-Party: Trying to play video, but video is already playing."
          );
        }
      }
    }

    pauseVideo(tick) {
      if (!this.video) {
        log.warn(
          "Jelly-Party: No video defined. I shouldn't be receiving commands.."
        );
      } else {
        if (this.video.paused) {
          log.debug(
            "Jelly-Party: Trying to pause video, but video is already paused."
          );
        } else {
          // At the least, disable forwarding for the pause event.
          // The seek event will handle itself.
          eventsToProcess += 1;
          this.seek(tick);
          this.video.pause();
        }
      }
    }

    seek(tick) {
      if (!this.video) {
        log.warn(
          "Jelly-Party: No video defined. I shouldn't be receiving commands.."
        );
      } else {
        const timeDelta = Math.abs(tick - video.currentTime);
        if (timeDelta > 0.5) {
          // Seeking is actually worth it. We're off by more than half a second.
          // Disable forwarding for the upcoming seek event.
          eventsToProcess += 1;
          if (window.location.href.includes("https://www.netflix.com")) {
            log.debug("Using netflix hack to seek..");
            if (!netflixHackInjected) {
              injectScript(netflixHack);
              netflixHackInjected = true;
            }
            window.dispatchEvent(
              new CustomEvent("seekRequest", { detail: tick })
            );
          } else {
            this.video.currentTime = tick;
          }
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
