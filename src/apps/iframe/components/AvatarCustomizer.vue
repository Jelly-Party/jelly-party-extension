<template>
  <div>
    <div
      class="background-white d-flex align-items-center justify-content-center"
    >
      <avataaars
        style="height:250px;"
        :is-circle="true"
        :accessories-type="avatarState.accessoriesType"
        :clothe-type="avatarState.clotheType"
        :clothe-color="avatarState.clotheColor"
        :eyebrow-type="avatarState.eyebrowType"
        :eye-type="avatarState.eyeType"
        :facial-hair-color="avatarState.facialHairColor"
        :facial-hair-type="avatarState.facialHairType"
        :graphic-type="'Hola'"
        :hair-color="avatarState.hairColor"
        :mouth-type="avatarState.mouthType"
        :skin-color="avatarState.skinColor"
        :top-type="avatarState.topType"
      ></avataaars>
    </div>
    <b-input-group prepend="Name" class="pt-2">
      <b-form-input v-model="clientName"></b-form-input>
    </b-input-group>
    <NestedSelection />
  </div>
</template>

<script lang="ts">
import Avataaars from "vuejs-avataaars";
import NestedSelection from "./NestedSelection.vue";
import { appState } from "../IFrame";
import { computed } from "vue";
export default {
  components: {
    Avataaars,
    NestedSelection,
  },
  setup() {
    const avatarState = computed(() => {
      return appState.OptionsState.avatarState;
    });
    return { avatarState };
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
