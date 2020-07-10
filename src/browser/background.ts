import { browser } from "webextension-polyfill-ts";
import uuidv4 from "@/helpers/uuidv4";

browser.runtime.onInstalled.addListener(function() {
  const options = { guid: uuidv4() };
  browser.storage.local.set({ options: options }).then(function() {
    console.log("Jelly-Party has been initialized.");
    console.log(options);
  });
});

browser.storage.local.get("options").then((options: any) => {
  if (!options.guid) {
    console.log("Jelly-Party. GUID lost, resetting GUID.");
    const newOptions = { ...options, ...{ guid: uuidv4() } };
    browser.storage.local.set({ options: newOptions });
  }
});

function redirectToParty(redirectURL: string) {
  // We attempt to inject the content script several times. If we've been
  // successful, further injections will yield no effect.
  // The root of the problem lies in the fact that browser.tabs.update's
  // callback function sometimes seems to execute before the tab's DOM content
  // has been loaded. This leads to the content script sometimes disappearing
  // into a void inbetween join.jelly-party.com and redirectURL.
  browser.tabs.update(undefined, { url: redirectURL }).then(async () => {
    // We query the active tab id after the tab has been updated, to make
    // sure that we only attempt to inject the content script into whatever
    // tab was opened by our "browser.tabs.update" query.
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const activeTabId = tabs[0].id;
      const delays = [1000, 2000, 3000, 5000, 7000, 10000, 15000, 25000];
      delays.forEach((delay) => {
        setTimeout(() => {
          browser.tabs
            .executeScript(activeTabId, {
              file: "js/mainFrame.js",
            })
            .catch((err) => {
              console.log(
                `Could not inject content script. ${
                  delay === delays.splice(-1)[0]
                    ? "No further injection intended."
                    : `Will attempt redirection again in ${delay}.`
                }.`
              );
              console.log(err);
            });
        }, delay);
      });
    });
  });
}

export interface PermissionsFrame {
  type: "checkPermissionsThenMaybeRedirect" | "askForPermissionsThenRedirect";
  payload: {
    permissionScheme: string;
    redirectURL: string;
  };
}

async function askForPermissionsThenRedirect(
  matchPattern: string,
  redirectURL: string
) {
  return new Promise((resolve, reject) => {
    browser.permissions
      .request({
        origins: [matchPattern],
      })
      .then((granted) => {
        if (granted) {
          redirectToParty(redirectURL);
          resolve("Permissions granted successfully");
        } else {
          reject("Permissions not granted.");
        }
      })
      .catch((err) => {
        console.log(err);
      });
  });
}

browser.runtime.onMessage.addListener((req: string) => {
  const request: PermissionsFrame = JSON.parse(req);
  switch (request.type) {
    case "checkPermissionsThenMaybeRedirect": {
      return new Promise((resolve, reject) => {
        browser.permissions
          .contains({
            origins: [request.payload.permissionScheme],
          })
          .then((hasPermission) => {
            if (hasPermission) {
              redirectToParty(request.payload.redirectURL);
              resolve("Already have permissions");
            } else {
              reject("Must ask for permissions first");
            }
          });
      }).catch((err) => {
        console.log(err);
      });
    }
    case "askForPermissionsThenRedirect": {
      return askForPermissionsThenRedirect(
        request.payload.permissionScheme,
        request.payload.redirectURL
      );
    }
    default: {
      console.log(`Jelly-Party: Received unknown message: ${request}`);
    }
  }
});
