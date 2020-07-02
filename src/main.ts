import Vue from "vue";
import Popup from "./Popup.vue";
import { browser } from "webextension-polyfill-ts";

// Execute the content script. Nothing will happen, if we
// execute it again.
browser.tabs.query({ active: true, currentWindow: true }).then(function(tabs) {
  const activeTabId = tabs[0].id;
  browser.tabs.executeScript(activeTabId, {
    file: "js/mainFrame.js",
  });
});
new Vue({
  render: (h) => h(Popup),
}).$mount("#app");
