chrome.runtime.onInstalled.addListener(function () {
  var options = { name: "guest", s1: true, s2: true };
  chrome.storage.sync.set({ options: options }, function () {
    console.log('Options have been initialized.');
  });

});
chrome.storage.onChanged.addListener(function (changes, namespace) {
  // TODO: here we must update the pageUrl
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { hostEquals: 'media.eulenberg.de' },
      })
      ],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
});

chrome.runtime.onMessage.addListener(function (message, callback) {
  if (message == 'hello') {
    console.log("hello");
  } else if (message == 'goodbye') {
    chrome.runtime.Port.disconnect();
  }
});

// Partys are managed in the background. Therefore party state must be synced between background.js and popup.html/js
chrome.webNavigation.onCompleted.addListener(function () {
  console.log("This is my favorite website!");
  var port = chrome.runtime.connect({ name: "backgroundAndContent" });
  port.postMessage({ joke: "Knock knock" });
  port.onMessage.addListener(function (msg) {
    if (msg.question == "Who's there?")
      port.postMessage({ answer: "Madame" });
    else if (msg.question == "Madame who?")
      port.postMessage({ answer: "Madame... Bovary" });
  });

}, { url: [{ hostEquals: 'media.eulenberg.de' }] });