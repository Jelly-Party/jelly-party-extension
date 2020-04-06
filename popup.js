var partyOverview;
console.log(`We're on fire! Injecting script for ${window.location.href}`);
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
            data: { isActive: false, partyId: "", peers: [], websocketConnection: false },
            methods: {
                startParty: function () {
                    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                        console.log("Jelly-Party: Trying to start a new party.");
                        chrome.tabs.sendMessage(tabs[0].id, { command: "startParty" }, function (response) {
                            partyOverview.isActive = true; // to immediately show "Leave Party"-button
                            // getState will update peers once they have joined
                            window.setTimeout(() => {
                                partyOverview.getState();
                            }, 100);
                        });
                    });
                },
                joinParty: function (Id) {
                    // Let's first validate the party id
                    var id = $("#party-join-textarea")[0].value;
                    if (id.length === 36) {
                        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                            console.log("Jelly-Party: Trying to join an existing party.");
                            chrome.tabs.sendMessage(tabs[0].id, { command: "joinParty", data: { partyId: id } }, function (response) {
                                partyOverview.isActive = true; // to immediately show "Leave Party"-button
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
                            partyOverview.isActive = response.data.isActive;
                            partyOverview.partyId = response.data.partyId;
                            partyOverview.peers = response.data.peers;
                            partyOverview.websocketConnection = response.data.wsIsConnected;
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
        partyOverview.getState();
    }, 1000);
});