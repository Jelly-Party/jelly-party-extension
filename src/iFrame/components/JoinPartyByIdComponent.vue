<template>
  <b-container>
    <h3 class="text-white text-center">
      Join Party by Id
      <span style="font-size: 0.7em">
        <b-icon
          icon="question-circle-fill"
          v-b-tooltip.hover
          title="Necessary for some websites or if you want to sync up different video providers. Requires that you navigate to the video yourself. See help tab for more information."
        >
        </b-icon>
      </span>
    </h3>
    <b-form-input
      class="my-2"
      style="border-radius: 1em; border: 1px;"
      v-model="partyId"
      placeholder="Enter Party Id or make something up.."
    ></b-form-input>

    <JellyPartyPrimaryButton v-on:click.native="joinParty">
      Join Party by Id</JellyPartyPrimaryButton
    >
    <div v-if="lastPartyId" class="text-center">
      <small
        ><span style="user-select: none;">Your last party Id was </span>
        <b>{{ lastPartyId }} </b
        ><a id="rejoinButton" @click="rejoinParty">Rejoin</a></small
      >
    </div>
  </b-container>
</template>

<script>
import JellyPartyPrimaryButton from "./JellyPartyPrimaryButton.vue";
import { options as optionsStore } from "@/iFrame/store/options/index";
export default {
  components: {
    JellyPartyPrimaryButton,
  },
  data: function() {
    return {
      partyId: "",
    };
  },
  methods: {
    joinParty() {
      this.$root.$party.joinParty(this.partyId);
    },
    rejoinParty() {
      this.$root.$party.joinParty(this.lastPartyId);
    },
  },
  computed: {
    lastPartyId() {
      return optionsStore.state.lastPartyId;
    },
  },
};
</script>

<style lang="scss">
#rejoinButton {
  cursor: pointer;
  color: #007bff;
  &:hover {
    color: white;
  }
}
</style>
