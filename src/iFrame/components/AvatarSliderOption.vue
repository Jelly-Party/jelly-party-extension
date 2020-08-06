<template>
  <div class="text-center">
    <div class="avatar-slider-option mb-1 w-100 d-flex align-items-center">
      <b-btn
        class="avatar-slider-button avatar-slider-button--left avatar-selection"
        @click="previousOption"
        ><b-icon-arrow-left-short
          class="font-weight-bold"
        ></b-icon-arrow-left-short
      ></b-btn>
      <div
        class="w-100 option-inline-text d-flex align-items-center justify-content-center overflow-hidden"
      >
        <span class="font-weight-bold">{{ avatarState[this.optionsKey] }}</span>
      </div>
      <b-btn
        class="avatar-slider-button avatar-slider-button--right avatar-selection"
        @click="nextOption"
      >
        <b-icon-arrow-right-short
          class="font-weight-bold"
        ></b-icon-arrow-right-short>
      </b-btn>
    </div>
  </div>
</template>

<script>
import allOptions from "@/helpers/avatarOptions.js";

export default {
  props: {
    optionsKey: {
      type: String,
      required: true,
    },
  },
  methods: {
    nextOption: function() {
      const index = this.optionsValues.indexOf(
        this.avatarState[this.optionsKey],
      );
      let newOption = "";
      if (index >= 0 && index < this.optionsValues.length - 1) {
        newOption = this.optionsValues[index + 1];
      } else {
        newOption = this.optionsValues[0];
      }
      this.$store.dispatch("options/updateAvatarState", {
        stateKey: this.optionsKey,
        newState: newOption,
      });
    },
    previousOption: function() {
      const index = this.optionsValues.indexOf(
        this.avatarState[this.optionsKey],
      );
      let newOption = "";
      if (index >= 1 && index < this.optionsValues.length) {
        newOption = this.optionsValues[index - 1];
      } else {
        newOption = this.optionsValues[this.optionsValues.length - 1];
      }
      this.$store.dispatch("options/updateAvatarState", {
        stateKey: this.optionsKey,
        newState: newOption,
      });
    },
  },
  computed: {
    optionsValues: function() {
      let key = this.optionsKey;
      switch (this.optionsKey) {
        case "facialHairColor":
          key = "hairColor";
          break;
        case "clotheColor":
          key = "hatAndShirtColor";
          break;
      }
      const values = allOptions[key];
      return values;
    },
    avatarState() {
      return this.$store.state.options.avatarState;
    },
  },
};
</script>

<style lang="scss">
.avatar-slider-option {
  justify-content: space-between;
}
.avatar-slider-button {
  background-color: transparent !important;
  border: 2px solid white !important;
  padding: calc(0.375rem - 1px) 0.75rem !important;
  &--right {
    border-top-left-radius: 0px !important;
    border-bottom-left-radius: 0px !important;
  }
  &--left {
    border-top-right-radius: 0px !important;
    border-bottom-right-radius: 0px !important;
  }
}
.option-inline-text {
  border-top: 2px solid white;
  border-bottom: 2px solid white;
  height: 38px;
}
</style>
