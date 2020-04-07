
if (typeof scriptAlreadyInjected === 'undefined') {
    // scriptAlreadyInjected is undefined, therefore let's load everything
    var scriptAlreadyInjected = true;
    var DEBUG = true;
    if (DEBUG) {
        log.log("Jelly-Party: Injecting Content Script!");
        log.enableAll();
    } else {
        log.setDefaultLevel("info");
    }

    var justReceivedVideoUpdateRequest;

    class JellyParty {
        constructor(localPeerName, video) {
            this.localPeerName = localPeerName;
            this.video = video;
            this.resetPartyState();
            log.debug("Jelly-Party: Global JellyParty Object");
            log.debug(this);
        }

        resetPartyState() {
            this.partyState = { isActive: false, partyId: "", peers: [], wsIsConnected: false }
        }

        startParty() {
            this.connectToPartyHelper();
        }

        joinParty(partyId) {
            this.connectToPartyHelper(partyId);
        }

        connectToPartyHelper(partyId = "") {
            // Start a new party if no partyId is given, else join an existing party
            var start = partyId ? false : true;
            log.info(`Jelly-Party: ${start ? "Starting a new party." : "Joining a new party."}`);
            if (this.partyState.isActive) {
                log.error(`Jelly-Party: Error. Cannot ${start ? "start" : "join"} a party while still in an active party.`)
            } else {
                this.admin = Boolean(start);
                this.partyState.isActive = true;
                this.partyState.partyId = start ? uuidv4() : partyId;
                this.ws = new WebSocket("wss://ws.jelly-party.com:8080");
                var outerThis = this;
                this.ws.onopen = function (event) {
                    log.debug("Connected to Jelly-Party Websocket.");
                    outerThis.partyState.wsIsConnected = true;
                    outerThis.ws.send(JSON.stringify({ type: "join", clientName: outerThis.localPeerName, partyId: outerThis.partyState.partyId }));
                };
                this.ws.onmessage = function (event) {
                    var msg = JSON.parse(event.data);
                    switch (msg.type) {
                        case "videoUpdate":
                            justReceivedVideoUpdateRequest = true;
                            if (msg.data.variant === "play") {
                                outerThis.playVideo();
                            } else if (msg.data.variant === "pause") {
                                outerThis.pauseVideo();
                            }
                            else if (msg.data.variant === "seek") {
                                outerThis.seek(msg.data.tick);
                            }
                            break;
                        case "partyStateUpdate":
                            outerThis.partyState = { ...outerThis.partyState, ...msg.data.partyState };
                            log.debug("Received party state update. New party state is:");
                            log.debug(outerThis.partyState);
                            break;
                        default:
                            log.debug(`Received unknown message: ${JSON.stringify(msg)}`)
                    }
                }
                this.ws.onclose = function (event) {
                    outerThis.partyState.wsIsConnected = false;
                }
            }
        }

        leaveParty() {
            log.info("Jelly-Party: Leaving current party.");
            this.ws.close();
            this.resetPartyState();
        }

        filterPeer(skipPeer) {
            return this.remotePeers.filter(e => e.connection.peer != skipPeer);
        }

        requestPeersToPlay() {
            if (this.partyState.isActive) {
                var clientCommand = { type: "videoUpdate", data: { variant: "play", tick: this.video.currentTime } };
                var serverCommand = { type: "forward", partyId: this.partyState.partyId, data: { commandToForward: clientCommand } };
                this.ws.send(JSON.stringify(serverCommand));
            }
        }

        requestPeersToPause() {
            if (this.partyState.isActive) {
                var clientCommand = { type: "videoUpdate", data: { variant: "pause", tick: this.video.currentTime } };
                var serverCommand = { type: "forward", partyId: this.partyState.partyId, data: { commandToForward: clientCommand } };
                this.ws.send(JSON.stringify(serverCommand));
            }
        }

        requestPeersToSeek() {
            if (this.partyState.isActive) {
                var clientCommand = { type: "videoUpdate", data: { variant: "seek", tick: this.video.currentTime } };
                var serverCommand = { type: "forward", partyId: this.partyState.partyId, data: { commandToForward: clientCommand } };
                this.ws.send(JSON.stringify(serverCommand));
            }
        }

        playVideo() {
            if (!this.video) {
                log.warn("Jelly-Party: No video defined. I shouldn't be receiving commands..");
            } else {
                if (this.video.paused) {
                    this.video.play();
                } else {
                    log.debug("Trying to play video, but video is already playing.");
                }
            }
        }

        pauseVideo() {
            if (!this.video) {
                log.warn("Jelly-Party: No video defined. I shouldn't be receiving commands..");
            } else {
                if (this.video.paused) {
                    log.debug("Trying to pause video, but video is already paused.");
                } else {
                    this.video.pause();
                }
            }
        }

        seek(tick) {
            if (!this.video) {
                log.warn("Jelly-Party: No video defined. I shouldn't be receiving commands..");
            } else {
                this.video.currentTime = tick;
            }
        }
    }


    // Define global variables
    var video, party, videoHelper, findVideoInterval;
    chrome.storage.sync.get(["options"], function (result) {
        party = new JellyParty(result.options.name, video);
        chrome.runtime.onMessage.addListener(
            function (request, sender, sendResponse) {
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
                    case "heartBeat":
                        // Let's inform the content script that we're alive
                        sendResponse({ status: "success", isAlive: true });
                }
            });

        videoHelper = () => {
            if (!video) {
                log.debug("Jelly-Party: Scanning for video to attach to.");
                video = document.querySelector("video");
                if (video) {
                    party.video = video;
                    clearInterval(findVideoInterval);
                    log.info("Jelly-Party: Found video. Attaching to video..");
                    video.addEventListener('pause', (_) => {
                        log.debug({ type: "pause", tick: video.currentTime });
                        if (justReceivedVideoUpdateRequest) {
                            // Somebody else is asking us to pause
                            // We must not forward the event, otherwise we'll end up in an infinite "pause now" loop
                            log.debug("Not asking party to act - we did not generate the event. Event was caused by a peer.")
                        } else {
                            // We triggered the PlayPause button, so forward it to everybody
                            // Sync, then trigger playPause
                            party.requestPeersToSeek();
                            party.requestPeersToPause();
                        }
                        justReceivedVideoUpdateRequest = false;
                    });
                    video.addEventListener('play', (_) => {
                        log.debug({ type: "play", tick: video.currentTime });
                        if (justReceivedVideoUpdateRequest) {
                            // Somebody else is asking us to play
                            // We must not forward the event, otherwise we'll end up in an infinite "play now" loop
                            log.debug("Not asking party to act - we did not generate the event. Event was caused by a peer.")
                        } else {
                            // We triggered the PlayPause button, so forward it to everybody
                            // Sync, then trigger playPause
                            party.requestPeersToSeek();
                            party.requestPeersToPlay();
                        }
                        justReceivedVideoUpdateRequest = false;
                    });
                    video.addEventListener('seeking', (event) => {
                        log.debug({ type: "seek", tick: video.currentTime });
                        if (justReceivedVideoUpdateRequest) {
                            // Somebody else is asking us to seek
                            // We must not forward the event, otherwise we'll end up in an infinite seek loop
                            log.debug("Not asking party to act - we did not generate the event. Event was caused by a peer.")
                        } else {
                            // We triggered the seek, so forward it to everybody
                            party.requestPeersToSeek();
                        }
                        justReceivedVideoUpdateRequest = false;
                    })
                }
            }
            else {
                log.debug("Jelly-Party: Checking if video source has changed..");
            }
        }
        findVideoInterval = setInterval(videoHelper, 1000);
    })

    window.onhashchange = () => {
        log.debug("Jelly-Party: Hashchange detected. Rescanning for video");
        video = undefined;
        findVideoInterval = setInterval(videoHelper, 1000);
    }

} else {
    // scriptAlreadyInject in window range -> let's skip injecting script again.
    log.debug("No need to inject script again. Skipping script injection.")
}


