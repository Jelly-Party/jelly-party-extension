import Vue from "vue";
import Sidebar from "@/views/Sidebar.vue";
import store from "@/store/store.ts";
import devtools from "@vue/devtools";
import { BootstrapVue, IconsPlugin } from "bootstrap-vue";
import JellyParty from "@/browser/JellyParty";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";

declare module "vue/types/vue" {
  interface Vue {
    $party: JellyParty;
  }
}

Vue.config.devtools = ["development", "staging"].includes(process.env.NODE_ENV);
console.log(`Vue.config.devtools = ${Vue.config.devtools}`);

if (["staging", "development"].includes(process.env.NODE_ENV)) {
  console.log("Jelly-Party: Connecting to devtools");
  devtools.connect(/* host, port */);
}

// Install BootstrapVue & BootstrapVue icon components
Vue.use(BootstrapVue);
Vue.use(IconsPlugin);

const app = new Vue({
  store,
  render: (h) => h(Sidebar),
}).$mount("#app");

const party = new JellyParty();
app.$party = party;
