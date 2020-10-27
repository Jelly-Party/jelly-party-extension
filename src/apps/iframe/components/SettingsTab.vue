<template>
  <b-container>
    <h3 class="text-white text-center">Your Avatar</h3>
    <AvatarCustomizer />
    <b-form-checkbox
      v-model="optionsState.darkMode"
      name="darkMode-button"
      switch
      size="lg"
      class="mt-3"
    >
      Enable Dark Mode
      <b-icon
        v-b-tooltip.hover
        icon="question-circle-fill"
        title="Switch themes."
      >
      </b-icon>
    </b-form-checkbox>
    <b-form-checkbox
      v-model="optionsState.statusNotificationsInChat"
      name="onlyIHaveControls-button"
      switch
      size="lg"
    >
      Status notifications in chat
      <b-icon
        v-b-tooltip.hover
        icon="question-circle-fill"
        title="Toggle this option to enable status notifications in the chat, e.g. when somebody plays or pauses the video."
      >
      </b-icon>
    </b-form-checkbox>
    <b-form-checkbox
      v-model="optionsState.statusNotificationsNotyf"
      name="onlyIHaveControls-button"
      switch
      size="lg"
    >
      Popup status notifications
      <b-icon
        v-b-tooltip.hover
        icon="question-circle-fill"
        title="Toggle this option to enable popup status notifications, e.g. when somebody plays or pauses the video."
      >
      </b-icon>
    </b-form-checkbox>
    <b-form-checkbox
      v-model="optionsState.showNotificationsForSelf"
      name="showNotificationsForSelf-button"
      switch
      size="lg"
    >
      Show notifications when you play/pause/seek
      <b-icon
        v-b-tooltip.hover
        icon="question-circle-fill"
        title="Toggle this option to enable notifications when you play, pause or seek the video."
      >
      </b-icon>
    </b-form-checkbox>
    <b-form-checkbox
      v-model="optionsState.onlyIHaveControls"
      disabled
      name="onlyIHaveControls-button"
      switch
      size="lg"
    >
      Only I have controls
      <b-icon
        v-b-tooltip.hover
        icon="question-circle-fill"
        title="This feature is coming soon. Let us know on Discord if this is something you'd like to see."
      >
        <!-- title="Toggle this option to make you the party admin when creating a party. Changes, like pausing the video, are then only synced if you make them." -->
      </b-icon>
    </b-form-checkbox>
    <b-collapse id="collapse-success" class="mt-2">
      <b-card>
        <p style="color: black" class="card-text text-justify">
          Your changes have been saved.
        </p>
      </b-card>
    </b-collapse>
    <JellyPartyPrimaryButton class="mt-3 pb-5" @click.native="showConfirmation">
      Save changes</JellyPartyPrimaryButton
    >
  </b-container>
</template>

<script lang="ts">
import JellyPartyPrimaryButton from "./JellyPartyPrimaryButton.vue";
import AvatarCustomizer from "./AvatarCustomizer.vue";
import { appState } from "../IFrame";

export default {
  components: {
    AvatarCustomizer,
    JellyPartyPrimaryButton,
  },
  computed: {
    optionsState() {
      return appState.OptionsState;
    },
  },
  methods: {
    showConfirmation: function() {
      if (this.clientName.length < 2) {
        alert("Please choose a name that's longer than 2 characters");
      } else {
        // eslint-disable-next-line vue/custom-event-name-casing
        this.$root.$emit("bv::toggle::collapse", "collapse-success");
        window.setTimeout(() => {
          // eslint-disable-next-line vue/custom-event-name-casing
          this.$root.$emit("bv::toggle::collapse", "collapse-success");
        }, 1000);
        this.$root.$iframe.setOptions();
      }
    },
  },
};
</script>

<style></style>
