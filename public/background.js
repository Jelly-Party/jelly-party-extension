chrome.runtime.onInstalled.addListener(function() {
  function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
      (
        c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
      ).toString(16)
    );
  }
  var options = { localPeerName: "guest", guid: uuidv4() };
  chrome.storage.sync.set({ options: options }, function() {
    console.log("Options have been initialized.");
    console.log(options);
  });
});

chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
  chrome.declarativeContent.onPageChanged.addRules([
    {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          css: ["video"],
        }),
      ],
      actions: [new chrome.declarativeContent.ShowPageAction()],
    },
  ]);
});
