import executePipeline from "./executePipeline";

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

chrome.webNavigation.onBeforeNavigate.addListener(
  function(e) {
    chrome.permissions.contains(
      {
        origins: [e.url],
      },
      (hasPermission) => {
        if (hasPermission) {
          console.log(
            "Jelly-Party: Already have permission. No need to ask for permissions again."
          );
        } else {
          console.log(
            "Jelly-Party: Must ask for permission to automatically insert content script."
          );
          const requestPermissionSite =
            chrome.runtime.getURL("requestPermissions.html") +
            `?jellyPartyUrl=${e.url}`;
          chrome.tabs.update({ url: requestPermissionSite }, () => {});
        }
      }
    );
  },
  { url: [{ queryContains: "jellyPartyId" }] }
);

chrome.webNavigation.onCompleted.addListener(
  function(e) {
    chrome.permissions.contains(
      {
        origins: [e.url],
      },
      (hasPermission) => {
        if (hasPermission) {
          chrome.tabs.query({ active: true, currentWindow: true }, function(
            tabs
          ) {
            var activeTab = tabs[0];
            var activeTabId = activeTab.id;
            executePipeline(activeTabId);
          });
        }
      }
    );
  },
  { url: [{ queryContains: "jellyPartyId" }] }
);
