<template>
  <b-container>
    <h3 class="text-white text-center">
      Start a new party
      <span style="font-size: 0.7em">
        <b-icon
          icon="question-circle-fill"
          v-b-tooltip.hover
          title="Perfect if you just want to get started with a new party ASAP."
        >
        </b-icon>
      </span>
    </h3>
    <JellyPartyPrimaryButton v-on:click.native="startNewParty">
      Start a new party</JellyPartyPrimaryButton
    >
  </b-container>
</template>

<script>
import JellyPartyPrimaryButton from "@/components/JellyPartyPrimaryButton.vue";
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
