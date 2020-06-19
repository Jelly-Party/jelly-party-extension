let scriptInjected = false;

chrome.runtime.onInstalled.addListener(function() {
  function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
      (
        c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
      ).toString(16)
    );
  }
  let options = { localPeerName: "guest", guid: uuidv4() };
  chrome.storage.sync.set({ options: options }, function() {
    console.log("Options have been initialized.");
    console.log(options);
  });
  let initialAvatar = {
    accessoriesType: "Round",
    clotheType: "ShirtScoopNeck",
    clotheColor: "White",
    eyebrowType: "Default",
    eyeType: "Default",
    facialHairColor: "Auburn",
    facialHairType: "BeardMedium",
    graphicType: "Hola",
    hairColor: "Auburn",
    mouthType: "Twinkle",
    skinColor: "Light",
    topType: "ShortHairShortCurly",
  };
  chrome.storage.sync.set({ avatarState: initialAvatar }, function() {
    console.log("Avatar has been initialized.");
    console.log(initialAvatar);
  });
});

function redirectToParty(redirectURL) {
  // We must get the currently active tab on every iteration
  // Note: If the user switches tabs too quickly after opening
  // a Jelly-Party link, the script will be injected into the
  // wrong website
  // TODO: Analyze how commonly this scenario occurs

  // The root of the problem lies in the fact that chrome.tabs.update's
  // callback function seems to execute before the tab's DOM content has been
  // loaded. This leads to the content script sometimes disappearing into
  // a void inbetween join.jelly-party.com and redirectURL
  chrome.tabs.update({ url: redirectURL }, () => {
    let injectInterval = setInterval(() => {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        let activeTabId = tabs[0].id;
        // Let's attempt to inject the content script until we have been successful
        // As a fallback, we'll stop after a a maximum of 20 injection attempts.
        let injectAttempts = 0;
        let maxInjects = 20;
        if (!scriptInjected && injectAttempts < maxInjects) {
          console.log("Jelly-Party: Attempting content-script injection.");
          chrome.tabs.executeScript(activeTabId, {
            file: "js/contentScript.js",
          });
          injectAttempts += 1;
        } else {
          console.log("Jelly-Party: Clearing injection interval.");
          clearInterval(injectInterval);
        }
      });
    }, 1000);
  });
}

chrome.runtime.onMessageExternal.addListener(function(request, sender) {
  console.log(`Received external message: ${JSON.stringify(request)}`);
  if (request.type === "requestPermissions") {
    let redirectURL = new URL(request.redirectURL);
    redirectURL.searchParams.append("jellyPartyId", request.jellyPartyId);
    redirectURL = redirectURL.href;
    console.log(redirectURL);
    chrome.permissions.request(
      {
        origins: [request.permissionURL],
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
    let redirectURL = new URL(request.redirectURL);
    redirectURL.searchParams.append("jellyPartyId", request.jellyPartyId);
    redirectURL = redirectURL.href;
    console.log(redirectURL);
    if (sender.origin === "https://join.jelly-party.com") {
      chrome.permissions.contains(
        {
          origins: [request.permissionURL],
        },
        (hasPermission) => {
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

chrome.runtime.onMessage.addListener(function(request, sender) {
  if (request.type === "clearCSInjectionInterval") {
    setTimeout(() => {
      console.log(
        "Jelly-Party: Received request to clear script injection interval."
      );
      scriptInjected = true;
    }, 1200);
  } else {
    console.log("Jelly-Party: Received unknown request.");
  }
});
