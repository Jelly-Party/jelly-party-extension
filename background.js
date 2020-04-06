chrome.runtime.onInstalled.addListener(function () {
  var options = { name: "guest", url: "www.example.com", s1: true, s2: true };
  // For debuggin only!!
  ///////////////////////////////////////////////////////////////////////////////
  var options = { name: "guest", url: "media.eulenberg.de", s1: true, s2: true };
  ///////////////////////////////////////////////////////////////////////////////
  chrome.storage.sync.set({ options: options }, function () {
    console.log('Options have been initialized.');
  });
});


chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
  chrome.declarativeContent.onPageChanged.addRules([{
    conditions: [new chrome.declarativeContent.PageStateMatcher({
      css: ["video"]
    })
    ],
    actions: [new chrome.declarativeContent.ShowPageAction()]
  }]);
});