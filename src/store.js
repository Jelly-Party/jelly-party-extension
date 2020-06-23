// export default {
//   state: {
//     debug: process.env.NODE_ENV === "development",
//     isActive: false,
//     partyId: "",
//     peers: [],
//     wsIsConnected: false,
//     lastPartyId: "",
//     websiteIsTested: false,
//     magicLink: "",
//     localPeerName: "", // must not be updated in updateState, since it is queried from Chrome storage
//     favicon: "",
//     video: ""
//   },
//   avatarState: {
//     accessoriesType: "",
//     clotheType: "",
//     clotheColor: "",
//     eyebrowType: "",
//     eyeType: "",
//     facialHairColor: "",
//     facialHairType: "",
//     graphicType: "'Hola'",
//     hairColor: "",
//     mouthType: "",
//     skinColor: "",
//     topType: ""
//   },
//   updateState: function(newState) {
//     try {
//       this.state.isActive = newState.isActive;
//       this.state.partyId = newState.partyId;
//       this.state.peers = newState.peers;
//       this.state.wsIsConnected = newState.wsIsConnected;
//       this.state.lastPartyId = newState.lastPartyId;
//       this.state.websiteIsTested = newState.websiteIsTested;
//       this.state.magicLink = newState.magicLink;
//       this.state.favicon = newState.favicon;
//       this.state.video = Boolean(newState.video);
//     } catch (e) {
//       console.log(
//         `Error updating party state for newState of ${JSON.stringify(newState)}`
//       );
//       console.log(e);
//     }
//   },
//   updateAvatarState: function(newState) {
//     console.log("Updating avatar state");
//     console.log(newState);
//     for (const key of Object.keys(newState)) {
//       console.log(`Updating ${key}`);
//       this.avatarState[key] = newState[key];
//     }
//   }
// };

import Vue from "vue";
import Vuex from "vuex";
import initialOptions from "@/helpers/initialOptions.js";
import { getField, updateField } from "vuex-map-fields";

Vue.use(Vuex);
Vue.config.devtools = process.env.NODE_ENV === "development";

export default new Vuex.Store({
  state: {
    sideBarMinimized: false,
    connectedToServer: false,
    connectingToServer: false,
    appTitle: process.env.VUE_APP_TITLE,
    partyState: {
      isActive: false,
      partyId: "",
      peers: [],
      wsIsConnected: false,
      lastPartyId: "result.lastPartyId",
      websiteIsTested: "websiteIsTested",
      favicon: "",
      video: "this.partyState ? this.partyState : false",
    },
    appMode: process.env.VUE_APP_MODE,
    options: {
      clientName: "guest",
      darkMode: true,
      onlyIHaveControls: true,
      statusNotificationsInChat: true,
      statusNotificationsNotyf: true,
      avatarState: {
        accessoriesType: "",
        clotheType: "",
        clotheColor: "",
        eyebrowType: "",
        eyeType: "",
        facialHairColor: "",
        facialHairType: "",
        graphicType: "'Hola'",
        hairColor: "",
        mouthType: "",
        skinColor: "",
        topType: "",
      },
    },
  },
  getters: {
    getField,
  },
  mutations: {
    toggleSideBar(state) {
      state.sideBarMinimized = !state.sideBarMinimized;
    },
    toggleConnectingStatus(state) {
      state.connectingToServer = !state.connectingToServer;
    },
    connectToServer(state) {
      state.connectedToServer = true;
    },
    disconnectFromServer(state) {
      state.connectedToServer = false;
    },
    populateOptionsStateFromChromeLocalStorage(state, options) {
      state.options = Object.assign({}, state.options, options);
    },
    saveOptionsStateToChromeLocalStorage(state) {
      chrome.storage.sync.set({ options: state.options }, function() {});
    },
    updateAvatarState(state, newAvatarState) {
      state.options.avatarState = Object.assign(
        {},
        state.avatarState,
        newAvatarState
      );
    },
    updateField,
  },
  actions: {
    toggleSideBar(context) {
      context.commit("toggleSideBar");
    },
    toggleConnectingStatus(context) {
      context.commit("toggleConnectingStatus");
    },
    connectToServer(context) {
      context.commit("connectToServer");
    },
    disconnectFromServer(context) {
      context.commit("disconnectFromServer");
    },
    populateOptionsStateFromChromeLocalStorage(context) {
      chrome.storage.sync.get(["options"], function(res) {
        console.log("Jelly-Party: Got options.");
        console.log(res.options);
        if (res.options) {
          console.log("Jelly-Party: Loading options from chrome storage.");
          context.commit(
            "populateOptionsStateFromChromeLocalStorage",
            res.options
          );
        } else {
          console.log("Jelly-Party: No options found. Resetting options.");
          chrome.storage.sync.set({ options: initialOptions }, function() {
            context.commit(
              "populateOptionsStateFromChromeLocalStorage",
              initialOptions
            );
          });
        }
      });
    },
    saveOptionsStateToChromeLocalStorage(context) {
      context.commit("saveOptionsStateToChromeLocalStorage");
    },
    updateAvatarState(context, { stateKey, newState }) {
      let newAvatarState = { ...this.state.options.avatarState };
      newAvatarState[stateKey] = newState;
      context.commit("updateAvatarState", newAvatarState);
      console.log(this.state.options.avatarState);
    },
  },
  modules: {},
});
