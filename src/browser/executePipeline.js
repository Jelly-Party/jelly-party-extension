const executePipeline = tabId => {
  chrome.tabs.insertCSS(tabId, {
    file: "libs/css/notyf.min.css"
  });
  chrome.tabs.executeScript(tabId, {
    file: "libs/js/notyf.min.js"
  });
  chrome.tabs.executeScript(tabId, {
    file: "libs/js/loglevel.min.js"
  });
  chrome.tabs.executeScript(tabId, {
    file: "libs/js/randomName.js"
  });
  chrome.tabs.executeScript(tabId, {
    file: "libs/js/lodash.js"
  });
  var scriptToInject = "";
  switch (process.env.VUE_APP_MODE) {
    case "production":
      scriptToInject = "window.mode='production'";
      break;
    case "development":
      scriptToInject = "window.mode='development'";
      break;
    case "staging":
      scriptToInject = "window.mode='staging'";
      break;
    default:
      break;
  }
  chrome.tabs.executeScript({ code: scriptToInject });
  chrome.tabs.executeScript(tabId, {
    file: "contentScript.js"
  });
};

export default executePipeline;
