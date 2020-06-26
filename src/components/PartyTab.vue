<template>
  <div>
    <div v-if="!store.state.connectingToServer">
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
    </div>
    <div
      v-else
      style="display:flex; align-items:center; justify-content:center;"
    >
      <div>
        <h3 class="text-center">Joining your awesome party..</h3>
        <div class="text-center">
          <b-spinner
            style="width: 3rem; height: 3rem;"
            variant="warning"
            type="grow"
            label="Spinning"
          ></b-spinner>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import JellyPartyPrimaryButton from "@/components/JellyPartyPrimaryButton.vue";
import PreviousPartyList from "@/components/PreviousPartyList.vue";
import store from "@/store/store";

export default {
  components: { JellyPartyPrimaryButton, PreviousPartyList },
  data: function() {
    return {
      store,
    };
  },
  methods: {
    startNewParty() {
      console.log(this);
      this.$root.$party.startParty();
    },
  },
};
</script>

<style></style>
