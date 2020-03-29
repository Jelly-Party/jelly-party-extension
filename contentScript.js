class JellyParty {
    constructor(localPeerName, video) {
        this.localPeerName = localPeerName;
        this.video = video;
        this.remotePeers = []
        this.localPeerId = uuidv4();
        this.resetPartyState();
    }

    resetPartyState() {
        delete this.partyState;
        this.partyState = { isActive: false, partyId: "", peers: [], me: { name: this.localPeerName, admin: false, id: this.localPeerId } }
    }

    startParty() {
        console.log("Jelly-Party: Starting a new party.");
        if (this.partyState.isActive) {
            console.log("Jelly-Party: Error. Cannot start a party while still in an active party.")
        } else {
            this.admin = true;
            this.localPeer = new peerjs.Peer(this.localPeerId);
            this.setupConnectionListeners();
            this.partyState.isActive = true;
            this.partyState.partyId = this.partyState.me.id;
            this.partyState.me.admin = true;
        }
    }

    getPartyState() {
        return this.partyState;
    }

    joinParty(partyId) {
        console.log("Jelly-Party: Joining a party.");
        if (this.partyState.isActive) {
            console.log("Jelly-Party: Error. Cannot join a party while still in an active party.")
        } else {
            this.admin = false;
            this.localPeer = new peerjs.Peer(this.localPeerId);
            this.setupConnectionListeners();
            this.partyState.isActive = true;
            this.partyState.partyId = partyId;
            // We must connect to the admin of the party we wish to join
            this.localPeer.connect(partyId, { metadata: { peerName: this.localPeerName } });
        }
    }

    leaveParty() {
        console.log("Jelly-Party: Leaving current party.");
        this.localPeer.destroy();
        this.resetPartyState();
    }

    filterPeer(skipPeer) {
        return this.remotePeers.filter(e => e.connection.peer != skipPeer);
    }

    receiveCommand(initiator, command) {
        // If we're admin, forward command to all peers except the initiator
        if (this.admin) {
            var relevantRemotePeers = this.filterPeer(initiator);
            for (const remotePeer of relevantRemotePeers) {
                remotePeer.connection.send(command)
            }
        }
        // Next exectute the respective command
        switch (command.type) {
            case "playPause":
                // synchronize, then toggle playPause
                this.seek(command.tick);
                this.togglePlayPause();
                break;
            case "seek":
                // synchronize only
                this.seek(command.tick);
                break;
            case "statusUpdate":
                // only Users should receive this command! The admin knows about the
                // party state at all times, since it handles all RTC connections.
                this.partyState.peers = command.data.peers;
                break;
            default:
                console.log("Jelly-Party: Unknown command:");
                console.log(command);
        }
    }

    requestPeersToSeek() {
        var command = JSON.stringify({ type: "seek", tick: this.video.currentTime });
        // If we're admin, forward seek to all peers
        this.requestForwarder(command);
    }

    requestPeersToPlayPause() {
        var command = JSON.stringify({ type: "playPause", tick: this.video.currentTime })
        // If we're admin, forward playPause to all peers
        this.requestForwarder(command);
    }

    requestForwarder(command) {
        // Begin by checking if there's anybody to forward to..
        if (this.remotePeers.length) {
            if (this.admin) {
                for (const remotePeer of this.remotePeers) {
                    remotePeer.connection.send(command)
                }
            }
            else {
                // we're a User and must ask the admin to playPause
                var adminPeer = this.remotePeers.filter(e => e.admin);
                adminPeer.connection.send(command)
            }
        }
    }

    togglePlayPause() {
        if (!this.video) {
            console.log("Jelly-Party: No video defined. I shouldn't be receiving commands..");
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
            console.log("Jelly-Party: No video defined. I shouldn't be receiving commands..");
        } else {
            this.video.currentTime = tick;
        }
    }

    setupConnectionListeners() {
        console.log("Jelly-Party: Setting up connection handling");
        var remotePeers = this.remotePeers;
        var outerThis = this;
        this.localPeer.on('open', function (id) {
            console.log('Jelly-Party: Connected to signaling server. My peer Id is: ' + id);
        });
        this.localPeer.on('connection', function (conn) {
            remotePeers.push({ name: conn.metadata.peerName, admin: !this.admin, connection: conn });
            conn.on('open', function () {
                // New connection opened. Must update party status
                console.log("Jelly-Party: New connection opened");
                outerThis.updatepartyState();
                conn.on('data', function (data) {
                    command = JSON.parse(data)
                    outerThis.receiveCommand(conn.peer, command);
                });
                conn.on('close', function () {
                    console.log("Jelly-Party: Connection was closed");
                    remotePeers = remotePeers.filter((e) => {
                        return e.connection.peer != conn.peer;
                    });
                    // Connection closed. Must update party status
                    if (remotePeers.length) {
                        // There are still peers in the party
                        outerThis.updatepartyState();
                    } else {
                        // Admin cannot broadcast the partyState anymore.
                        // The party is empty: Users + Admins must reset their party state
                        this.resetPartyState();
                    }
                });
            });
        });
    }

    updatepartyState() {
        // Only the admin can update the party status, since he keeps track of all connections
        // He will then broadcast updates to all his peers.
        if (this.admin) {
            // Let's check if this party is still active
            this.partyState.isActive = Boolean(this.remotePeers.length);
            // Next compute the new party status
            var peers = []
            for (const remotePeer of this.remotePeers) {
                // For the User, this will be only the admin or nobody (no party)
                // For the Admin, this will be all users or nobody (no party)
                peers.push({ name: remotePeer.name, admin: remotePeer.admin });
            }
            // We must make sure to update our own party state
            this.partyState.peers = peers;
            // If we're admin, we must push out the party status to all peers
            var command = JSON.stringify({ type: "statusUpdate", data: this.partyState })
            for (const remotePeer of this.remotePeers) {
                remotePeer.connection.send(command);
            }
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
                    sendResponse({ status: "success", data: party.getPartyState() });
                    break;
            }
        });
    var findVideoInterval = setInterval(() => {
        // since, oddly enough, the event listener for hashchange doesn't seem to function reliably, 
        // we must use an interval "listener". So much for event based programming......
        if (location.hash === "#!/videoosd.html") {
            if (!video) {
                console.log("Jelly-Party: Searching for video..");
                video = document.querySelector("video");
                if (video) {
                    party.video = video;
                    clearInterval(findVideoInterval);
                    console.log("Jelly-Party: Found video. Attaching to video..");
                    function playPause() {
                        console.log({ type: "playPause", tick: video.currentTime });
                        party.requestPeersToPlayPause();
                    }
                    function seek() {
                        console.log({ type: "seek", tick: video.currentTime });
                        party.requestPeersToSeek();
                    }
                    video.addEventListener('pause', (event) => {
                        playPause();
                    })
                    video.addEventListener('play', (event) => {
                        playPause();
                    })
                    video.addEventListener('seeking', (event) => {
                        seek();
                    })
                }
            }
        } else {
            console.log("Jelly-Party: I'll be waiting for a video..");
        }
    }, 1000);
})






