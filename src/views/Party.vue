<template>
  <div id="partyOverview">
    <b-button
      block
      size="lg"
      variant="secondary"
      v-b-modal="'modal-leave-party'"
    >Leave current party</b-button>
    <h3 class="mt-3">
      Current party
      <span style="font-size: 1em">
        <b-icon-question-square-fill id="questionmark" />
      </span>
    </h3>
    <b-input-group class="mt-3">
      <b-form-input readonly v-bind:value="sharedState.partyId"></b-form-input>
      <b-input-group-append>
        <b-button v-clipboard:copy="sharedState.partyId" variant="secondary">Copy</b-button>
      </b-input-group-append>
    </b-input-group>
    <b-table dark striped hover :items="listData"></b-table>
    <b-modal
      id="modal-leave-party"
      title="Leave current party"
      ok-title="Leave Party"
      @ok="handleLeaveParty"
    >
      <p class="my-4">Are you sure you want to leave your current party?</p>
    </b-modal>
    <!-- Tooltip title specified via prop title -->
    <b-tooltip target="questionmark" title="Share this Party Id and let people join your party!"></b-tooltip>
  </div>
</template>

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
    }
  }
};
</script>