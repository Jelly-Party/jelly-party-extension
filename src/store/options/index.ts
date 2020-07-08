import { Module } from "vuex";
import { AvatarState, OptionsState } from "./types";
import { RootState } from "../types";
// @ts-ignore
import { getField, updateField } from "vuex-map-fields";
import { browser } from "webextension-polyfill-ts";

// OptionsState is permanent (stored in Chrome Storage)

export const state: OptionsState = {
  clientName: "guest",
  darkMode: true,
  onlyIHaveControls: true,
  statusNotificationsInChat: true,
  statusNotificationsNotyf: true,
  previousParties: [{ partyId: "abc", members: ["me"], dateInfo: {} }],
  guid: "",
  avatarState: {
    accessoriesType: "Round",
    clotheType: "ShirtScoopNeck",
    clotheColor: "White",
    eyebrowType: "Default",
    eyeType: "Default",
    facialHairColor: "Auburn",
    facialHairType: "Blank",
    graphicType: "Hola",
    hairColor: "Auburn",
    mouthType: "Twinkle",
    skinColor: "Light",
    topType: "ShortHairShortCurly",
  },
};

const namespaced = true;

export const options: Module<OptionsState, RootState> = {
  namespaced,
  state,
  getters: {
    getField,
  },
  actions: {
    populateOptionsStateFromChromeLocalStorage(context) {
      browser.storage.local.get(["options"]).then(function(res: any) {
        console.log("Jelly-Party: Got options.");
        console.log(res.options);
        if (res.options) {
          console.log("Jelly-Party: Loading options from chrome storage.");
          context.commit(
            "populateOptionsStateFromChromeLocalStorage",
            res.options
          );
        } else {
          console.log(
            "Jelly-Party: No options found. Must save options first to load options."
          );
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
      const newAvatarState: AvatarState = { ...state.avatarState };
      newAvatarState[stateKey] = newState;
      context.commit("updateAvatarState", newAvatarState);
    },
  },
  mutations: {
    populateOptionsStateFromChromeLocalStorage(state, options) {
      Object.assign(state, options);
    },
    saveOptionsStateToChromeLocalStorage(state) {
      browser.storage.local.set({ options: state });
    },
    updateAvatarState(state, newAvatarState) {
      Object.assign(state.avatarState, newAvatarState);
    },
    updateField,
  },
};
