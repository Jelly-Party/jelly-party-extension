import Vue from "vue";
import { BootstrapVue, IconsPlugin } from "bootstrap-vue";
import PermissionApp from "./PermissionApp.vue";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";

// Install BootstrapVue & BootstrapVue icon components
Vue.use(BootstrapVue);
Vue.use(IconsPlugin);
//Vue.config.productionTip = false;
Vue.config.devtools = true;
new Vue({
  render: h => h(PermissionApp)
}).$mount("#app");
