import store from "@/store.js";
import router from "@/router/index.js";

function startParty() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    console.log("Jelly-Party: Trying to start a new party.");
    chrome.tabs.sendMessage(tabs[0].id, { command: "startParty" }, function() {
      store.updateState({ isActive: true });
      getState();
    });
  });
}

function joinParty(id) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    console.log("Jelly-Party: Trying to join an existing party.");
    chrome.tabs.sendMessage(
      tabs[0].id,
      { command: "joinParty", data: { partyId: id } },
      function() {
        // getState will update peers once they have joined
        getState();
      }
    );
  });
}

function leaveParty() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { command: "leaveParty" }, function() {
      getState();
    });
  });
}

function getState() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { command: "getState" }, function(
      response
    ) {
      store.updateState(response.data);
      console.log("New state is");
      console.log(store.state);
    });
  });
}

function setOptions(localPeerName) {
  var options = { localPeerName: localPeerName ? localPeerName : "guest" };
  chrome.storage.sync.set({ options: options }, function() {
    console.log("Options have been set:");
    console.log(options);
  });
}

function getOptions() {
  chrome.storage.sync.get(["options"], function(res) {
    store.state.localPeerName = res.options.localPeerName
      ? res.options.localPeerName
      : "guest";
  });
}

export {
  startParty,
  joinParty,
  leaveParty,
  getState,
  getOptions,
  setOptions,
};
