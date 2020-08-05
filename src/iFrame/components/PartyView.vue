<template>
  <div v-if="connectedToServer" id="party-view" class="d-flex flex-column">
    <div style="height: var(--jelly-party-controls-height)">
      <InfoBox
        heading="Magic link"
        :text="magicLink"
        :tooltip="
          `Share this magic link to let other people join your party. Your Party Id is: ${partyId}`
        "
      />
      <ControlsBar />
      <hr style="background-color: white;" class="mb-0" />
    </div>
    <ChatMessenger
      class="text-white"
      style="height: calc(100% - var(--jelly-party-controls-height))"
    />
  </div>
</template>

<script>
import ChatMessenger from "./ChatMessenger.vue";
import InfoBox from "./InfoBox.vue";
import ControlsBar from "./ControlsBar.vue";
import { party as partyStore } from "@/iFrame/store/party/index";
import { mapState } from "vuex";

export default {
  components: {
    InfoBox,
    ControlsBar,
    ChatMessenger,
  },
  computed: {
    ...mapState(["connectedToServer"]),
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
#party-view {
  height: calc(100vh - var(--jelly-party-header-height));
}
</style>
