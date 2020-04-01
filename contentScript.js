var DEBUG = true;
if (DEBUG) {
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
        this.partyState = { isActive: false, partyId: "", peers: [] }
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
            this.ws = new WebSocket("wss://www.jelly-party.com:8080");
            var outerThis = this;
            this.ws.onopen = function (event) {
                log.debug("Connected to Jelly-Party Websocket.");
                outerThis.ws.send(JSON.stringify({ type: "join", clientName: outerThis.localPeerName, partyId: outerThis.partyState.partyId }));
            };
            this.ws.onmessage = function (event) {
                var msg = JSON.parse(event.data);
                switch (msg.type) {
                    case "videoUpdate":
                        justReceivedVideoUpdateRequest = true;
                        if (msg.data.variant === "playPause") {
                            outerThis.togglePlayPause();
                        } else if (msg.data.variant === "seek") {
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

    requestPeersToSeek() {
        if (this.partyState.isActive) {
            var clientCommand = { type: "videoUpdate", data: { variant: "seek", tick: this.video.currentTime } };
            var serverCommand = { type: "forward", partyId: this.partyState.partyId, data: { commandToForward: clientCommand } };
            this.ws.send(JSON.stringify(serverCommand));
        }
    }

    requestPeersToPlayPause() {
        if (this.partyState.isActive) {
            var clientCommand = { type: "videoUpdate", data: { variant: "playPause", tick: this.video.currentTime } };
            var serverCommand = { type: "forward", partyId: this.partyState.partyId, data: { commandToForward: clientCommand } };
            this.ws.send(JSON.stringify(serverCommand));
        }

    }

    togglePlayPause() {
        if (!this.video) {
            log.warn("Jelly-Party: No video defined. I shouldn't be receiving commands..");
        } else {
            switch (this.video.paused) {
                case true:
                    this.video.play();
                    break;
                case false:
                    this.video.pause();
                    break;
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
var video, party;
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
            }
        });

    var findVideoInterval = setInterval(() => {
        // since, oddly enough, the event listener for hashchange doesn't seem to function reliably, 
        // we must use an interval "listener". So much for event based programming......
        if (location.hash === "#!/videoosd.html") {
            if (!video) {
                log.debug("Jelly-Party: Searching for video..");
                video = document.querySelector("video");
                if (video) {
                    party.video = video;
                    clearInterval(findVideoInterval);
                    log.info("Jelly-Party: Found video. Attaching to video..");
                    function requestPlayPause() {
                        log.debug({ type: "playPause", tick: video.currentTime });
                        party.requestPeersToPlayPause();
                    }
                    function requestSeek() {
                        log.debug({ type: "seek", tick: video.currentTime });
                        party.requestPeersToSeek();
                    }
                    const playPauseHandler = (_) => {
                        if (justReceivedVideoUpdateRequest) {
                            // Somebody else is asking us to pause
                            // We must not forward the event, otherwise we'll end up in an infinite PlayPause loop
                            log.debug("Not asking party to act - we did not generate the event. Event was caused by a peer.")
                        } else {
                            // We triggered the PlayPause button, so forward it to everybody
                            // Sync, then trigger playPause
                            requestSeek();
                            requestPlayPause();
                        }
                        justReceivedVideoUpdateRequest = false;
                    }
                    video.addEventListener('pause', playPauseHandler);
                    video.addEventListener('play', playPauseHandler);
                    video.addEventListener('seeking', (event) => {
                        if (justReceivedVideoUpdateRequest) {
                            // Somebody else is asking us to seek
                            // We must not forward the event, otherwise we'll end up in an infinite seek loop
                            log.debug("Not asking party to act - we did not generate the event. Event was caused by a peer.")
                        } else {
                            // We triggered the seek, so forward it to everybody
                            requestSeek();
                        }
                        justReceivedVideoUpdateRequest = false;
                    })
                }
            }
        } else {
            log.debug("Jelly-Party: I'll be waiting for a video..");
        }
    }, 1000);
})



