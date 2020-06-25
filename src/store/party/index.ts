import { Module } from "vuex";
import { PartyState } from "./types";
import { RootState } from "../types";
// @ts-ignore
import { getField, updateField } from "vuex-map-fields";

export const state: PartyState = {
  isActive: false,
  partyId: "",
  peers: [],
  wsIsConnected: false,
  lastPartyId: "",
  websiteIsTested: false,
  favicon: "",
  video: {},
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
  },
};
