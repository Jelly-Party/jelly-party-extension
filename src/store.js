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

Vue.use(Vuex);

const store = new Vuex.Store({
  state: {
    count: 0,
  },
  mutations: {
    increment(state) {
      state.count++;
    },
  },
});

export default store;
