<template>
  <b-container class="my-2">
    <div id="jelly-party-controls-bar">
      <div
        v-b-modal.modal-center
        class="jelly-party-navbar-button"
        @click="togglePlayPause()"
        v-b-tooltip.hover
        :title="paused ? 'Play video' : 'Pause video'"
      >
        <svg
          v-if="paused"
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
        v-b-modal.modal-center
        class="jelly-party-navbar-button"
        @click="toggleFullScreen()"
        v-b-tooltip.hover
        title="Toggle fullscreen"
      >
        <svg
          width="1em"
          height="1em"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          focusable="false"
          data-prefix="fas"
          data-icon="expand"
          class="svg-inline--fa fa-expand fa-w-14"
          role="img"
          viewBox="0 0 448 512"
        >
          <path
            fill="currentColor"
            d="M0 180V56c0-13.3 10.7-24 24-24h124c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12H64v84c0 6.6-5.4 12-12 12H12c-6.6 0-12-5.4-12-12zM288 44v40c0 6.6 5.4 12 12 12h84v84c0 6.6 5.4 12 12 12h40c6.6 0 12-5.4 12-12V56c0-13.3-10.7-24-24-24H300c-6.6 0-12 5.4-12 12zm148 276h-40c-6.6 0-12 5.4-12 12v84h-84c-6.6 0-12 5.4-12 12v40c0 6.6 5.4 12 12 12h124c13.3 0 24-10.7 24-24V332c0-6.6-5.4-12-12-12zM160 468v-40c0-6.6-5.4-12-12-12H64v-84c0-6.6-5.4-12-12-12H12c-6.6 0-12 5.4-12 12v124c0 13.3 10.7 24 24 24h124c6.6 0 12-5.4 12-12z"
          />
        </svg>
      </div>

      <div
        v-b-modal.modal-center
        class="jelly-party-navbar-button"
        @click="toggleChatAndJitsi()"
        v-b-tooltip.hover
        :title="
          showChat
            ? 'Switch to video chat (experimental)'
            : 'Swich to text chat'
        "
      >
        <svg
          v-if="showChat"
          width="1em"
          height="1em"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          focusable="false"
          data-prefix="fas"
          data-icon="video"
          class="svg-inline--fa fa-video fa-w-18"
          role="img"
          viewBox="0 0 576 512"
        >
          <path
            fill="currentColor"
            d="M336.2 64H47.8C21.4 64 0 85.4 0 111.8v288.4C0 426.6 21.4 448 47.8 448h288.4c26.4 0 47.8-21.4 47.8-47.8V111.8c0-26.4-21.4-47.8-47.8-47.8zm189.4 37.7L416 177.3v157.4l109.6 75.5c21.2 14.6 50.4-.3 50.4-25.8V127.5c0-25.4-29.1-40.4-50.4-25.8z"
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
          data-icon="comments"
          class="svg-inline--fa fa-comments fa-w-18"
          role="img"
          viewBox="0 0 576 512"
        >
          <path
            fill="currentColor"
            d="M416 192c0-88.4-93.1-160-208-160S0 103.6 0 192c0 34.3 14.1 65.9 38 92-13.4 30.2-35.5 54.2-35.8 54.5-2.2 2.3-2.8 5.7-1.5 8.7S4.8 352 8 352c36.6 0 66.9-12.3 88.7-25 32.2 15.7 70.3 25 111.3 25 114.9 0 208-71.6 208-160zm122 220c23.9-26 38-57.7 38-92 0-66.9-53.5-124.2-129.3-148.1.9 6.6 1.3 13.3 1.3 20.1 0 105.9-107.7 192-240 192-10.8 0-21.3-.8-31.7-1.9C207.8 439.6 281.8 480 368 480c41 0 79.1-9.2 111.3-25 21.8 12.7 52.1 25 88.7 25 3.2 0 6.1-1.9 7.3-4.8 1.3-2.9.7-6.3-1.5-8.7-.3-.3-22.4-24.2-35.8-54.5z"
          />
        </svg>
      </div>

      <div
        v-b-modal.people-inside-party-modal
        class="jelly-party-navbar-button"
        v-b-tooltip.hover
        title="Show people inside party"
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

      <div
        v-b-modal.leave-party-modal
        class="jelly-party-navbar-button"
        v-b-tooltip.hover
        title="Leave party"
      >
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
          <avataaars
            style="height:3.5em; width: 3.5em;"
            :isCircle="true"
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
          ></avataaars>
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
import { party as partyStore } from "@/iFrame/store/party/index";
import { options as optionsStore } from "@/iFrame/store/options/index";
import * as JitsiMeetExternalAPI from "lib-jitsi-meet-dist/dist/external_api.min.js";
import Avataaars from "vuejs-avataaars";

export default {
  components: {
    Avataaars,
  },
  computed: {
    peers() {
      return partyStore.state.peers;
    },
    paused() {
      return partyStore.state.videoState.paused;
    },
    showChat() {
      return partyStore.state.showChat;
    },
  },
  methods: {
    getPeer(uuid) {
      const peer = partyStore.state.peers.find(peer => uuid === peer.uuid);
      return peer;
    },
    leaveParty(cancel) {
      console.log("Jelly-Party: Leaving party");
      this.$root.$party.leaveParty();
      cancel();
    },
    togglePlayPause() {
      console.log("Jelly-Party: Toggling PlayPause.");
      this.$root.$party.togglePlayPause();
    },
    toggleFullScreen() {
      console.log("Jelly-Party: Toggling fullscreen.");
      this.$root.$party.toggleFullScreen();
    },
    toggleChatAndJitsi() {
      console.log("Jelly-Party: Toggling between chat & jitsi.");
      if (!window.jitsiLoaded) {
        window.jitsiLoaded = true;
        const domain = "meet.jit.si";
        const videoContainerName = "Jelly-Party VideoChat";
        const options = {
          roomName: `JellyParty/${partyStore.state.partyId}`,
          width: "350px",
          height: "100%",
          parentNode: document.querySelector("#meet"),
          interfaceConfigOverwrite: {
            APP_NAME: videoContainerName,
            DISABLE_TRANSCRIPTION_SUBTITLES: true,
            DISPLAY_WELCOME_PAGE_CONTENT: true,
            SHOW_CHROME_EXTENSION_BANNER: false,
            HIDE_INVITE_MORE_HEADER: true,
            MOBILE_APP_PROMO: false,
            NATIVE_APP_NAME: videoContainerName,
            CONNECTION_INDICATOR_DISABLED: true,
            TOOLBAR_BUTTONS: [
              "microphone",
              "camera",
              // "closedcaptions",
              // "desktop",
              // "embedmeeting",
              // "fullscreen",
              "fodeviceselection",
              // "hangup",
              // "profile",
              // "chat",
              // "recording",
              // "livestreaming",
              // "etherpad",
              // "sharedvideo",
              // "settings",
              // "raisehand",
              // "videoquality",
              "filmstrip",
              // "invite",
              // "feedback",
              // "stats",
              // "shortcuts",
              // "tileview",
              // "videobackgroundblur",
              // "download",
              // "help",
              // "mute-everyone",
              // "security",
            ],
          },
          configOverwrite: {
            enableWelcomePage: false,
            remoteVideoMenu: {
              disableKick: true,
            },
            // disableRemoteMute: true,
          },
        };
        // eslint-disable-next-line no-undef
        const api = new JitsiMeetExternalAPI(domain, options);
        api.executeCommand("displayName", optionsStore.state.clientName);
      }
      this.$store.commit("party/toggleChatAndJitsi");
    },
  },
  beforeDestroy() {
    window.jitsiLoaded = false;
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
