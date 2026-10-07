import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite-plus";

export default defineConfig({
  publicDir: "../jelly-party-website/build",
  envDir: "../..",
  plugins: [
    cloudflare({
      persistState: { path: "../../.wrangler/state" },
      types: { includeRuntime: false },
    }),
  ],
  server: { host: "127.0.0.1", port: 8080, strictPort: true },
});
