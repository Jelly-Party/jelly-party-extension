<template>
  <b-container>
    <h3 class="text-white text-center">Your Avatar</h3>
    <AvatarCustomizer />
    <h3 class="text-white text-center mt-3">Settings</h3>
    <b-form-checkbox v-model="darkMode" name="darkMode-button" switch size="lg">
      Toggle Dark Mode
      <b-icon
        icon="question-circle-fill"
        v-b-tooltip.hover
        title="Switch themes."
      >
      </b-icon>
    </b-form-checkbox>
    <b-form-checkbox
      v-model="statusNotificationsInChat"
      name="onlyIHaveControls-button"
      switch
      size="lg"
    >
      Status notifications in chat
      <b-icon
        icon="question-circle-fill"
        v-b-tooltip.hover
        title="Toggle this option to enable status notifications in the chat, e.g. when somebody play or pauses the video."
      >
      </b-icon>
    </b-form-checkbox>
    <b-form-checkbox
      v-model="statusNotificationsNotyf"
      name="onlyIHaveControls-button"
      switch
      size="lg"
    >
      Popup status notifications
      <b-icon
        icon="question-circle-fill"
        v-b-tooltip.hover
        id="testooltip"
        title="Toggle this option to enable popup status notifications, e.g. when somebody play or pauses the video."
      >
      </b-icon>
    </b-form-checkbox>
    <b-form-checkbox
      v-model="onlyIHaveControls"
      disabled
      name="onlyIHaveControls-button"
      switch
      size="lg"
    >
      Only I have controls
      <b-icon
        icon="question-circle-fill"
        v-b-tooltip.hover
        title="This feature is coming soon. Let us know on Discord if this is something you'd like to see."
      >
        <!-- title="Toggle this option to make you the party admin when creating a party. Changes, like pausing the video, are then only synced if you make them." -->
      </b-icon>
    </b-form-checkbox>
    <b-collapse id="collapse-success" class="mt-2">
      <b-card>
        <p style="color: black" class="card-text text-justify">
          Your changes have been saved. If you're currently inside a party,
          please reload Jelly-Party for the changes to take effect.
        </p>
      </b-card>
    </b-collapse>
    <JellyPartyPrimaryButton
      class="mt-3 pb-5"
      v-on:click.native="showConfirmation"
    >
      Save changes</JellyPartyPrimaryButton
    >
  </b-container>
</template>

<script lang="js">
import { mapFields } from "vuex-map-fields";
import JellyPartyPrimaryButton from "@/components/JellyPartyPrimaryButton.vue";
import AvatarCustomizer from "@/components/AvatarCustomizer.vue";

export default {
  components: {
    AvatarCustomizer,
    JellyPartyPrimaryButton,
  },
  computed: {
    // When using nested data structures, the string
    // after the last dot (e.g. `firstName`) is used
    // for defining the name of the computed property.
    ...mapFields([
      "options.darkMode",
      "options.onlyIHaveControls",
      "options.statusNotificationsInChat",
      "options.statusNotificationsNotyf",
    ]),
  },
  methods: {
    showConfirmation: function() {
      console.log("Jelly-Party: Saving options to chrome local storage.");
      this.$store.dispatch("options/saveOptionsStateToChromeLocalStorage");
      this.$root.$emit("bv::toggle::collapse", "collapse-success");
      window.setTimeout(() => {
        this.$root.$emit("bv::toggle::collapse", "collapse-success");
      }, 5000);
    },
  },
};
</script>

<style></style>
