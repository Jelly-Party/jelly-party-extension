import Vue from 'vue'
import { BootstrapVue, IconsPlugin } from 'bootstrap-vue'
import App from "./App.vue";
import router from "./router";
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import VueClipboard from 'vue-clipboard2'
Vue.use(VueClipboard)
// Install BootstrapVue & BootstrapVue icon components
Vue.use(BootstrapVue)
Vue.use(IconsPlugin)
Vue.config.productionTip = false;

new Vue({
  router,
  render: h => h(App, { props: { development: (process.env.NODE_ENV === "development") } })
}).$mount("#app");
