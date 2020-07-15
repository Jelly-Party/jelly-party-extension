import { mouthTypes } from "./assetsTypes/mouth.js";
import { eyeTypes } from "./assetsTypes/eyes.js";
import { eyebrowTypes } from "./assetsTypes/eyebrows.js";
import { clothesType } from "./assetsTypes/clothes.js";
import { topTypes } from "./assetsTypes/top.js";
import { accessoriesTypes } from "./assetsTypes/accessories.js";
import { facialHairTypes } from "./assetsTypes/facial-hair.js";
import { GraphicShirtTypes } from "./assetsTypes/graphic-shirt.js";

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
