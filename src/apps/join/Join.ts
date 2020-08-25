import Vue from "vue";
import App from "./Join.vue";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";
import { BButton } from "bootstrap-vue";

// Add components globally
Vue.component("b-button", BButton);

new Vue({
  render: h => h(App),
}).$mount("#app");
