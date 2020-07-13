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
    <b-input-group prepend="Name" class="pt-2">
      <b-form-input v-model="clientName"></b-form-input>
    </b-input-group>
    <NestedSelection />
  </div>
</template>

<script>
import Avataaar from "@/browser/vuejs-avataaars/entry.js";
import NestedSelection from "@/components/NestedSelection.vue";
import { mapFields } from "vuex-map-fields";

export default {
  components: {
    Avataaar,
    NestedSelection,
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

<style lang="scss" scoped>
@mixin color($color) {
  border-color: $color !important;
  background-color: $color !important;
  color: white;
}
.input-group-text {
  @include color($jellyPartyPurple);
}

.form-control {
  @include color($jellyPartyOrange);
  &:focus-within {
    color: white !important;
  }
}
</style>
