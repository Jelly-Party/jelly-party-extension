<template>
  <div>
    <div
      class="background-white d-flex align-items-center justify-content-center"
    >
      <Avataaar
        style="height:250px;"
        :accessoriesType="accessoriesType"
        :clotheType="clotheType"
        :clotheColor="clotheColor"
        :eyebrowType="eyebrowType"
        :eyeType="eyeType"
        :facialHairColor="facialHairColor"
        :facialHairType="facialHairType"
        :graphicType="'Hola'"
        :hairColor="hairColor"
        :mouthType="mouthType"
        :skinColor="skinColor"
        :topType="topType"
      />
    </div>
    <b-input-group prepend="Name" class="px-3 pt-2">
      <b-form-input v-model="clientName"></b-form-input>
    </b-input-group>
    <p class="text-center m-0 p-0">
      <small>Please scroll down to save your settings.</small>
    </p>
    <div class="px-3">
      <AvatarSliderOption optionsKey="accessoriesType" />
      <AvatarSliderOption optionsKey="clotheType" />
      <AvatarSliderOption optionsKey="clotheColor" />
      <AvatarSliderOption optionsKey="eyebrowType" />
      <AvatarSliderOption optionsKey="eyeType" />
      <AvatarSliderOption optionsKey="facialHairColor" />
      <AvatarSliderOption optionsKey="facialHairType" />
      <AvatarSliderOption optionsKey="hairColor" />
      <AvatarSliderOption optionsKey="mouthType" />
      <AvatarSliderOption optionsKey="skinColor" />
      <AvatarSliderOption optionsKey="topType" />
    </div>
  </div>
</template>

<script>
import Avataaar from "@/browser/vuejs-avataaars/entry.js";
import AvatarSliderOption from "@/components/AvatarSliderOption.vue";
import { mapFields } from "vuex-map-fields";

export default {
  components: {
    Avataaar,
    AvatarSliderOption,
  },
  computed: {
    // When using nested data structures, the string
    // after the last dot (e.g. `firstName`) is used
    // for defining the name of the computed property.
    ...mapFields("options", [
      "clientName",
      "avatarState.accessoriesType",
      "avatarState.clotheType",
      "avatarState.clotheColor",
      "avatarState.eyebrowType",
      "avatarState.eyeType",
      "avatarState.facialHairColor",
      "avatarState.facialHairType",
      "avatarState.graphicType",
      "avatarState.hairColor",
      "avatarState.mouthType",
      "avatarState.skinColor",
      "avatarState.topType",
    ]),
  },
};
</script>

<style></style>
