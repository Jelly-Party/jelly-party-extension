<template>
  <div id="home">
    <b-button block size="lg" variant="secondary" v-b-modal="'modal-start'">Start a new party</b-button>
    <b-button block size="lg" variant="secondary" @click="showRejoinModal">Rejoin last party</b-button>
    <p class="mt-4 mb-4">or join a party by Id</p>
    <b-input-group class="mt-3">
      <b-form-input size="lg" placeholder="Party Id"></b-form-input>
      <b-input-group-append>
        <b-button size="lg" variant="secondary" v-b-modal="'modal-join'">Join Party</b-button>
      </b-input-group-append>
    </b-input-group>
    <b-modal
      id="modal-start"
      title="Start a new party"
      ok-title="Start party"
      @ok="handleStartParty"
    >
      <p class="my-4">Are you sure you want to start a new party?</p>
    </b-modal>
    <b-modal ref="modal-rejoin" title="Rejoin last party" ok-title="Rejoin Party">
      <p class="my-4">{{`Rejoin last party with Id ${sharedState.lastPartyId}?`}}</p>
    </b-modal>
    <b-modal id="modal-join" title="Join a party by Id" ok-title="Join Party">
      <p class="my-4">Are you sure you want to join this party?</p>
    </b-modal>
    <b-modal
      ref="modal-rejoin-no-party-found"
      title="No previous party found"
      ok-title="Start new Party"
    >
      <p
        class="my-4"
      >We couldn't find a previous party. Would you like to start a new party instead?</p>
    </b-modal>
  </div>
</template>

<script>
// @ is an alias to /src
import store from "@/store.js";
import { startParty, joinParty, rejoinParty } from "@/messaging.js";

export default {
  name: "Home",
  data: function() {
    return { sharedState: store };
  },
  methods: {
    handleStartParty() {
      startParty();
      this.$router.replace({ path: "party" });
    },
    handleJoinParty() {
      joinParty();
      this.$router.replace({ path: "party" });
    },
    handleRejoinParty() {
      rejoinParty();
      this.$router.replace({ path: "party" });
    },
    showRejoinModal() {
      if (this.sharedState.previousPartyId) {
        this.$refs["modal-rejoin"].show();
      } else {
        this.$refs["modal-rejoin-no-party-found"].show();
      }
    }
  }
};
</script>
