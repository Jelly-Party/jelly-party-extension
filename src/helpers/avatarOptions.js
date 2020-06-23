import { mouthTypes } from "../browser/vuejs-avataaars/assetsTypes/mouth.js";
import { eyeTypes } from "../browser/vuejs-avataaars/assetsTypes/eyes.js";
import { eyebrowTypes } from "../browser/vuejs-avataaars/assetsTypes/eyebrows.js";
import { clothesType } from "../browser/vuejs-avataaars/assetsTypes/clothes.js";
import { topTypes } from "../browser/vuejs-avataaars/assetsTypes/top.js";
import { accessoriesTypes } from "../browser/vuejs-avataaars/assetsTypes/accessories.js";
import { facialHairTypes } from "../browser/vuejs-avataaars/assetsTypes/facial-hair.js";
import { GraphicShirtTypes } from "../browser/vuejs-avataaars/assetsTypes/graphic-shirt.js";

export default {
  mouthType: Object.keys(mouthTypes),
  eyeType: Object.keys(eyeTypes),
  eyebrowType: Object.keys(eyebrowTypes),
  clotheType: Object.keys(clothesType),
  topType: Object.keys(topTypes),
  accessoriesType: Object.keys(accessoriesTypes),
  facialHairType: Object.keys(facialHairTypes),
  GraphicShirtType: Object.keys(GraphicShirtTypes),
  hatAndShirtColor: [
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
  hairColor: [
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
  skinColor: [
    "Tanned",
    "Yellow",
    "Pale",
    "Light",
    "Brown",
    "DarkBrown",
    "Black",
  ],
};
