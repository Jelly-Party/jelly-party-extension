<template>
  <div>
    <h3 class="text-white text-center">Start something new</h3>
    <div class="d-flex flex-column mr-5 ml-5 mt-4">
      <JellyPartyPrimaryButton v-on:click.native="startNewParty">
        Start a new party</JellyPartyPrimaryButton
      >
    </div>
    <h3 class="text-white text-center mt-4">
      Join a previous party
    </h3>
    <PreviousPartyList />
    <div id="videoIframe" />
    <div>
      <!-- Using modifiers -->
      <b-button v-b-modal.my-modal>Show Modal</b-button>

      <!-- Using value -->
      <b-button v-b-modal="'my-modal'">Show Modal</b-button>

      <!-- The modal -->
      <b-modal id="my-modal">Hello From My Modal!</b-modal>
    </div>
  </div>
</template>

<script>
import JellyPartyPrimaryButton from "@/components/JellyPartyPrimaryButton.vue";
import PreviousPartyList from "@/components/PreviousPartyList.vue";
export default {
  components: { JellyPartyPrimaryButton, PreviousPartyList },
  methods: {
    startNewParty() {
      console.log(this);
      this.$root.$party.startParty();
    },
  },
};
</script>

<style></style>
