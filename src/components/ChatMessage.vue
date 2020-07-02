<template>
  <b-container class="pb-4">
    <div class="chatMessage-container">
      <Avataaar
        v-b-tooltip.hover
        :title="getPeer.clientName"
        v-if="!systemMessage"
        style="height:3.5em; width: 3.5em;"
        :accessoriesType="getPeer.avatarState.accessoriesType"
        :clotheType="getPeer.avatarState.clotheType"
        :clotheColor="getPeer.avatarState.clotheColor"
        :eyebrowType="getPeer.avatarState.eyebrowType"
        :eyeType="getPeer.avatarState.eyeType"
        :facialHairColor="getPeer.avatarState.facialHairColor"
        :facialHairType="getPeer.avatarState.facialHairType"
        :graphicType="'Hola'"
        :hairColor="getPeer.avatarState.hairColor"
        :mouthType="getPeer.avatarState.mouthType"
        :skinColor="getPeer.avatarState.skinColor"
        :topType="getPeer.avatarState.topType"
      />
      <div
        v-else
        style="height:3.5em; width: 3.5em;"
        v-b-tooltip.hover
        title="JP"
      >
        <img
          src="@/assets/circular-logo.png"
          style="width: 3.5em; height:3.5em;"
        />
      </div>
      <div class="chatMessage">
        <p class="m-0">{{ chatMessage.data.data.text }}</p>
        <hr
          style="background-color: white; width: 30%; text-align: left; margin: 0.3em 0em;"
        />
        <small>{{ getPeer.clientName }} — {{ timestamp }}</small>
      </div>
    </div>
  </b-container>
</template>

<script>
import Avataaar from "@/browser/vuejs-avataaars/entry.js";
import { party as partyStore } from "@/store/party/index";
import { baseSVG as JellyPartySVG } from "@/browser/jellyPartyFab";

export default {
  components: {
    Avataaar,
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
      JellyPartySVG,
    };
  },
  computed: {
    getPeer: function() {
      if (this.systemMessage) {
        return { clientName: "JP" };
      } else {
        const peer = partyStore.state.peers.find(
          (peer) => this.chatMessage.peer.uuid === peer.uuid
        );
        console.log(peer);
        return peer;
      }
    },
    timestamp: function() {
      const date = new Date(this.chatMessage.data.data.timestamp);
      const padZero = (i) => (String(i).length === 2 ? String(i) : `0${i}`);
      const hours = padZero(date.getHours());
      const minutes = padZero(date.getMinutes());
      const seconds = padZero(date.getMinutes());
      const formattedDate = `${hours}:${minutes}:${seconds}`;
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
  border-radius: 2em;
  background-color: $jellyPartyPurple;
  color: white;
  text-align: left;
  padding: 0.5em 1em;
  flex-grow: 1;
  margin: 0em 0em 0em 1em;
}
</style>
