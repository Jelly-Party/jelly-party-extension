<template>
  <b-container>
    <h3 class="text-white text-center">
      Start a new party
      <span style="font-size: 0.7em">
        <b-icon
          v-b-tooltip.hover
          icon="question-circle-fill"
          title="Perfect if you just want to get started with a new party ASAP."
        >
        </b-icon>
      </span>
    </h3>
    <JellyPartyPrimaryButton @click.native="startNewParty">
      Start a new party</JellyPartyPrimaryButton
    >
  </b-container>
</template>

<script lang="ts">
import JellyPartyPrimaryButton from "./JellyPartyPrimaryButton.vue";
export default {
  components: {
    JellyPartyPrimaryButton,
  },
  methods: {
    startNewParty() {
      this.$root.$party.startParty();
    },
  },
};
</script>

<style></style>
