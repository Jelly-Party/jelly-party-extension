var contentScriptLoaded = false;
const injectContentScript = tabId => {
  console.log(`Jelly-Party: Injecting content script for tab ${tabId}.`);
  chrome.tabs.executeScript(
    tabId,
    {
      file: "js/contentScript.js"
    },
    () => {
      contentScriptLoaded = true;
    }
  );
};

export { injectContentScript, contentScriptLoaded };
