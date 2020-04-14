<template>
  <div class="settings">
    <h3>Settings</h3>
    <b-input-group prepend="Name" class="mt-3">
      <b-form-input
        size="lg"
        v-model="sharedState.localPeerName"
      ></b-form-input>
    </b-input-group>
    <b-button
      block
      size="lg"
      class="mt-2"
      @click="saveOptions"
      variant="secondary"
      >Update</b-button
    >
    <b-button
      block
      size="lg"
      class="mt-2"
      @click="handleGoBack"
      variant="secondary"
      >Go back</b-button
    >
    <b-collapse id="collapse-success" class="mt-2">
      <b-card>
        <p class="card-text">Your changes have been saved.</p>
      </b-card>
    </b-collapse>
  </div>
</template>

<script>
import store from "@/store.js";
import { getOptions, setOptions } from "@/messaging.js";

export default {
  data: function() {
    return { sharedState: store.state };
  },
  methods: {
    handleGoBack: function() {
      this.$router.replace({ path: "/" });
    },
    saveOptions: function() {
      setOptions(this.sharedState.localPeerName);
      this.$root.$emit("bv::toggle::collapse", "collapse-success");
      window.setTimeout(() => {
        this.$root.$emit("bv::toggle::collapse", "collapse-success");
      }, 2000);
    }
  },
  created: function() {
    getOptions();
  }
};
</script>
