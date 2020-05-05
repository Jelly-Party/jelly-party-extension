const injectContentScript = async tabId => {
  console.log(`Jelly-Party: Injecting content script for tab ${tabId}.`);
  return await chrome.tabs.executeScript(tabId, {
    file: "js/contentScript.js"
  });
};

export { injectContentScript };
