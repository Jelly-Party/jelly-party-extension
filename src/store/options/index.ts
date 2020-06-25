import { Module } from "vuex";
import { AvatarState, OptionsState } from "./types";
import { RootState } from "../types";
import uuidv4 from "@/helpers/uuidv4.js";
// @ts-ignore
import { getField, updateField } from "vuex-map-fields";
import { browser } from "webextension-polyfill-ts";

export const state: OptionsState = {
  clientName: "guest",
  darkMode: true,
  onlyIHaveControls: true,
  statusNotificationsInChat: true,
  statusNotificationsNotyf: true,
  previousParties: [{ partyId: "abc", members: ["me"], dateInfo: {} }],
  guid: uuidv4(),
  avatarState: {
    accessoriesType: "Round",
    clotheType: "ShirtScoopNeck",
    clotheColor: "White",
    eyebrowType: "Default",
    eyeType: "Default",
    facialHairColor: "Auburn",
    facialHairType: "BeardMedium",
    graphicType: "Hola",
    hairColor: "Auburn",
    mouthType: "Twinkle",
    skinColor: "Light",
    topType: "ShortHairShortCurly",
  },
};

const namespaced: boolean = true;

export const options: Module<OptionsState, RootState> = {
  namespaced,
  state,
  getters: {
    getField,
  },
  actions: {
    populateOptionsStateFromChromeLocalStorage(context) {
      browser.storage.sync.get(["options"]).then(function(res: any) {
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
          browser.storage.sync.set({ options: state }).then(function() {
            context.commit("populateOptionsStateFromChromeLocalStorage", state);
          });
        }
      });
    },
    saveOptionsStateToChromeLocalStorage(context) {
      context.commit("saveOptionsStateToChromeLocalStorage");
    },
    updateAvatarState(
      context,
      { stateKey, newState }: { stateKey: keyof AvatarState; newState: string }
    ) {
      let newAvatarState: AvatarState = { ...state.avatarState };
      newAvatarState[stateKey] = newState;
      context.commit("updateAvatarState", newAvatarState);
      console.log(state.avatarState);
    },
  },
  mutations: {
    populateOptionsStateFromChromeLocalStorage(state, options) {
      Object.assign(state, options);
    },
    saveOptionsStateToChromeLocalStorage(state) {
      browser.storage.sync.set({ options: state }).then(function() {});
    },
    updateAvatarState(state, newAvatarState) {
      Object.assign(state.avatarState, newAvatarState);
    },
    updateField,
  },
};
