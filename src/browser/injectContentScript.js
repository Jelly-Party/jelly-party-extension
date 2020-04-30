const injectContentScript = tabId => {
  console.log(`Jelly-Party: Injecting content script for tab ${tabId}.`);
  chrome.tabs.executeScript(tabId, {
    file: "js/contentScript.js"
  });
};

export default injectContentScript;
