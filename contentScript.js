class JellyfinParty {
    constructor(admin, localPeerName, video) {
        this.admin = admin;
        this.video = video;
        this.remotePeers = []
        this.localPeerId = uuidv4();
        this.localPeerName = localPeerName;
        this.localPeer = new peerjs.Peer(this.localPeerId);
        this.partyStatus = [{ name: localPeerName, admin: this.admin }];
        this.connectToSignalingServer().then(() => {
            this.handleConnections();
        });
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
                // only Users should receive this command!
                break;
            default:
                console.log("Unknown command:");
                console.log(command);
        }
    }

    requestPeersToSeek(tick) {
        var command = JSON.stringify({ type: "seek", tick: tick });
        // If we're admin, forward seek to all peers
        this.requestForwarder(command);
    }

    requestPeersToPlayPause(tick) {
        var command = JSON.stringify({ type: "playPause", tick: tick })
        // If we're admin, forward playPause to all peers
        this.requestForwarder(command);
    }

    requestForwarder(command) {
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
                conn.on('data', function (data) {
                    command = JSON.parse(data)
                    outerThis.receiveCommand(conn.peer, command);
                });
                conn.on('close', function () {
                    console.log("Connection was closed")
                    rc = rc.filter((e) => {
                        return e.connection.peer != conn.peer;
                    });
                    console.log(rc)
                });
            });
        });
        // If we're admin, we must periodically push out the party status to all peers
        if (this.admin) {
            window.setTimeout(() => {
                var status = [{ name: localPeerName, admin: this.admin }];
                for (const remotePeer of this.remotePeers) {
                    status.push({ name: remotePeer.name, admin: remotePeer.admin });
                }
                var command = JSON.stringify({ type: "statusUpdate", data: status })
                for (const remotePeer of this.remotePeers) {
                    remotePeer.connection.send(command);
                }
            }, 2000)
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
                chrome.runtime.sendMessage({ type: "playPause", tick: video.currentTime }, function (response) {
                    console.log(response);
                });
            }
            function seek() {
                console.log({ type: "seek", tick: video.currentTime });
                chrome.runtime.sendMessage({ type: "seek", tick: video.currentTime }, function (response) {
                    console.log(response);
                });
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

party = new JellyfinParty(true, video);

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        switch (request.command) {
            case "startParty":
                // Start an entirely new party
                party = new JellyfinParty(true, video);
                sendResponse({ status: "success" })
                break;
            case "joinParty":
                // Join an existing party

                break;
            case "leaveParty":
                break;
            case "getState":
                break;
        }
    });