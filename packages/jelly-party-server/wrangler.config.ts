import { defineWranglerConfig } from "wrangler/experimental-config";

export default defineWranglerConfig({
  types: {
    generate: false,
  },
  assetsDirectory: "../jelly-party-website/build",
});
