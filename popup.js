$(function () {
    // enable clipboard for on buttons
    new ClipboardJS(".btn");
    // Get options
    var options = chrome.storage.sync.get(["options"], function (result) {
        console.log(result);
    });
    // Create party & initialize Vue frontend
    var partyOverview = new Vue({
        el: "#partyOverview",
        data: new JellyfinParty(true, true),
        methods: {
            startNewParty: function () {
                this.remotePeers = [];
            }
        }
    })
    // Let's reset the party when options are changed
    chrome.storage.onChanged.addListener(function (changes, namespace) {
        partyOverview.startNewParty();
    });
    // Enable bootstrap tooltips
    $('[data-toggle="tooltip"]').tooltip();
    // Handle button-copy click
    $("#button-copy").click(function () { });
    // Handle button-join-party click
    $("#button-join-party").click(function () {
        console.log("Joining new party..");
    });
    // Handle button-start-party click
    $("#button-start-party").click(function () {
        console.log("Starting a new party..");
        partyOverview.startNewParty();
    })
});

class JellyfinParty {
    constructor(localPeerName, admin, makeDummyPeers) {
        this.admin = admin;
        this.remotePeers = []
        this.localPeerId = uuidv4();
        this.localPeerName = "guest";
        this.localPeer = new peerjs.Peer(this.localPeerId);
        chrome.storage.sync.get(["options"], function (result) {
            this.localPeerName = result.options.name;
        });
        if (makeDummyPeers) {
            this.makeDummyPeers();
        }
        this.connectToSignalingServer().then(() => {
            this.handleConnections();
        });
    }

    makeDummyPeers() {
        var s = (_) => console.log("Fake sending to test peer..");
        this.remotePeers = [
            { name: "dummy1", admin: false, connection: { peer: "testPeer1", send: s } },
            { name: "dummy2", admin: false, connection: { peer: "testPeer2", send: s } },
            { name: "dummy3", admin: false, connection: { peer: "testPeer3", send: s } }
        ]
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
            for (var peerIndex in relevantRemotePeers) {
                var remotePeer = relevantRemotePeers[peerIndex]
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
            default:
                console.log("Unknown command:");
                console.log(command);
        }
    }

    requestSeek(tick) {
        var command = JSON.stringify({ type: "seek", tick: tick });
        // If we're admin, forward playPause to all peers
        if (admin) {
            for (var peerIndex in this.remotePeers) {
                var remotePeer = this.remotePeers[peerIndex].connection
                remotePeer.connection.send(command)
            }
        }
        else {
            // we're a User and must ask the admin to playPause        
            var admin = relevantRemotePeers.filter(e => e.admin);
            admin.connection.send(command)
        }
    }

    requestPlayPause(tick) {
        var command = JSON.stringify({ type: "playPause", tick: tick })
    }

    togglePlayPause() {

    }

    seek() {

    }

    handleConnections() {
        var rc = this.remotePeers;
        var admin = this.admin;
        var outerThis = this;
        this.localPeer.on('connection', function (conn) {
            console.log(rc);
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
    }
}

