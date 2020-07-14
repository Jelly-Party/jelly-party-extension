<template>
  <b-container id="avatar-customizer">
    <div
      id="categoryHeading"
      class="d-flex align-items-center justify-content-between"
    >
      <svg
        @click="selectCategory('next')"
        width="2em"
        height="2em"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        data-prefix="fas"
        data-icon="chevron-circle-left"
        class="svg-inline--fa fa-chevron-circle-left fa-w-16 avatar-selection"
        role="img"
        viewBox="0 0 512 512"
      >
        <path
          fill="currentColor"
          d="M256 504C119 504 8 393 8 256S119 8 256 8s248 111 248 248-111 248-248 248zM142.1 273l135.5 135.5c9.4 9.4 24.6 9.4 33.9 0l17-17c9.4-9.4 9.4-24.6 0-33.9L226.9 256l101.6-101.6c9.4-9.4 9.4-24.6 0-33.9l-17-17c-9.4-9.4-24.6-9.4-33.9 0L142.1 239c-9.4 9.4-9.4 24.6 0 34z"
        />
      </svg>
      <h4 class="m-0">{{ readableCategory }}</h4>
      <svg
        @click="selectCategory('previous')"
        width="2em"
        height="2em"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        data-prefix="fas"
        data-icon="chevron-circle-right"
        class="svg-inline--fa fa-chevron-circle-right fa-w-16 avatar-selection"
        role="img"
        viewBox="0 0 512 512"
      >
        <path
          fill="currentColor"
          d="M256 8c137 0 248 111 248 248S393 504 256 504 8 393 8 256 119 8 256 8zm113.9 231L234.4 103.5c-9.4-9.4-24.6-9.4-33.9 0l-17 17c-9.4 9.4-9.4 24.6 0 33.9L285.1 256 183.5 357.6c-9.4 9.4-9.4 24.6 0 33.9l17 17c9.4 9.4 24.6 9.4 33.9 0L369.9 273c9.4-9.4 9.4-24.6 0-34z"
        />
      </svg>
    </div>
    <div class="py-3">
      <AvatarSliderOption :optionsKey="currentCategory" />
    </div>
  </b-container>
</template>

<script lang="js">
import AvatarSliderOption from "@/components/AvatarSliderOption.vue";

const readableOptions = {
  accessoriesType: "Glasses",
  clotheColor: "Clothes color",
  clotheType: "Clothes",
  eyebrowType: "Eye Brows",
  eyeType: "Eyes",
  facialHairColor: "Beard color",
  facialHairType: "Beard",
  graphicType: "Shirt graphic",
  hairColor: "Hair color",
  mouthType: "Mouth",
  skinColor: "Skin color",
  topType: "Hair",
};

const categories = ["accessoriesType", "clotheType", "clotheColor", "eyebrowType", "eyeType", "facialHairColor", "facialHairType", "hairColor", "mouthType", "skinColor", "topType"]

export default {
    components: {
        AvatarSliderOption
    },
    data: function() {
        return {
            currentCategory: "accessoriesType",

        }
    },
    computed: {
        allCategories() {
            return Object.keys(this.props.optionsDictionary)
        },
        readableCategory() {
            return readableOptions[this.currentCategory];
        },
    },
    methods: {
        selectCategory(type) {
            const currentIndex = categories.indexOf(this.currentCategory)
            if (type === "next") {
                if (currentIndex === categories.length - 1) {
                    this.currentCategory = categories[0]
                } else {
                    this.currentCategory = categories[currentIndex+1]
                }
            } else if (type === "previous") {
                if (currentIndex === 0) {
                    this.currentCategory = categories[categories.length - 1]
                } else {
                    this.currentCategory = categories[currentIndex-1]
                }
            }
        }
    }
};
</script>

<style lang="scss">
#avatar-customizer {
  margin-top: 1em;
  padding: 0.5em 1.5em;
  background-color: $jellyPartyOrange;
  border-radius: 1em;
}

.avatar-selection {
  transition: all 300ms ease !important;
  cursor: pointer !important;
  &:hover {
    color: lightgray !important;
  }
}

#categoryHeading {
  background-color: $jellyPartyPurple;
  padding: 0.3em 1em;
  border-radius: 1em;
}
</style>
