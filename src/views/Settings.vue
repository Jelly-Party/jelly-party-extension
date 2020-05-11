<template>
  <div class="settings p-3">
    <BackButton goto="/" />
    <h3>Settings</h3>
    <b-row>
      <b-col style="cursor: pointer" @click="customizeAvatar">
        <Avataaar
          style="height:250px;"
          :accessoriesType="avatarState.accessoriesType"
          :clotheType="avatarState.clotheType"
          :clotheColor="avatarState.clotheColor"
          :eyebrowType="avatarState.eyebrowType"
          :eyeType="avatarState.eyeType"
          :facialHairColor="avatarState.facialHairColor"
          :facialHairType="avatarState.facialHairType"
          :graphicType="'Hola'"
          :hairColor="avatarState.hairColor"
          :mouthType="avatarState.mouthType"
          :skinColor="avatarState.skinColor"
          :topType="avatarState.topType"
        />
      </b-col>
    </b-row>

    <b-input-group prepend="Name" class="mt-3">
      <b-form-input
        size="lg"
        v-model="sharedState.localPeerName"
      ></b-form-input>
    </b-input-group>
    <b-row>
      <b-col class="d-flex align-items-center">
        <b-button
          block
          size="lg"
          class="mt-2"
          variant="secondary"
          @click="customizeAvatar"
          >Customize avatar</b-button
        >
      </b-col>
    </b-row>
    <b-row>
      <b-col class="d-flex align-items-center">
        <b-button
          block
          size="lg"
          class="mt-2"
          variant="secondary"
          @click="showConfirmation"
          >Save options</b-button
        >
      </b-col>
    </b-row>
    <b-collapse id="collapse-success" class="mt-2">
      <b-card>
        <p class="card-text">Your changes have been saved.</p>
      </b-card>
    </b-collapse>
  </div>
</template>

<script>
import store from "@/store.js";
import BackButton from "@/components/BackButton.vue";
import { getOptions, setOptions, getAvatarState } from "@/messaging.js";
import Avataaar from "@/browser/vuejs-avataaars/entry.js";

export default {
  components: {
    Avataaar,
    BackButton
  },
  data: function() {
    return { sharedState: store.state, avatarState: store.avatarState };
  },
  methods: {
    handleGoBack: function() {
      this.$router.replace({ path: "/" });
    },
    saveOptions: function() {
      setOptions(
        this.sharedState.localPeerName
          ? this.sharedState.localPeerName
          : "guest"
      );
    },
    showConfirmation: function() {
      this.saveOptions();
      this.$root.$emit("bv::toggle::collapse", "collapse-success");
      window.setTimeout(() => {
        window.scrollBy({
          top: 1000,
          behavior: "smooth"
        });
      }, 500);
      window.setTimeout(() => {
        this.$root.$emit("bv::toggle::collapse", "collapse-success");
      }, 1000);
    },
    customizeAvatar() {
      this.$router.replace({ path: "customizeAvatar" });
    }
  },
  mounted: function() {
    getOptions();
    getAvatarState();
  },
  beforeDestroy: function() {
    this.saveOptions();
  }
};
</script>
