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
        <span class="font-weight-bold">{{ avatarState[optionsKey] }}</span>
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

<script lang="ts">
import allOptions from "@/helpers/avatar/avatarOptions.js";
import { appState } from "../IFrame";
import { computed } from "vue";

export default {
  props: {
    optionsKey: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const optionsValues = computed(() => {
      let key = props.optionsKey;
      switch (props.optionsKey) {
        case "facialHairColor":
          key = "hairColor";
          break;
        case "clotheColor":
          key = "hatAndShirtColor";
          break;
      }
      const values = allOptions[key];
      return values;
    });
    const avatarState = computed(() => {
      return appState.OptionsState.avatarState;
    });
    function nextOption() {
      const index = optionsValues.value.indexOf(
        avatarState.value[props.optionsKey],
      );
      let newOption = "";
      if (index >= 0 && index < optionsValues.value.length - 1) {
        newOption = optionsValues.value[index + 1];
      } else {
        newOption = optionsValues.value[0];
      }
      appState.OptionsState.avatarState[props.optionsKey] = newOption;
    }

    function previousOption() {
      const index = optionsValues.value.indexOf(
        avatarState.value[props.optionsKey],
      );
      let newOption = "";
      if (index >= 1 && index < optionsValues.value.length) {
        newOption = optionsValues.value[index - 1];
      } else {
        newOption = optionsValues.value[optionsValues.value.length - 1];
      }
      appState.OptionsState.avatarState[props.optionsKey] = newOption;
    }
    return { optionsValues, avatarState, nextOption, previousOption };
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
