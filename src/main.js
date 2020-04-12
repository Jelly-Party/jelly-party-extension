import Vue from 'vue'
import { BootstrapVue, IconsPlugin } from 'bootstrap-vue'
import App from "./App.vue";
import router from "./router";
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
// Install BootstrapVue
Vue.use(BootstrapVue)
// Optionally install the BootstrapVue icon components plugin
Vue.use(IconsPlugin)
console.log(process.env.NODE_ENV)
Vue.config.productionTip = false;

new Vue({
  router,
  render: h => h(App, { props: { development: (process.env.NODE_ENV === "development") } })
}).$mount("#app");
