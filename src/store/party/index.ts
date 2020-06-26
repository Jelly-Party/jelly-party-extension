import { Module } from "vuex";
import { PartyState } from "./types";
import { RootState } from "../types";
// @ts-ignore
import { getField, updateField } from "vuex-map-fields";

// PartyState is ephemeral

const initalPartyState: PartyState = {
  isActive: false,
  partyId: "",
  peers: [],
  wsIsConnected: false,
  lastPartyId: "",
  websiteIsTested: false,
  magicLink: "",
};

export const state: PartyState = {
  isActive: false,
  partyId: "",
  peers: [],
  wsIsConnected: false,
  lastPartyId: "",
  websiteIsTested: false,
  magicLink: "",
};

const namespaced = true;

export const party: Module<PartyState, RootState> = {
  namespaced,
  state,
  getters: {
    getField,
  },
  mutations: {
    updateField,
    updatePartyState(state, newPartyState: PartyState) {
      Object.assign(state, newPartyState);
    },
    setMagicLink(state, magicLink: string) {
      state.magicLink = magicLink;
    },
    setActive(state, bool: boolean) {
      state.isActive = bool;
    },
    setPartyId(state, partyId: string) {
      state.partyId = partyId;
    },
  },
  actions: {
    updatePartyState(context, newPartyState: PartyState) {
      context.commit("updatePartyState", newPartyState);
    },
    resetPartyState(context) {
      context.commit("updatePartyState", initalPartyState);
    },
    setMagicLink(context, magicLink: string) {
      context.commit("setMagicLink", magicLink);
    },
    setActive(context, bool: boolean) {
      context.commit("setActive", bool);
    },
    setPartyId(context, partyId: string) {
      context.commit("setPartyId", partyId);
    },
  },
};
