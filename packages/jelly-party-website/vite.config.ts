import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, lazyPlugins } from "vite-plus";
import UnoCSS from "unocss/vite";
import { loadBuildEnvironment } from "../../config/build-environment";
import { resolveBuildUrls } from "../../config/urls";

export default defineConfig(({ mode }) => {
  const environment = loadBuildEnvironment(mode);
  const urls = resolveBuildUrls(environment);
  return {
    server: { host: "0.0.0.0", port: 5180, strictPort: true },
    define: {
      __JELLY_CHROME_STORE_URL__: JSON.stringify(urls.chromeStore),
      __JELLY_EDGE_STORE_URL__: JSON.stringify(urls.edgeStore),
      __JELLY_FIREFOX_STORE_URL__: JSON.stringify(urls.firefoxStore),
      __JELLY_REPOSITORY_URL__: JSON.stringify(urls.repository),
      __JELLY_WEBSITE_URL__: JSON.stringify(urls.website),
    },
    plugins: lazyPlugins(() => [
      UnoCSS(),
      sveltekit({
        preprocess: vitePreprocess(),
        adapter: adapter({
          pages: "build",
          assets: "build",
          fallback: undefined,
          precompress: false,
          strict: true,
        }),
        version: { pollInterval: 0 },
      }),
    ]),
  };
});
