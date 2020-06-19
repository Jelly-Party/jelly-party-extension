import Vue from "vue";
import Popup from "./Popup.vue";

// Execute the content script. Nothing will happen, if we
// execute it again.
chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
  var activeTabId = tabs[0].id;
  chrome.tabs.executeScript(activeTabId, {
    file: "js/sideBar.js",
  });
});
new Vue({
  render: (h) => h(Popup),
}).$mount("#app");
