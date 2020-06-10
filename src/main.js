import Vue from "vue";
import { BootstrapVue, IconsPlugin } from "bootstrap-vue";
import App from "./App.vue";
import router from "./router";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";
import VueClipboard from "vue-clipboard2";
import VueDOMPurifyHTML from "vue-dompurify-html";
import { injectContentScript } from "@/browser/injectContentScript.js";
import store from "./store";

// Execute the content script. Nothing will happen, if we
// execute it again.
chrome.tabs.query({ active: true, currentWindow: true }, async function(tabs) {
  var activeTabId = tabs[0].id;
  await injectContentScript(activeTabId);
});
Vue.use(VueDOMPurifyHTML);
Vue.use(VueClipboard);
// Install BootstrapVue & BootstrapVue icon components
Vue.use(BootstrapVue);
Vue.use(IconsPlugin);
//Vue.config.productionTip = false;
Vue.config.devtools = true;
console.log(`Jelly-Party: Mode is ${process.env.NODE_ENV}`);
new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount("#app");
