<template>
  <div id="partyOverview">
    <b-button
      block
      size="lg"
      variant="secondary"
      v-b-modal="'modal-leave-party'"
      >Leave current party</b-button
    >
    <h3 class="mt-3">
      Current party
      <span style="font-size: 1em">
        <b-icon-question-square-fill id="questionmark" />
      </span>
    </h3>
    <b-input-group class="mt-3">
      <b-form-input
        readonly
        v-bind:value="sharedState.magicLink"
      ></b-form-input>
      <b-input-group-append>
        <b-button v-clipboard:copy="sharedState.magicLink" variant="secondary"
          >Copy</b-button
        >
      </b-input-group-append>
    </b-input-group>
    <b-table class="mb-5" dark striped hover :items="listData"></b-table>
    <div class="websiteStatus">
      <b-icon-circle-fill
        v-bind:color="websiteStatusFillColor"
      ></b-icon-circle-fill>
      {{
        sharedState.websiteIsTested ? "Website tested" : "Website experimental"
      }}
    </div>
    <div class="connectionStatus">
      {{ sharedState.wsIsConnected ? "Connected" : "Connection error" }}
      <b-icon-circle-fill
        v-bind:color="connectionStatusFillColor"
      ></b-icon-circle-fill>
    </div>
    <b-modal
      id="modal-leave-party"
      title="Leave current party"
      ok-title="Leave Party"
      @ok="handleLeaveParty"
    >
      <p class="my-4">Are you sure you want to leave your current party?</p>
    </b-modal>
    <b-tooltip
      target="questionmark"
      title="Share this Party Id and let people join your party!"
    ></b-tooltip>
  </div>
</template>

<style scoped>
.connectionStatus {
  position: absolute;
  bottom: 1em;
  right: 1em;
  font-size: 0.7em;
}

.websiteStatus {
  position: absolute;
  bottom: 1em;
  left: 1em;
  font-size: 0.7em;
}
</style>

<script>
import store from "@/store.js";
import { leaveParty } from "@/messaging.js";

export default {
  name: "Party",
  data: function() {
    return { sharedState: store.state };
  },
  methods: {
    handleLeaveParty: function() {
      leaveParty();
      this.$router.replace({ path: "/" });
    }
  },
  computed: {
    listData: function() {
      return this.sharedState.peers
        ? this.sharedState.peers.map((peer, index) => ({
            "#": index + 1,
            Name: peer.clientName,
            currentlyWatching: peer.currentlyWatching
          }))
        : [];
    },
    connectionStatusFillColor: function() {
      return this.sharedState.wsIsConnected ? "green" : "red";
    },
    websiteStatusFillColor: function() {
      return this.sharedState.websiteIsTested ? "green" : "#FFC107";
    },
    tooltipText: function() {
      return this.sharedState.websiteIsTested
        ? "Share this magic link and let people join your party. Upon opening the link, members have to click on the Jelly-Party logo to initialize the session."
        : "Share this Id and send it to people. People can then join your party by Id.";
    }
  }
};
</script>
