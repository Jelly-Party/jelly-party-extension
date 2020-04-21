/* global log, Notyf, _, generateRoomWithoutSeparator */
if (typeof scriptAlreadyInjected === "undefined") {
  // scriptAlreadyInjected is undefined, therefore let's load everything
  var scriptAlreadyInjected = true;
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
  //   function setupPage () {
  //     // create a new div element
  //     var bodyDiv = document.createElement("div");
  //     var chatDiv = document.createElement("div");
  //     var chatContent = document.createTextNode("Hi there and greetings!");
  //     // add the text node to the newly created div
  //     newDiv.appendChild(newContent);
  //     document.body.insertBefore(newDiv, null);
  //   }

  //   while (oldParent.firstChild) newParent.appendChild(oldParent.firstChild);

  //   elt.style.cssText = "color: blue; border: 1px solid black";

  // }

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
          favicon: document.querySelector("link[rel=icon]")?.href
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

    updateCurrentlyWatching() {
      // Inform the server what URL we're currently on
      var serverCommand = {
        type: "clientUpdate",
        data: {
          newClientState: {
            currentlyWatching: this.partyState.magicLink
          }
        }
      };
      this.ws.send(JSON.stringify(serverCommand));
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
                    favicon: outerThis.partyState.favicon
                  }
                }
              })
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
                log.debug(
                  "Jelly-Party: Received party state update. New party state is:"
                );
                log.debug(outerThis.partyState);
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
            party.updateCurrentlyWatching();
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
  // scriptAlreadyInject in window range -> let's skip injecting script again.
  log.debug(
    "Jelly-Party: No need to inject script again. Skipping script injection."
  );
  // We must still refresh the user options
  chrome.storage.sync.get(["options"], function(result) {
    party.localPeerName = result.options.localPeerName;
  });
}
