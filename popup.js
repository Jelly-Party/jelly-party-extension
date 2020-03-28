var partyOverview;
$(function () {
    // enable clipboard for on buttons
    new ClipboardJS(".btn");
    // Get options
    var options;
    chrome.storage.sync.get(["options"], function (result) {
        options = result.options;
        // Create party & initialize Vue frontend
        partyOverview = new Vue({
            el: "#partyOverview",
            data: { isActive: false, peers: [], me: { name: options.name, admin: false, id: "" } },
            methods: {
                startParty: function () {
                    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                        console.log("Trying to start a new party.");
                        chrome.tabs.sendMessage(tabs[0].id, { command: "startParty" }, function (response) {
                            partyOverview.isActive = true; // to immediately show "Leave Party"-button
                            // getState will update peers once they have joined
                        });
                    });
                },
                joinParty: function (Id) { 
                    //tbd
                },
                leaveParty: function () {
                    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                        chrome.tabs.sendMessage(tabs[0].id, { command: "leaveParty" }, function (response) {
                            partyOverview.isActive = false;
                            partyOverview.peers = [];
                        });
                    });
                },
                getState: function () {
                    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                        chrome.tabs.sendMessage(tabs[0].id, { command: "getState" }, function (response) {
                            partyOverview.isActive = response.data.isActive;
                            partyOverview.peers = response.data.peers;
                        });
                    });
                }
            }
        });
    });
    // Periodically poll the content script for the new state
    window.setInterval(() => {
        partyOverview.getState();
    }, 1000);
});

