import Vue from "vue";
import { BootstrapVue, IconsPlugin } from "bootstrap-vue";
import App from "./App.vue";
import router from "./router";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";
import VueClipboard from "vue-clipboard2";
import VueDOMPurifyHTML from "vue-dompurify-html";

// VueDOMPurifyHTML.addHook("afterSanitizeAttributes", function(node) {
//   // set all elements owning target to target=_blank
//   if ("target" in node) {
//     node.setAttribute("target", "_blank");
//     // prevent https://www.owasp.org/index.php/Reverse_Tabnabbing
//     node.setAttribute("rel", "noopener noreferrer");
//   }
// });

Vue.use(VueDOMPurifyHTML);
Vue.use(VueClipboard);
// Install BootstrapVue & BootstrapVue icon components
Vue.use(BootstrapVue);
Vue.use(IconsPlugin);
//Vue.config.productionTip = false;
Vue.config.devtools = true;
console.log(process.env.NODE_ENV);
new Vue({
  router,
  render: h => h(App)
}).$mount("#app");
