import injectContentScript from "./injectContentScript";

chrome.runtime.onInstalled.addListener(function() {
  function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
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

function redirectToParty(redirectURL) {
  chrome.tabs.update({ url: redirectURL }, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      var activeTabId = tabs[0].id;
      // Let's wait shortly before injecting the content scripts
      setTimeout(() => {
        injectContentScript(activeTabId);
      }, 1000);
    });
  });
}

chrome.runtime.onMessageExternal.addListener(function(request, sender) {
  console.log(request);
  let redirectURL = new URL(request.redirectURL);
  redirectURL.searchParams.append("jellyPartyId", request.jellyPartyId);
  redirectURL = redirectURL.href;
  console.log(redirectURL);
  if (request.type === "requestPermissions") {
    chrome.permissions.request(
      {
        origins: [request.permissionURL]
      },
      function(granted) {
        if (granted) {
          console.log(
            "Jelly-Party: Permission granted. Redirecting. Content script will now be inserted automatically, since permissions have been granted."
          );
          redirectToParty(redirectURL);
        } else {
          console.log("Jelly-Party: Permission not granted.");
        }
      }
    );
  } else if (request.type === "requestRedirect") {
    if (sender.origin === "https://join.jelly-party.com") {
      chrome.permissions.contains(
        {
          origins: [request.permissionURL]
        },
        hasPermission => {
          if (hasPermission) {
            // We already have permission. Therefore we must redirect the user to the new website
            console.log(
              "Jelly-Party: Already have permission. No need to ask for permissions again."
            );
            redirectToParty(redirectURL);
          } else {
            console.log(
              "Jelly-Party: Must ask for permission to automatically insert content script."
            );
          }
        }
      );
    }
  } else {
    console.log("Jelly-Party: Received unknown request.");
  }
});
