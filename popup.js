$(function () {
    $('[data-toggle="tooltip"]').tooltip();
});

$("#button-joinnow").click(function () {
    // join new party
    console.log("Joining new party..");
});

$("#button-copy").click(function () { });

$(function () {
    new ClipboardJS(".btn");
});

class JellyfinParty {
    static getLocalPlaybackManager() {
        return {}
    }
    constructor(isAdmin) {
        this.isAdmin = isAdmin;
        this.localPlaybackManager = JellyfinParty.getLocalPlaybackManager();
        this.peers = []
        this.peerId = uuidv4();
        this.peer = new peerjs.Peer(this.peerId);

        peer.on('open', function (id) {
            console.log('My peer ID is: ' + id);
        });
    }
}

