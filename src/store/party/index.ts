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
  chatMessages: [
    {
      type: "chatMessage",
      peer: { uuid: "jellyPartySupportBot" },
      data: {
        type: "system",
        data: {
          text: "Welcome to Jelly-Party, friend!",
          timestamp: Date.now(),
        },
      },
    },
  ],
};

export const state: PartyState = { ...initalPartyState };

const namespaced = true;

export const party: Module<PartyState, RootState> = {
  namespaced,
  state,
  getters: {
    getField,
    getPeer: (state) => (uuid: string) => {
      return state.peers.find((peer) => peer.uuid === uuid);
    },
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
