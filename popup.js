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
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, { command: "startParty" }, function (response) {
                        console.log(response.farewell);
                    });
                });
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
        console.log("Requesting content script to join a new party..");
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { command: "startNewParty" }, function (response) {
                console.log(response.status);
            });
        });
    });
    // Handle button-start-party click
    $("#button-start-party").click(function () {
        console.log("Starting a new party..");
        partyOverview.startNewParty();
    })
    // Periodically poll the content script for the new state
});

window.setInterval(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { greeting: "hello" }, function (response) {
            console.log(response.farewell);
        });
    });
}, 1000)

class JellyfinParty {
    constructor(admin, makeDummyPeers) {
        this.admin = admin;
        this.remotePeers = []
        this.localPeerId = uuidv4();
        this.localPeerName = "guest";
        chrome.storage.sync.get(["options"], function (result) {
            this.localPeerName = result.options.name ? result.options.name : "guest";
        });
        if (makeDummyPeers) {
            this.makeDummyPeers();
        }
    }

    makeDummyPeers() {
        var s = (_) => console.log("Fake sending to test peer..");
        this.remotePeers = [
            { name: "dummy1", admin: false, connection: { peer: "testPeer1", send: s } },
            { name: "dummy2", admin: false, connection: { peer: "testPeer2", send: s } },
            { name: "dummy3", admin: false, connection: { peer: "testPeer3", send: s } }
        ]
    }
}