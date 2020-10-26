import { createApp } from "vue";
import Popup from "./Popup.vue";
import { browser } from "webextension-polyfill-ts";

// Execute the content script. Nothing will happen, if we
// execute it again.
browser.tabs.executeScript(undefined, {
  file: "js/iframe.js",
});
createApp(Popup).mount("#app");
