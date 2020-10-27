<template>
  <b-container>
    <h3 class="text-white text-center">
      Join Party by Id
      <span style="font-size: 0.7em">
        <b-icon
          v-b-tooltip.hover
          icon="question-circle-fill"
          title="Necessary for some websites or if you want to sync up different video providers. Requires that you navigate to the video yourself. See help tab for more information."
        />
      </span>
    </h3>
    <b-form-input
      v-model="partyId"
      class="my-2"
      style="border-radius: 1em; border: 1px;"
      placeholder="Enter Party Id or make something up.."
    />

    <JellyPartyPrimaryButton @click.native="joinParty">
      Join Party by Id
    </JellyPartyPrimaryButton>
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
import { appState } from "../IFrame";
export default {
  components: {
    JellyPartyPrimaryButton,
  },
  data: function() {
    return {
      partyId: "",
    };
  },
  computed: {
    lastPartyId() {
      return appState.OptionsState.lastPartyId;
    },
  },
  methods: {
    joinParty() {
      this.$root.$party.joinParty(this.partyId);
    },
    rejoinParty() {
      this.$root.$party.joinParty(this.lastPartyId);
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
