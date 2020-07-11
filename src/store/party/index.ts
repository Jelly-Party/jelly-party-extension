import { Module } from "vuex";
import { PartyState, ChatMessage } from "./types";
import { RootState } from "../types";
// @ts-ignore
import { getField, updateField } from "vuex-map-fields";
import { difference as _difference } from "lodash-es";

// PartyState is ephemeral

const initalPartyState: PartyState = {
  isActive: false,
  partyId: "",
  peers: [],
  cachedPeers: [],
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
  },
  mutations: {
    updateField,
    updatePartyState(state, newPartyState: PartyState) {
      Object.assign(state, newPartyState);
    },
    updatePeersChache(state, newPeers) {
      for (const newPeer of newPeers) {
        state.cachedPeers.push(newPeer);
      }
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
      const potentiallyNewPeers = newPartyState.peers
        ? newPartyState.peers.slice()
        : [];
      console.log(
        `potentiallyNewPeers = ${JSON.stringify(potentiallyNewPeers)}`
      );
      const potentiallyNewPeersUUIDs = potentiallyNewPeers
        ? potentiallyNewPeers.map((peer) => peer.uuid)
        : [];
      console.log(
        `potentiallyNewPeersUUIDs = ${JSON.stringify(potentiallyNewPeersUUIDs)}`
      );

      const previousPeersUUIDs = state.cachedPeers
        ? state.cachedPeers.slice().map((peer) => peer.uuid)
        : [];
      console.log(`previousPeersUUIDs = ${JSON.stringify(previousPeersUUIDs)}`);

      const newPeersUUIDs = _difference(
        potentiallyNewPeersUUIDs,
        previousPeersUUIDs
      );
      console.log(`newPeersUUIDs = ${JSON.stringify(newPeersUUIDs)}`);

      const newPeers = potentiallyNewPeers
        ? potentiallyNewPeers.filter((peer) =>
            newPeersUUIDs.includes(peer.uuid)
          )
        : [];
      console.log(`newPeers = ${JSON.stringify(newPeers)}`);
      context.commit("updatePeersChache", newPeers);
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
