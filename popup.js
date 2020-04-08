var partyOverview;
chrome.tabs.executeScript({
    file: 'js-libs/uuidv4.min.js'
});
chrome.tabs.executeScript({
    file: 'js-libs/loglevel.min.js'
});
chrome.tabs.executeScript({
    file: 'contentScript.js'
});

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
            data: { isActive: false, partyId: "", peers: [], websocketConnection: false, lastPartyId: "", websiteIsTested: false, currentlyWatching: "Nothing" },
            methods: {
                startParty: function () {
                    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                        console.log("Jelly-Party: Trying to start a new party.");
                        chrome.tabs.sendMessage(tabs[0].id, { command: "startParty" }, function (response) {
                            // getState will update peers once they have joined
                            window.setTimeout(() => {
                                partyOverview.getState();
                            }, 100);
                        });
                    });
                },
                joinParty: function () {
                    // Let's first validate the party id
                    var id = $("#party-join-textarea")[0].value;
                    if (id.length === 36) {
                        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                            console.log("Jelly-Party: Trying to join an existing party.");
                            chrome.tabs.sendMessage(tabs[0].id, { command: "joinParty", data: { partyId: id } }, function (response) {
                                // getState will update peers once they have joined
                                window.setTimeout(() => {
                                    partyOverview.getState();
                                }, 100);
                            });
                        });
                    } else {
                        console.log("Jelly-Party: Invalid Id..");
                        // TODO:
                        // close current modal
                        // show new modal to inform user that Id is not valid
                    }

                },
                rejoinParty: function () {
                    if (partyOverview.lastPartyId) {
                        console.log(`Rejoing last party with Party-Id: ${partyOverview.lastPartyId}`);
                        console.log(`partyOverview.lastPartyId is ${partyOverview.lastPartyId}`);
                        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                            console.log("Jelly-Party: Trying to rejoin previous party.");
                            chrome.tabs.sendMessage(tabs[0].id, { command: "joinParty", data: { partyId: partyOverview.lastPartyId } }, function (response) {
                                // getState will update peers once they have joined
                                window.setTimeout(() => {
                                    partyOverview.getState();
                                }, 100);
                            });
                        });
                    } else {
                        // If there's no previous party, we'll just start a new one
                        partyOverview.startParty();
                    }
                },
                leaveParty: function () {
                    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                        chrome.tabs.sendMessage(tabs[0].id, { command: "leaveParty" }, function (response) {
                            partyOverview.isActive = false;
                            partyOverview.peers = [];
                            window.setTimeout(() => {
                                partyOverview.getState();
                            }, 100);
                        });
                    });
                },
                getState: function () {
                    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                        chrome.tabs.sendMessage(tabs[0].id, { command: "getState" }, function (response) {
                            console.log(response)
                            partyOverview.isActive = response.data.isActive;
                            partyOverview.partyId = response.data.partyId;
                            partyOverview.peers = response.data.peers;
                            partyOverview.websocketConnection = response.data.wsIsConnected;
                            partyOverview.lastPartyId = response.data.lastPartyId;
                            partyOverview.websiteIsTested = response.data.websiteIsTested;
                            partyOverview.currentlyWatching = response.data.currentlyWatching;
                        });
                    });
                }
            }
        });
        // Initially poll the state once
        partyOverview.getState();
    });
    // Periodically poll the content script for the new state
    window.setInterval(() => {
        console.log("Querying party state");
        $('[data-toggle="tooltip"]').tooltip();
        partyOverview.getState();
    }, 1000);
});