class JellyfinParty {
    constructor(localPeerName, video) {
        this.localPeerName = localPeerName;
        this.video = video;
        this.remotePeers = []
        this.localPeerId = uuidv4();
        this.partyState = { isActive: false, peers: [], me: this.localPeerName }
    }

    startParty() {
        if (this.partyState.isActive) {
            console.log("Jelly-party: Error. Cannot start a party while still in an active party.")
        } else {
            this.admin = true;
            this.localPeer = new peerjs.Peer(this.localPeerId);
            this.partyState.isActive = true;
            this.connectToSignalingServer().then(() => {
                this.handleConnections();
            });
        }
    }

    joinParty(partyId) {
        if (this.partyState.isActive) {
            console.log("Jelly-party: Error. Cannot join a party while still in an active party.")
        } else {
            this.admin = false;
            this.remotePeers = []
            this.localPeerId = uuidv4();
            this.localPeer = new peerjs.Peer(this.localPeerId);
            this.partyState.isActive = true;
            this.connectToSignalingServer().then(() => {
                this.handleConnections();
            });
            // We must connect to the admin of the party we wish to join
            var conn = peer.connect(partyId);
            this.remotePeers.push({ name: conn.label, admin: conn.metadata.admin, connection: conn });
        }
    }

    leaveParty() {
        this.localPeer.destroy();
        this.partyState.isActive = false;
    }

    async connectToSignalingServer() {
        this.localPeer.on('open', function (id) {
            console.log('My peer Id is: ' + id);
        });
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
                console.log("Unknown command:");
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
        switch (this.video.paused) {
            case true:
                this.video.play();
                break;
            case false:
                this.video.pause();
                break;
        }
    }

    seek(tick) {
        this.video.currentTime = tick;
    }

    handleConnections() {
        var rc = this.remotePeers;
        var outerThis = this;
        this.localPeer.on('connection', function (conn) {
            rc.push({ name: conn.label, admin: conn.metadata.admin, connection: conn });
            conn.on('open', function () {
                // New connection opened. Must update party status
                outerThis.updatepartyState();
                conn.on('data', function (data) {
                    command = JSON.parse(data)
                    outerThis.receiveCommand(conn.peer, command);
                });
                conn.on('close', function () {
                    console.log("Connection was closed")
                    rc = rc.filter((e) => {
                        return e.connection.peer != conn.peer;
                    });
                    // Connection closed. Must update party status
                    outerThis.updatepartyState();
                });
            });
        });
    }

    updatepartyState() {
        // Let's check if this party is still active
        this.partyState.isActive = Boolean(this.remotePeers.length)
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
        if (this.admin) {
            var command = JSON.stringify({ type: "statusUpdate", data: this.partyState })
            for (const remotePeer of this.remotePeers) {
                remotePeer.connection.send(command);
            }

        }
    }
}

// Define global variables
var video, party;

var findVideoInterval = setInterval(() => {
    // since, oddly enough, the event listener for hashchange doesn't seem to function reliably, 
    // we must use an interval "listener". So much for event based programming......
    if (location.hash === "#!/videoosd.html") {
        if (!video) {
            clearInterval(findVideoInterval);
            video = document.querySelector("video");
            party = new JellyfinParty(true, video);
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
    } else {
        console.log("Jelly-Party: I'll be waiting for a video..")
    }
}, 1000);

chrome.storage.sync.get(["options"], function (result) {
    party = new JellyfinParty(result.options.name, video);
})

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
                party.leaveParty();
                break;
            case "getState":
                sendResponse({ status: "success", data: party.partyState })
                break;
        }
    });