chrome.runtime.onInstalled.addListener(function() {
  var options = { localPeerName: "Somebody" };
  chrome.storage.sync.set({ options: options }, function() {
    console.log("Options have been initialized.");
  });
});

chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
  chrome.declarativeContent.onPageChanged.addRules([
    {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          css: ["video"]
        })
      ],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }
  ]);
});
