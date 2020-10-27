<template>
  <b-container class="pb-3">
    <div
      v-if="chatMessage.peer.uuid === 'jellyPartyLogMessage'"
      class="text-center"
    >
      <small> {{ chatMessage.data.text }} </small>
    </div>
    <div v-else class="chatMessage-container">
      <div v-if="!systemMessage" style="height: 4em; width: 4em;">
        <avataaars
          v-b-tooltip.hover
          style="height:4em; width: 4em;"
          :is-circle="true"
          :title="getPeer.clientName"
          :accessories-type="getPeer.avatarState.accessoriesType"
          :clothe-type="getPeer.avatarState.clotheType"
          :clothe-color="getPeer.avatarState.clotheColor"
          :eyebrow-type="getPeer.avatarState.eyebrowType"
          :eye-type="getPeer.avatarState.eyeType"
          :facial-hair-color="getPeer.avatarState.facialHairColor"
          :facial-hair-type="getPeer.avatarState.facialHairType"
          :graphic-type="'Hola'"
          :hair-color="getPeer.avatarState.hairColor"
          :mouth-type="getPeer.avatarState.mouthType"
          :skin-color="getPeer.avatarState.skinColor"
          :top-type="getPeer.avatarState.topType"
        ></avataaars>
      </div>
      <div
        v-else
        v-b-tooltip.hover
        style="height:3.5em; width: 3.5em;"
        title="Jelly"
      >
        <img
          src="@/assets/images/circular-logo.png"
          style="width: 3.5em; height:3.5em;"
        />
      </div>
      <div class="chatMessage">
        <!-- :style="{ order: messageFromSelf ? '2' : '1' }" -->
        <p class="m-0">{{ chatMessage.data.text }}</p>
        <hr
          style="background-color: white; width: 30%; text-align: left; margin: 0em;"
        />
        <small>{{ getPeer.clientName }} — {{ timestamp }}</small>
      </div>
    </div>
  </b-container>
</template>

<script>
import Avataaars from "vuejs-avataaars";
import { appState } from "../IFrame";
import { jellyFishWithoutNotification as JellyPartySVG } from "@/helpers/svgs.ts";

export default {
  components: {
    Avataaars,
  },
  props: {
    chatMessage: {
      type: Object,
      required: true,
    },
  },
  data: function() {
    return {
      systemMessage: this.chatMessage.peer.uuid === "jellyPartySupportBot",
      messageFromSelf:
        this.chatMessage.peer.uuid === appState.PartyState.selfUUID,
      JellyPartySVG,
    };
  },
  computed: {
    getPeer: function() {
      if (this.systemMessage) {
        return { clientName: "Jelly" };
      } else {
        const peer = appState.PartyState.cachedPeers.find(
          peer => this.chatMessage.peer.uuid === peer.uuid,
        );
        return peer;
      }
    },
    timestamp: function() {
      const date = new Date(this.chatMessage.data.timestamp);
      const padZero = i => (String(i).length === 2 ? String(i) : `0${i}`);
      const hours = padZero(date.getHours());
      const minutes = padZero(date.getMinutes());
      const formattedDate = `${hours}:${minutes}`;
      return formattedDate;
    },
  },
};
</script>

<style lang="scss">
.chatMessage-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.chatMessage {
  border-radius: 1em;
  background-color: $jellyPartyPurple;
  color: white;
  text-align: left;
  padding: 0.5em 1em;
  flex-grow: 1;
  margin: 0em 0em 0em 1em;
  overflow-wrap: anywhere;
}
</style>
