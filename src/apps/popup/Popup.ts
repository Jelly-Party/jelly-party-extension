import Vue from "vue";
import Popup from "./Popup.vue";
import { browser } from "webextension-polyfill-ts";

// Execute the content script. Nothing will happen, if we
// execute it again.
browser.tabs.executeScript(undefined, {
  file: "js/sidebar.js",
});
new Vue({
  render: h => h(Popup),
}).$mount("#app");
