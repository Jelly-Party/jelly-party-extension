<template>
  <b-container>
    <h3 class="text-white text-center">
      Join Party by Id
      <span style="font-size: 0.7em">
        <b-icon
          icon="question-circle-fill"
          v-b-tooltip.hover
          title="Necessary for some websites or if you want to sync up different video providers. See help tab for more information."
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
  </b-container>
</template>

<script>
import JellyPartyPrimaryButton from "@/components/JellyPartyPrimaryButton.vue";
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
  },
};
</script>

<style></style>
