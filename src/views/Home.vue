<template>
  <div id="home">
    <b-button block size="lg" variant="secondary" v-b-modal="'modal-start'">Start a new party</b-button>
    <b-button block size="lg" variant="secondary" @click="showRejoinModal">Rejoin last party</b-button>
    <p class="mt-4 mb-4">or join a party by Id</p>
    <b-input-group class="mt-3">
      <b-form-input size="lg" placeholder="Party Id" v-model="partyJoinText"></b-form-input>
      <b-input-group-append>
        <b-button size="lg" variant="secondary" v-b-modal="'modal-join'">Join Party</b-button>
      </b-input-group-append>
    </b-input-group>
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
      <p class="my-4">Are you sure you want to start a new party?</p>
    </b-modal>
    <b-modal
      ref="modal-rejoin"
      title="Rejoin last party"
      ok-title="Rejoin Party"
      @ok="handleRejoinParty"
    >
      <p class="my-4">{{`Rejoin last party with Id ${sharedState.lastPartyId}?`}}</p>
    </b-modal>
    <b-modal id="modal-join" title="Join a party by Id" ok-title="Join Party" @ok="handleJoinParty">
      <p class="my-4">Are you sure you want to join this party?</p>
    </b-modal>
    <b-modal
      ref="modal-rejoin-no-party-found"
      title="No previous party found"
      ok-title="Start new Party"
      @ok="handleStartParty"
    >
      <p
        class="my-4"
      >We couldn't find a previous party. Would you like to start a new party instead?</p>
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
import { startParty, joinParty, rejoinParty } from "@/messaging.js";

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
    handleRejoinParty() {
      rejoinParty();
      this.$router.replace({ path: "party" });
    },
    showRejoinModal() {
      if (this.sharedState.lastPartyId) {
        this.$refs["modal-rejoin"].show();
      } else {
        this.$refs["modal-rejoin-no-party-found"].show();
      }
    },
    goToSettings() {
      this.$router.replace({ path: "settings" });
    }
  }
};
</script>
