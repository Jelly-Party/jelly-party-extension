<template>
  <div>
    <div id="placeholder"></div>
    <BackButton goto="/settings" />
    <div id="fixed-avatar">
      <Avataaar
        style="height: 200px"
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
    </div>
    <div class="p-3">
      <AvatarSliderOption
        :options="accessoriesType"
        optionsKey="accessoriesType"
      />
      <AvatarSliderOption :options="clotheType" optionsKey="clotheType" />
      <AvatarSliderOption
        :options="hatAndShirtColors"
        optionsKey="clotheColor"
      />
      <AvatarSliderOption :options="eyebrowType" optionsKey="eyebrowType" />
      <AvatarSliderOption :options="eyeType" optionsKey="eyeType" />
      <AvatarSliderOption :options="hairColors" optionsKey="facialHairColor" />
      <AvatarSliderOption
        :options="facialHairType"
        optionsKey="facialHairType"
      />
      <AvatarSliderOption :options="hairColors" optionsKey="hairColor" />
      <AvatarSliderOption :options="mouthType" optionsKey="mouthType" />
      <AvatarSliderOption :options="skinColors" optionsKey="skinColor" />
      <AvatarSliderOption :options="topType" optionsKey="topType" />
    </div>
  </div>
</template>

<script>
import store from "@/store.ts";
import BackButton from "@/components/BackButton.vue";
import Avataaar from "../browser/vuejs-avataaars/entry.js";
import AvatarSliderOption from "@/components/AvatarSliderOption.vue";
import { getAvatarState, setAvatarState } from "../messaging.js";
import { mouthTypes } from "../browser/vuejs-avataaars/assetsTypes/mouth.js";
import { eyeTypes } from "../browser/vuejs-avataaars/assetsTypes/eyes.js";
import { eyebrowTypes } from "../browser/vuejs-avataaars/assetsTypes/eyebrows.js";
import { clothesType } from "../browser/vuejs-avataaars/assetsTypes/clothes.js";
import { topTypes } from "../browser/vuejs-avataaars/assetsTypes/top.js";
import { accessoriesTypes } from "../browser/vuejs-avataaars/assetsTypes/accessories.js";
import { facialHairTypes } from "../browser/vuejs-avataaars/assetsTypes/facial-hair.js";
import { GraphicShirtTypes } from "../browser/vuejs-avataaars/assetsTypes/graphic-shirt.js";

export default {
  components: {
    AvatarSliderOption,
    Avataaar,
    BackButton,
  },
  data: function() {
    return {
      avatarState: store.avatarState,
      mouthType: Object.keys(mouthTypes),
      eyeType: Object.keys(eyeTypes),
      eyebrowType: Object.keys(eyebrowTypes),
      clotheType: Object.keys(clothesType),
      topType: Object.keys(topTypes),
      accessoriesType: Object.keys(accessoriesTypes),
      facialHairType: Object.keys(facialHairTypes),
      GraphicShirtType: Object.keys(GraphicShirtTypes),
      hatAndShirtColors: [
        "Black",
        "Blue01",
        "Blue02",
        "Blue03",
        "Gray01",
        "Gray02",
        "Heather",
        "PastelBlue",
        "PastelGreen",
        "PastelOrange",
        "PastelRed",
        "PastelYellow",
        "Pink",
        "Red",
        "White",
      ],
      hairColors: [
        "Auburn",
        "Black",
        "Blonde",
        "BlondeGolden",
        "Brown",
        "BrownDark",
        "PastelPink",
        "Platinum",
        "Red",
        "SilverGray",
      ],
      skinColors: [
        "Tanned",
        "Yellow",
        "Pale",
        "Light",
        "Brown",
        "DarkBrown",
        "Black",
      ],
    };
  },
  mounted: function() {
    getAvatarState();
  },
  beforeDestroy: function() {
    console.log("Jelly-Party: Saving avatar state!");
    setAvatarState(store.avatarState);
  },
};
</script>

<style scoped>
#placeholder {
  height: 220px;
}
#fixed-avatar {
  position: fixed;
  width: 100%;
  top: 81px;
  padding: 10px 0px;
  background: lightgray;
}
</style>
