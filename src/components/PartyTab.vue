<template>
  <div>
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
    <div v-if="store.state.connectedToServer">
      <div>
        <InfoBox heading="Party Id" text="easy-thieves-walk-quickly" />
        <InfoBox
          heading="Magic link"
          text="https://join.jelly-party-com/?partyId=this-is-a-test-id-and-it-should-be-long-enough-plus-there'll-be-more-information"
        />
        <div class="text-center">
          <small
            >Share this magic link to let other people join your party.</small
          >
        </div>
        <hr style="background-color: white;" />
      </div>
      <div>
        <ChatMessenger />
      </div>
    </div>
  </div>
</template>

<script>
import JellyPartyPrimaryButton from "@/components/JellyPartyPrimaryButton.vue";
import PreviousPartyList from "@/components/PreviousPartyList.vue";
import ChatMessenger from "@/components/ChatMessenger.vue";
import InfoBox from "@/components/InfoBox.vue";
import store from "@/store/store";

export default {
  components: {
    JellyPartyPrimaryButton,
    PreviousPartyList,
    InfoBox,
    ChatMessenger,
  },
  data: function() {
    return {
      store,
    };
  },
  methods: {
    startNewParty() {
      console.log(this);
      this.$root.$party.startParty();
    },
  },
};
</script>

<style></style>
