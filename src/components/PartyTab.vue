<template>
  <div class="h-100">
    <div
      v-if="!store.state.connectingToServer && !store.state.connectedToServer"
    >
      <b-container>
        <h3 class="text-white text-center">Getting started</h3>
        <p class="text-justify">
          To begin with, please make sure that all your friends have
          <a href="https://www.jelly-party.com/">Jelly-Party</a> installed. Then
          follow these simple steps:
        </p>
        <ol>
          <li>Customize your avatar and name yourself.</li>
          <li>Press <b>"Start a new party"</b> below.</li>
          <li>Share your magic link.</li>
        </ol>
        <p>
          For more help and to learn about joining manually, please visit the
          help tab above.
        </p>
      </b-container>
      <hr style="background-color: white;" class="my-4" />
      <StarNewPartyComponent />
      <hr style="background-color: white;" class="my-4" />
      <JoinPartyByIdComponent />
      <hr style="background-color: white;" class="my-4" />

      <!-- <h3 class="text-white text-center mt-4">
        Rejoin a previous party
        <span style="font-size: 0.7em">
        <b-icon
          icon="question-circle-fill"
          v-b-tooltip.hover
          title="Perfect if you just want to get started with a new party ASAP."
        >
        </b-icon>
      </span>
      </h3>
      <PreviousPartyList /> -->
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
// import PreviousPartyList from "@/components/PreviousPartyList.vue";
import ChatMessenger from "@/components/ChatMessenger.vue";
import InfoBox from "@/components/InfoBox.vue";
import ControlsBar from "@/components/ControlsBar.vue";
import store from "@/store/store";
import { party as partyStore } from "@/store/party/index";
import JoinPartyByIdComponent from "@/components/JoinPartyByIdComponent.vue";
import StarNewPartyComponent from "@/components/StartNewPartyComponent.vue";

export default {
  components: {
    StarNewPartyComponent,
    // PreviousPartyList,
    InfoBox,
    ControlsBar,
    ChatMessenger,
    JoinPartyByIdComponent,
  },
  data: function() {
    return {
      store,
    };
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

<style lang="scss">
.nav-tabs .nav-link:hover,
.nav-tabs .nav-link:focus {
  border: none;
}
</style>
