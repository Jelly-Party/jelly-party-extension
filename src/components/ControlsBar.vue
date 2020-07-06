<template>
  <b-container class="mt-3 mb-3">
    <div id="jelly-party-controls-bar">
      <div
        v-b-modal.modal-center
        class="jelly-party-navbar-button"
        @click="togglePlayingStatus()"
      >
        <svg
          v-if="!paused"
          width="1em"
          height="1em"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          focusable="false"
          data-prefix="fas"
          data-icon="play"
          class="svg-inline--fa fa-play fa-w-14"
          role="img"
          viewBox="0 0 448 512"
        >
          <path
            fill="currentColor"
            d="M424.4 214.7L72.4 6.6C43.8-10.3 0 6.1 0 47.9V464c0 37.5 40.7 60.1 72.4 41.3l352-208c31.4-18.5 31.5-64.1 0-82.6z"
          />
        </svg>
        <svg
          v-else
          width="1em"
          height="1em"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          focusable="false"
          data-prefix="fas"
          data-icon="pause"
          class="svg-inline--fa fa-pause fa-w-14"
          role="img"
          viewBox="0 0 448 512"
        >
          <path
            fill="currentColor"
            d="M144 479H48c-26.5 0-48-21.5-48-48V79c0-26.5 21.5-48 48-48h96c26.5 0 48 21.5 48 48v352c0 26.5-21.5 48-48 48zm304-48V79c0-26.5-21.5-48-48-48h-96c-26.5 0-48 21.5-48 48v352c0 26.5 21.5 48 48 48h96c26.5 0 48-21.5 48-48z"
          />
        </svg>
      </div>

      <div
        v-b-modal.people-inside-party-modal
        class="jelly-party-navbar-button"
      >
        <svg
          width="1.5em"
          height="1.5em"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          focusable="false"
          data-prefix="fas"
          data-icon="users"
          class="svg-inline--fa fa-users fa-w-20"
          role="img"
          viewBox="0 0 640 512"
        >
          <path
            fill="currentColor"
            d="M96 224c35.3 0 64-28.7 64-64s-28.7-64-64-64-64 28.7-64 64 28.7 64 64 64zm448 0c35.3 0 64-28.7 64-64s-28.7-64-64-64-64 28.7-64 64 28.7 64 64 64zm32 32h-64c-17.6 0-33.5 7.1-45.1 18.6 40.3 22.1 68.9 62 75.1 109.4h66c17.7 0 32-14.3 32-32v-32c0-35.3-28.7-64-64-64zm-256 0c61.9 0 112-50.1 112-112S381.9 32 320 32 208 82.1 208 144s50.1 112 112 112zm76.8 32h-8.3c-20.8 10-43.9 16-68.5 16s-47.6-6-68.5-16h-8.3C179.6 288 128 339.6 128 403.2V432c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48v-28.8c0-63.6-51.6-115.2-115.2-115.2zm-223.7-13.4C161.5 263.1 145.6 256 128 256H64c-35.3 0-64 28.7-64 64v32c0 17.7 14.3 32 32 32h65.9c6.3-47.4 34.9-87.3 75.2-109.4z"
          />
        </svg>
      </div>

      <div v-b-modal.leave-party-modal class="jelly-party-navbar-button">
        <svg
          width="1.3em"
          height="1.3em"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          focusable="false"
          data-prefix="fas"
          data-icon="sign-out-alt"
          class="svg-inline--fa fa-sign-out-alt fa-w-16"
          role="img"
          viewBox="0 0 512 512"
        >
          <path
            fill="currentColor"
            d="M497 273L329 441c-15 15-41 4.5-41-17v-96H152c-13.3 0-24-10.7-24-24v-96c0-13.3 10.7-24 24-24h136V88c0-21.4 25.9-32 41-17l168 168c9.3 9.4 9.3 24.6 0 34zM192 436v-40c0-6.6-5.4-12-12-12H96c-17.7 0-32-14.3-32-32V160c0-17.7 14.3-32 32-32h84c6.6 0 12-5.4 12-12V76c0-6.6-5.4-12-12-12H96c-53 0-96 43-96 96v192c0 53 43 96 96 96h84c6.6 0 12-5.4 12-12z"
          />
        </svg>
      </div>

      <b-modal
        id="people-inside-party-modal"
        centered
        title="🎉People inside party🎉"
        hide-footer
      >
        <div
          v-for="peer in peers"
          :key="peer.uuid"
          class="d-flex align-items-center justify-content-center"
        >
          <Avataaar
            style="height:3.5em; width: 3.5em;"
            :title="getPeer(peer.uuid).clientName"
            :accessoriesType="getPeer(peer.uuid).avatarState.accessoriesType"
            :clotheType="getPeer(peer.uuid).avatarState.clotheType"
            :clotheColor="getPeer(peer.uuid).avatarState.clotheColor"
            :eyebrowType="getPeer(peer.uuid).avatarState.eyebrowType"
            :eyeType="getPeer(peer.uuid).avatarState.eyeType"
            :facialHairColor="getPeer(peer.uuid).avatarState.facialHairColor"
            :facialHairType="getPeer(peer.uuid).avatarState.facialHairType"
            :graphicType="'Hola'"
            :hairColor="getPeer(peer.uuid).avatarState.hairColor"
            :mouthType="getPeer(peer.uuid).avatarState.mouthType"
            :skinColor="getPeer(peer.uuid).avatarState.skinColor"
            :topType="getPeer(peer.uuid).avatarState.topType"
          />
          <div class="jelly-party-name-wrapper">
            <span class="text-white"> {{ peer.clientName }} </span>
          </div>
        </div>
      </b-modal>
      <b-modal
        id="leave-party-modal"
        centered
        title="Leave party?"
        ok-title="Leave party"
      >
        <p class="my-4">Are you sure you want to leave this party?</p>
        <template v-slot:modal-footer="{ ok, cancel }">
          <b-button variant="secondary" @click="ok()">
            Cancel
          </b-button>
          <b-button variant="primary" @click="leaveParty(cancel)">
            Leave party
          </b-button>
        </template>
      </b-modal>
    </div>
  </b-container>
</template>

<script>
import { party as partyStore } from "@/store/party";
import Avataaar from "@/browser/vuejs-avataaars/entry.js";

export default {
  components: {
    Avataaar,
  },
  computed: {
    peers() {
      return partyStore.state.peers;
    },
    paused() {
      return partyStore.state.paused;
    },
  },
  methods: {
    getPeer(uuid) {
      const peer = partyStore.state.peers.find((peer) => uuid === peer.uuid);
      return peer;
    },
    leaveParty(cancel) {
      console.log("Jelly-Party: Leaving party");
      this.$root.$party.leaveParty();
      cancel();
    },
    togglePlayingStatus() {
      console.log("Jelly-Party: Toggling playing status.");
    },
  },
};
</script>

<style lang="scss">
#jelly-party-controls-bar {
  border-radius: 1em;
  height: 2.5em;
  background-color: gray;
  width: 100%;
  padding: 0.3em 0.6em;
  display: flex;
  justify-content: space-around;
  align-items: center;
}
.jelly-party-navbar-button {
  color: white;
  transition: all 300ms ease;
  &:hover {
    color: $jellyPartyOrange;
  }
}

.jelly-party-name-wrapper {
  flex-grow: 1;
  margin: 1em;
  padding: 1em;
  border-radius: 1em;
  background-color: $jellyPartyPurple;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-title {
  color: black;
}

.modal-body {
  color: black;
}
</style>
