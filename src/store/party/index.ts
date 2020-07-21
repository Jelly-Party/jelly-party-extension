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
  cachedPeers: [],
  wsIsConnected: false,
  websiteIsTested: false,
  magicLink: "",
  selfUUID: "",
  videoState: { paused: true, currentTime: 0 },
  chatMessages: [
    // {
    //   type: "chatMessage",
    //   peer: { uuid: "jellyPartySupportBot" },
    //   data: {
    //     text: "Welcome to Jelly-Party, friend!",
    //     timestamp: Date.now(),
    //   },
    // },
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
    updatePeersChache(state, newCachedPeers) {
      state.cachedPeers = newCachedPeers;
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
      // First, we handle the cache updating, which is more complicated, since
      // we must not remove peers, but possibly mutate peers.
      const allUUIDs = new Set(
        context.state.peers
          .map((peer) => peer.uuid)
          .concat(newPartyState.peers.map((peer) => peer.uuid))
      );
      // Create a copy of the current cache, use current state if it doesn't yet exist
      let cachedPeers = context.state.cachedPeers
        ? context.state.cachedPeers.slice()
        : context.state.peers.slice();
      // Iterate over all UUIDs from current state + new state
      for (const uuid of allUUIDs) {
        const oldPeer = context.state.peers.find((peer) => peer.uuid === uuid);
        const newPeer = newPartyState.peers.find((peer) => peer.uuid === uuid);
        if (!oldPeer && newPeer) {
          // We have added a peer, which we must add to the cache
          cachedPeers.push(newPeer);
        } else if (!oldPeer && !newPeer) {
          throw Error(`Jelly-Party: Unknown uuid of ${uuid}.`);
        } else if (oldPeer && newPeer) {
          // Peer's state might have been updated
          // Let's first remove the old peer from the cache
          cachedPeers = cachedPeers.filter((peer) => !(peer.uuid === uuid));
          // Then add the new peer back to cachedPeers
          cachedPeers.push(newPeer);
        } else {
          // Peer has been removed, do nothing
          continue;
        }
      }
      // Then we commit the new cache
      context.commit("updatePeersChache", cachedPeers);
      // Lastly, we update the client state
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
