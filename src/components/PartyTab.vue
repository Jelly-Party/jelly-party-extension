<template>
  <div class="h-100">
    <div
      v-if="!store.state.connectingToServer && !store.state.connectedToServer"
    >
      <h3 class="text-white text-center">Start something new</h3>
      <div class="d-flex flex-column mr-5 ml-5 mt-4">
        <JellyPartyPrimaryButton v-on:click.native="startNewParty">
          Start a new party</JellyPartyPrimaryButton
        >
      </div>
      <h3 class="text-white text-center mt-4">
        Join a previous party
      </h3>
      <PreviousPartyList />
      <div id="videoIframe" />
    </div>
    <div
      v-if="store.state.connectingToServer"
      style="display:flex; align-items:center; justify-content:center;"
    >
      <div>
        <h3 class="text-center">Joining your awesome party..</h3>
        <div class="text-center">
          <b-spinner
            style="width: 3rem; height: 3rem;"
            variant="warning"
            type="grow"
            label="Spinning"
          ></b-spinner>
        </div>
      </div>
    </div>
    <div v-if="store.state.connectedToServer" class="h-100 d-flex flex-column">
      <div style="height: var(--party-tab-header)">
        <ControlsBar />
        <InfoBox heading="Party Id" :text="partyId" />
        <InfoBox heading="Magic link" :text="magicLink" />
        <div class="text-center">
          <small class="text-white"
            >Share this magic link to let other people join your party.</small
          >
        </div>
        <hr style="background-color: white;" />
      </div>
      <ChatMessenger
        class="text-white"
        style="height: calc(100% - var(--party-tab-header))"
      />
    </div>
  </div>
</template>

<script>
import JellyPartyPrimaryButton from "@/components/JellyPartyPrimaryButton.vue";
import PreviousPartyList from "@/components/PreviousPartyList.vue";
import ChatMessenger from "@/components/ChatMessenger.vue";
import InfoBox from "@/components/InfoBox.vue";
import ControlsBar from "@/components/ControlsBar.vue";
import store from "@/store/store";
import { party as partyStore } from "@/store/party/index";

export default {
  components: {
    JellyPartyPrimaryButton,
    PreviousPartyList,
    InfoBox,
    ControlsBar,
    ChatMessenger,
  },
  data: function() {
    return {
      store,
    };
  },
  methods: {
    startNewParty() {
      this.$root.$party.startParty();
    },
  },
  computed: {
    magicLink() {
      return partyStore.state.magicLink;
    },
    partyId() {
      return partyStore.state.partyId;
    },
  },
};
</script>

<style></style>
