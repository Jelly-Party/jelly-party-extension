<template>
  <div id="partyOverview" class="p-3">
    <h3>
      Current party
      <span style="font-size: 1em">
        <b-icon-question-circle-fill id="questionmark" />
      </span>
    </h3>
    <p style="font-size:1.2em">
      <span style="user-select: none; font-weight: bold">Party-Id:</span>
      <span class="badge badge-info"> {{ sharedState.partyId }} </span>
    </p>
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
    <b-table dark striped hover :items="listData">
      <template v-slot:cell(peer)="data">
        <!-- Purify html to mitigate XSS attack vector -->
        <div
          style="display: inline-block"
          v-dompurify-html="data.item.peer.favicon"
        ></div>
        {{ data.item.peer.name }}
      </template>
      <template v-slot:cell(status)="data">
        <!-- Purify html to mitigate XSS attack vector -->
        <div v-dompurify-html="data.item.status"></div>
      </template>
    </b-table>
    <b-button
      block
      size="lg"
      variant="secondary"
      v-b-modal="'modal-leave-party'"
      class="mb-5"
      >Leave current party</b-button
    >
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
      title="Share the magic link and let people join your party by simply opening the link or share the party Id and let people join your party manually."
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

const toHHMMSS = secs => {
  let sec_num = parseInt(secs, 10);
  let hours = Math.floor(sec_num / 3600);
  let minutes = Math.floor(sec_num / 60) % 60;
  let seconds = sec_num % 60;

  return [hours, minutes, seconds]
    .map(v => (v < 10 ? "0" + v : v))
    .filter((v, i) => v !== "00" || i > 0)
    .join(":");
};

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
        ? this.sharedState.peers.map(peer => ({
            peer: {
              name: peer.clientName,
              favicon: peer.favicon
                ? `<img src="${peer.favicon}" alt="Favicon" style="display: inline-block; height:1em; width: 1em;"></img>`
                : ""
            },
            status: `${
              peer.videoState.paused
                ? '<span class="badge badge-warning">Paused</span>'
                : '<span class="badge badge-success">Playing</span>'
            } <span class="badge badge-secondary">${toHHMMSS(
              Math.floor(peer.videoState.currentTime)
            )}</span>`
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
