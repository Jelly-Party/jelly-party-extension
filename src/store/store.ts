import Vue from "vue";
import Vuex, { StoreOptions } from "vuex";
import { RootState } from "./types";
import { options } from "./options/index";
import { party } from "./party/index";
// @ts-ignore
import { getField, updateField } from "vuex-map-fields";
// import { browser } from "webextension-polyfill-ts";

Vue.use(Vuex);
Vue.config.devtools = process.env.NODE_ENV === "development";

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

// export default new Vuex.Store({
//   state: {
//     sideBarMinimized: false,
//     connectedToServer: false,
//     connectingToServer: false,
//     appTitle: process.env.VUE_APP_TITLE,
//     partyState: {
//       isActive: false,
//       partyId: "",
//       peers: [],
//       wsIsConnected: false,
//       lastPartyId: "result.lastPartyId",
//       websiteIsTested: "websiteIsTested",
//       favicon: "",
//       video: "this.partyState ? this.partyState : false",
//     },
//     appMode: process.env.VUE_APP_MODE,
//     options: {
//       clientName: "guest",
//       darkMode: true,
//       onlyIHaveControls: true,
//       statusNotificationsInChat: true,
//       statusNotificationsNotyf: true,
//       avatarState: {
//         accessoriesType: "",
//         clotheType: "",
//         clotheColor: "",
//         eyebrowType: "",
//         eyeType: "",
//         facialHairColor: "",
//         facialHairType: "",
//         graphicType: "'Hola'",
//         hairColor: "",
//         mouthType: "",
//         skinColor: "",
//         topType: "",
//         previousParties: [{ partyId: "abc" }],
//       },
//     },
//   },
//   getters: {
//     getField,
//   },
//   mutations: {
//     toggleSideBar(state) {
//       state.sideBarMinimized = !state.sideBarMinimized;
//     },
//     toggleConnectingStatus(state) {
//       state.connectingToServer = !state.connectingToServer;
//     },
//     connectToServer(state) {
//       state.connectedToServer = true;
//     },
//     disconnectFromServer(state) {
//       state.connectedToServer = false;
//     },
//     populateOptionsStateFromChromeLocalStorage(state, options) {
//       state.options = Object.assign({}, state.options, options);
//     },
//     saveOptionsStateToChromeLocalStorage(state) {
//       browser.storage.sync.set({ options: state.options }).then(function() {});
//     },
//     updateAvatarState(state, newAvatarState) {
//       state.options.avatarState = Object.assign(
//         {},
//         state.avatarState,
//         newAvatarState
//       );
//     },
//     updateField,
//   },
//   actions: {
//     toggleSideBar(context) {
//       context.commit("toggleSideBar");
//     },
//     toggleConnectingStatus(context) {
//       context.commit("toggleConnectingStatus");
//     },
//     connectToServer(context) {
//       context.commit("connectToServer");
//     },
//     disconnectFromServer(context) {
//       context.commit("disconnectFromServer");
//     },
//     populateOptionsStateFromChromeLocalStorage(context) {
//       browser.storage.sync.get(["options"]).then(function(res) {
//         console.log("Jelly-Party: Got options.");
//         console.log(res.options);
//         if (res.options) {
//           console.log("Jelly-Party: Loading options from chrome storage.");
//           context.commit(
//             "populateOptionsStateFromChromeLocalStorage",
//             res.options
//           );
//         } else {
//           console.log("Jelly-Party: No options found. Resetting options.");
//           browser.storage.sync
//             .set({ options: initialOptions })
//             .then(function() {
//               context.commit(
//                 "populateOptionsStateFromChromeLocalStorage",
//                 initialOptions
//               );
//             });
//         }
//       });
//     },
//     saveOptionsStateToChromeLocalStorage(context) {
//       context.commit("saveOptionsStateToChromeLocalStorage");
//     },
//     updateAvatarState(context, { stateKey, newState }) {
//       let newAvatarState = { ...this.state.options.avatarState };
//       newAvatarState[stateKey] = newState;
//       context.commit("updateAvatarState", newAvatarState);
//       console.log(this.state.options.avatarState);
//     },
//   },
//   modules: {},
// });
