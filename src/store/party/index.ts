import { Module } from "vuex";
import { PartyState, ChatMessage } from "./types";
import { RootState } from "../types";
// @ts-ignore
import { getField, updateField } from "vuex-map-fields";

// PartyState is ephemeral

const initalPartyState: PartyState = {
  isActive: false,
  partyId: "",
  peers: [],
  wsIsConnected: false,
  websiteIsTested: false,
  magicLink: "",
  selfUUID: "",
  paused: false,
  chatMessages: [
    {
      type: "chatMessage",
      peer: { uuid: "jellyPartySupportBot" },
      data: {
        text: "Welcome to Jelly-Party, friend!",
        timestamp: Date.now(),
      },
    },
  ],
  maxChatMessagesDisplay: 200,
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
    setSelfUUID(state, uuid: string) {
      state.selfUUID = uuid;
    },
    setPartyId(state, partyId: string) {
      state.partyId = partyId;
    },
    addChatMessage(state, chatMessage: ChatMessage) {
      while (state.chatMessages.length >= state.maxChatMessagesDisplay) {
        state.chatMessages.shift();
      }
      state.chatMessages.push(chatMessage);
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
