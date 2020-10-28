import { createApp } from "vue";
import Popup from "./Popup.vue";
import { browser } from "webextension-polyfill-ts";

// Execute the content script. Nothing will happen, if we
// execute it again.
browser.tabs.executeScript(undefined, {
  file: "js/hostController.js",
});
browser.tabs.executeScript(undefined, {
  file: "js/videoController.js",
  allFrames: true,
});
createApp(Popup).mount("#app");
