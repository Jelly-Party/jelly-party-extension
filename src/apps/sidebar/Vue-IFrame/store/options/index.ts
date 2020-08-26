import { Module } from "vuex";
import { AvatarState, OptionsState } from "./types";
import { RootState } from "../types";
// @ts-ignore
import { getField, updateField } from "vuex-map-fields";
import { browser } from "webextension-polyfill-ts";

// OptionsState is permanent (stored in local browser storage)

export const state: OptionsState = {
  clientName: "guest",
  darkMode: true,
  onlyIHaveControls: false,
  statusNotificationsInChat: true,
  statusNotificationsNotyf: true,
  previousParties: [{ partyId: "abc", members: ["me"], dateInfo: {} }],
  guid: "",
  lastPartyId: "",
  showNotificationsForSelf: false,
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
    populateOptionsStateFromBrowserLocalStorage(context) {
      browser.storage.local.get(["options"]).then(res => {
        const options: OptionsState = res.options;
        console.log("Jelly-Party: Got options.");
        console.log(options);
        if (options) {
          console.log("Jelly-Party: Loading options from chrome storage.");
          context.commit(
            "populateOptionsStateFromBrowserLocalStorage",
            options,
          );
        } else {
          console.log(
            "Jelly-Party: No options found. Must save options first to load options.",
          );
        }
      });
    },
    saveOptionsStateToBrowserLocalStorage(context) {
      context.commit("saveOptionsStateToBrowserLocalStorage");
    },
    updateAvatarState(
      context,
      { stateKey, newState }: { stateKey: keyof AvatarState; newState: string },
    ) {
      const newAvatarState: AvatarState = { ...state.avatarState };
      newAvatarState[stateKey] = newState;
      context.commit("updateAvatarState", newAvatarState);
    },
    setLastPartyId(context, partyId: string) {
      context.commit("setLastPartyId", partyId);
      // Next we must save the options to the local browser storage
      context.dispatch("options/saveOptionsStateToBrowserLocalStorage", null, {
        root: true,
      });
    },
  },
  mutations: {
    populateOptionsStateFromBrowserLocalStorage(state, options) {
      Object.assign(state, options);
    },
    saveOptionsStateToBrowserLocalStorage(state) {
      console.log("Jelly-Party: Saving options");
      console.log({ options: state });
      browser.runtime.sendMessage(
        JSON.stringify({ type: "setOptions", options: state }),
      );
    },
    updateAvatarState(state, newAvatarState) {
      Object.assign(state.avatarState, newAvatarState);
    },
    setLastPartyId(state, partyId: string) {
      state.lastPartyId = partyId;
    },
    updateField,
  },
};
