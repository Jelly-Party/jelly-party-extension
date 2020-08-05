import Vue from "vue";
import Sidebar from "@/iFrame/views/Sidebar.vue";
import store from "@/iFrame/store/store.ts";
import devtools from "@vue/devtools";
import { BootstrapVue, IconsPlugin } from "bootstrap-vue";
import JellyParty from "@/iFrame/JellyParty";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";

declare module "vue/types/vue" {
  interface Vue {
    $party: JellyParty;
  }
}

Vue.directive("click-outside", {
  bind: function(el: any, binding, vnode: any) {
    el.clickOutsideEvent = function(event: any) {
      if (!(el == event.target || el.contains(event.target))) {
        vnode.context[binding.expression](event);
      }
    };
    document.body.addEventListener("click", el.clickOutsideEvent);
  },
  unbind: function(el: any) {
    document.body.removeEventListener("click", el.clickOutsideEvent);
  },
});

Vue.config.devtools = ["development", "staging"].includes(process.env.NODE_ENV);

if (["staging", "development"].includes(process.env.NODE_ENV)) {
  console.log("Jelly-Party: Connecting to devtools");
  devtools.connect(/* host, port */);
}

// Install BootstrapVue & BootstrapVue icon components
Vue.use(BootstrapVue);
Vue.use(IconsPlugin);

const app = new Vue({
  store,
  render: h => h(Sidebar),
}).$mount("#app");
const party = new JellyParty();
app.$party = party;
