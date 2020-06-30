import Vue from "vue";
import Vuex, { StoreOptions } from "vuex";
import { RootState } from "./types";
import { options } from "./options/index";
import { party } from "./party/index";
// @ts-ignore
import { getField, updateField } from "vuex-map-fields";
// import { browser } from "webextension-polyfill-ts";

Vue.config.devtools = ["development", "staging"].includes(process.env.NODE_ENV);
console.log(`Vue.config.devtools = ${Vue.config.devtools}`);
Vue.use(Vuex);

const store: StoreOptions<RootState> = {
  state: {
    sideBarMinimized: false,
    connectedToServer: false,
    connectingToServer: false,
    appTitle: process.env.VUE_APP_TITLE,
    appMode: process.env.VUE_APP_MODE,
  },
  modules: {
    options,
    party,
  },
  getters: {
    getField,
  },
  mutations: {
    toggleSideBar(state) {
      state.sideBarMinimized = !state.sideBarMinimized;
    },
    setConnectingToServer(state, bool: boolean) {
      state.connectingToServer = bool;
    },
    setConnectedToServer(state, bool: boolean) {
      state.connectedToServer = bool;
    },
    updateField,
  },
  actions: {
    toggleSideBar(context) {
      context.commit("toggleSideBar");
    },
    setConnectingToServer(context, bool: boolean) {
      context.commit("setConnectingToServer", bool);
    },
    setConnectedToServer(context, bool: boolean) {
      context.commit("setConnectedToServer", bool);
    },
  },
};

export default new Vuex.Store<RootState>(store);
