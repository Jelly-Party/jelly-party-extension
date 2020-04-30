<template>
  <div id="home">
    <div>
      <b-button block size="lg" variant="secondary" v-b-modal="'modal-start'"
        >Start a new party</b-button
      >
      <p class="mt-3 mb-3">or join a party by Id</p>
    </div>
    <b-input-group class="">
      <b-form-input
        size="lg"
        placeholder="Party Id"
        v-model="partyJoinText"
      ></b-form-input>
      <b-input-group-append>
        <b-button size="lg" variant="secondary" v-b-modal="'modal-join'"
          >Join Party</b-button
        >
      </b-input-group-append>
    </b-input-group>
    <p class="text-center mt-2" style="font-size: 0.7em">
      <span style="user-select: none">Your last party ID was </span>
      <b>{{ sharedState.lastPartyId }}</b>
    </p>
    <div class="settingsIcon">
      <b-button @click="goToSettings" size="sm" title="Settings">
        <b-icon icon="gear-fill" aria-hidden="true"></b-icon>
      </b-button>
    </div>
    <b-modal
      id="modal-start"
      title="Start a new party"
      ok-title="Start party"
      @ok="handleStartParty"
    >
      <p class="text-justify">
        Are you sure you want to start a new party?
      </p>
      <span class="text-justify font-weight-bold">
        {{
          sharedState.video
            ? ""
            : "Jelly-Party could not yet a find a video on this website. You will be notified once a video has been detected."
        }}
      </span>
    </b-modal>
    <b-modal
      id="modal-join"
      title="Join a party by Id"
      ok-title="Join Party"
      @ok="handleJoinParty"
    >
      <p class="text-justify">
        Are you sure you want to join this party?
      </p>
      <p class="font-weight-bold text-justify">
        You are in charge to navigate to the correct video yourself.
      </p>
      <span class="text-justify font-weight-bold">
        {{
          sharedState.video
            ? ""
            : "Jelly-Party could not yet a find a video on this website. You will be notified once a video has been detected."
        }}
      </span>
    </b-modal>
  </div>
</template>

<style scoped>
.settingsIcon {
  position: absolute;
  bottom: 1em;
  right: 1em;
}
</style>

<script>
// @ is an alias to /src
import store from "@/store.js";
import { startParty, joinParty } from "@/messaging.js";

export default {
  name: "Home",
  data: function() {
    return { sharedState: store.state, partyJoinText: "" };
  },
  methods: {
    handleStartParty() {
      startParty();
      this.$router.replace({ path: "party" });
    },
    handleJoinParty() {
      joinParty(this.partyJoinText);
      this.$router.replace({ path: "party" });
    },
    goToSettings() {
      this.$router.replace({ path: "settings" });
    },
  },
  watch: {
    "sharedState.isActive": function(isActive, wasActive) {
      if (isActive) {
        this.$router.replace({ path: "party" });
      }
    },
  },
};
</script>
