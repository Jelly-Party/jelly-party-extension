chrome.runtime.onInstalled.addListener(function () {
  var options = { name: "guest", url: "www.example.com", s1: true, s2: true };
  // For debuggin only!!
  ///////////////////////////////////////////////////////////////////////////////
  var options = { name: "sean", url: "media.eulenberg.de", s1: true, s2: true };
  ///////////////////////////////////////////////////////////////////////////////
  chrome.storage.sync.set({ options: options }, function () {
    console.log('Options have been initialized.');
  });
});


chrome.webNavigation.onCompleted.addListener(function () {
  chrome.storage.sync.get(["options"], function (result) {
    var targetUrl = result.options.url;
    chrome.tabs.query({ 'active': true, 'lastFocusedWindow': true }, function (tabs) {
      var currentUrl = tabs[0].url;
      if (currentUrl) {
        if (currentUrl.includes(targetUrl)) {
          console.log(`We're on fire! Injecting script for ${currentUrl}`);
          chrome.tabs.executeScript({
            file: 'js-libs/peerjs.min.js'
          });
          chrome.tabs.executeScript({
            file: 'js-libs/uuidv4.min.js'
          });
          chrome.tabs.executeScript({
            file: 'contentScript.js'
          });
        } else {
          console.log(`Not injecting script for ${currentUrl}`)
        }
      }
    });
  })

}, { url: [{ urlPrefix: "http" }] });


chrome.storage.onChanged.addListener(function (changes, namespace) {
  chrome.storage.sync.get(["options"], function (result) {
    var url = result.options.url;
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
      chrome.declarativeContent.onPageChanged.addRules([{
        conditions: [new chrome.declarativeContent.PageStateMatcher({
          pageUrl: {
            hostEquals: url
          },
        })
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()]
      }]);
    });

  })
});

