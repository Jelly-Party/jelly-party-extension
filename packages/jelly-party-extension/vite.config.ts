import { existsSync } from "node:fs";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, lazyPlugins } from "vite-plus";
import UnoCSS from "unocss/vite";
import webExtension from "vite-plugin-web-extension";
import { loadBuildEnvironment } from "../../config/build-environment";
import { createExtensionManifest } from "../../config/extension-manifest";
import { joinUrl, partyCreationUrl, resolveBuildUrls } from "../../config/urls";

const DEVELOPMENT_START_URL = "https://video.blender.org/w/dmhvQNzwBnrWy1iYzVv5g7";
// vite-plugin-web-extension 4.5 emits extension-page and HMR URLs on port 5173.
// Chrome owns that shared UI server; Firefox keeps a separate manifest/background reload server.
const DEVELOPMENT_UI_PORT = 5173;
const FIREFOX_DEVELOPMENT_PORT = 5182;
const MACOS_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function chromeBinary(): string | undefined {
  const candidates = [
    process.env.CHROME_PATH,
    ...(process.platform === "darwin" ? [MACOS_CHROME] : []),
  ];
  return candidates.find((candidate): candidate is string =>
    Boolean(candidate && existsSync(candidate)),
  );
}

export default defineConfig(({ mode }) => {
  const isTest = mode.endsWith("test");
  const isFirefox = mode.startsWith("firefox");
  const isDevelopment = mode.endsWith("development");
  const browser = isFirefox ? "firefox" : "chrome";
  const chromiumBinary = chromeBinary();
  const buildEnvironment = loadBuildEnvironment(mode);
  const developmentWebsite =
    buildEnvironment.VITE_JELLY_WEBSITE_URL ||
    (isDevelopment ? "http://127.0.0.1:5180" : undefined);
  const environment = {
    ...buildEnvironment,
    ...(developmentWebsite && { VITE_JELLY_WEBSITE_URL: developmentWebsite }),
    ...((isDevelopment || isTest) &&
      developmentWebsite && {
        VITE_JELLY_JOIN_URL: buildEnvironment.VITE_JELLY_JOIN_URL || joinUrl(developmentWebsite),
      }),
    ...(isDevelopment && {
      VITE_JELLY_WS_URL: buildEnvironment.VITE_JELLY_WS_URL || "ws://localhost:8080",
    }),
  };
  const urls = resolveBuildUrls(environment, {
    allowInsecureLocalhost: isTest || isDevelopment,
  });

  return {
    publicDir: "icons",
    run: {
      tasks: {
        dev: {
          command: `vp exec concurrently --kill-others "vp dev --mode development --port ${DEVELOPMENT_UI_PORT} --strictPort" "vp dev --mode firefox-development --port ${FIREFOX_DEVELOPMENT_PORT} --strictPort" --names "chrome,firefox" --prefix-colors "magenta,cyan"`,
          cache: false,
        },
        build: {
          command: ["vp build --mode production", "vp build --mode firefox"],
          cache: false,
        },
        "build:test": {
          command: "vp build --mode test",
          cache: false,
        },
        "build:test:firefox": {
          command: "vp build --mode firefox-test",
          cache: false,
        },
      },
    },
    build: {
      outDir: isTest
        ? isFirefox
          ? "dist-firefox-test"
          : "dist-test"
        : isDevelopment
          ? `../../latest/dev/${browser}`
          : `../../artifacts/${browser}`,
      emptyOutDir: true,
    },
    define: {
      __JELLY_TEST__: JSON.stringify(isTest || isDevelopment),
      __JELLY_WS_URL__: JSON.stringify(urls.websocket),
      __JELLY_JOIN_URL__: JSON.stringify(urls.join),
      __JELLY_PARTY_CREATION_URL__: JSON.stringify(partyCreationUrl(urls.websocket)),
    },
    plugins: lazyPlugins(() => [
      svelte(),
      UnoCSS(),
      webExtension({
        manifest: () =>
          createExtensionManifest(urls, {
            firefox: isFirefox,
            test: isTest,
            development: isDevelopment,
          }),
        browser,
        disableAutoLaunch: !isDevelopment,
        ...(isDevelopment && {
          webExtConfig: {
            target: isFirefox ? "firefox-desktop" : "chromium",
            startUrl: DEVELOPMENT_START_URL,
            ...(process.env.JELLY_DEV_HEADLESS === "1" && {
              args: [isFirefox ? "-headless" : "--headless=new"],
            }),
            ...(isFirefox
              ? { firefoxBinary: process.env.FIREFOX_BIN }
              : { ...(chromiumBinary && { chromiumBinary }) }),
          },
        }),
        watchFilePaths: ["../../config/extension-manifest.ts", "../../config/urls.ts"],
        additionalInputs: [
          "src/sidebar/sidebar.html",
          "src/grant/grant.html",
          "src/content/video.ts",
        ],
      }),
    ]),
  };
});
