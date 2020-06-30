<template>
  <div class="text-center">
    <small>{{ readableoptionsKey }}</small>
    <div class="avatar-slider-option mb-2 w-100 d-flex align-items-center">
      <b-btn
        class="avatar-slider-button avatar-slider-button--left"
        @click="previousOption"
        ><b-icon-arrow-left-short
          class="font-weight-bold"
        ></b-icon-arrow-left-short
      ></b-btn>
      <div
        class="w-100 option-inline-text d-flex align-items-center justify-content-center"
      >
        <span class="font-weight-bold">{{ avatarState[this.optionsKey] }}</span>
      </div>
      <b-btn
        class="avatar-slider-button avatar-slider-button--right"
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

const readableOptions = {
  accessoriesType: "Accessories",
  clotheColor: "Clothes color",
  clotheType: "Clothes",
  eyebrowType: "Eye Brows",
  eyeType: "Eyes",
  facialHairColor: "Facial hair color",
  facialHairType: "Facial hair",
  graphicType: "Graphic",
  hairColor: "Hair color",
  mouthType: "Mouth",
  skinColor: "Skin color",
  topType: "Top",
};

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
        this.avatarState[this.optionsKey]
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
        this.avatarState[this.optionsKey]
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
    readableoptionsKey: function() {
      return readableOptions[this.optionsKey];
    },
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
  padding: calc(0.375rem + 2px) 0.75rem;
  &--right {
    border-top-left-radius: 0px;
    border-bottom-left-radius: 0px;
  }
  &--left {
    border-top-right-radius: 0px;
    border-bottom-right-radius: 0px;
  }
}
.option-inline-text {
  border-top: 2px solid gray;
  border-bottom: 2px solid gray;
  height: 38px;
}
</style>
