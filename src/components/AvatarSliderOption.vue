<template>
  <div>
    <small>{{ readableoptionsKey }}</small>
    <div class="avatar-slider-option mb-2 w-100 d-flex align-items-center">
      <b-btn
        style="border-top-right-radius: 0px; border-bottom-right-radius: 0px;"
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
        style="border-top-left-radius: 0px; border-bottom-left-radius: 0px;"
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
import store from "@/store.js";
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
  topType: "Top"
};

export default {
  props: {
    options: {
      type: Array,
      default: function() {
        return ["White", "Pink", "Yellow"];
      }
    },
    optionsKey: {
      type: String,
      default: "accessoriesType"
    }
  },
  data: function() {
    return {
      avatarState: store.avatarState
    };
  },
  methods: {
    nextOption: function() {
      console.log(this.options);
      let index = this.options.indexOf(this.avatarState[this.optionsKey]);
      let newState = "";
      if (index >= 0 && index < this.options.length - 1) {
        newState = this.options[index + 1];
      } else {
        newState = this.options[0];
      }
      let update = {};
      update[this.optionsKey] = newState;
      store.updateAvatarState(update);
    },
    previousOption: function() {
      let index = this.options.indexOf(this.avatarState[this.optionsKey]);
      let newState = "";
      if (index >= 1 && index < this.options.length) {
        newState = this.options[index - 1];
      } else {
        newState = this.options[this.options.length - 1];
      }
      let update = {};
      update[this.optionsKey] = newState;
      store.updateAvatarState(update);
    }
  },
  computed: {
    readableoptionsKey: function() {
      return readableOptions[this.optionsKey];
    }
  }
};
</script>

<style>
.avatar-slider-option {
  height: 100%;
  justify-content: space-between;
}
.option-inline-text {
  border-top: 2px solid gray;
  border-bottom: 2px solid gray;
  height: 38px;
}
</style>
