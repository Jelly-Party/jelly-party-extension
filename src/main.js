import Vue from "vue";
import { BootstrapVue, IconsPlugin } from "bootstrap-vue";
import App from "./App.vue";
import router from "./router";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";
import VueClipboard from "vue-clipboard2";
import _ from "lodash";
Object.defineProperty(Vue.prototype, "$_", { value: _ });
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
