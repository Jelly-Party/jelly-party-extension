import {
  CHROME_MIN_VERSION,
  FIREFOX_ADDON_GUID,
  FIREFOX_MIN_VERSION,
  RELEASE_VERSION,
} from "./release";
import type { BuildUrls } from "./urls";
import { partyCreationUrl, toWebExtensionMatchPattern, toWebExtensionPagePattern } from "./urls";

export interface ExtensionManifestOptions {
  firefox: boolean;
  test: boolean;
  /** Vite's web-extension plugin adds its localhost host permission after rendering. */
  development?: boolean;
}

export function createExtensionManifest(urls: BuildUrls, options: ExtensionManifestOptions) {
  const joinOriginMatch = toWebExtensionMatchPattern(urls.join);
  const creationUrl = partyCreationUrl(urls.websocket);
  const creationOriginMatch = toWebExtensionMatchPattern(creationUrl);
  const joinPageMatch = toWebExtensionPagePattern(urls.join);
  const socket = new URL(urls.websocket);
  const permissions = ["activeTab", "tabs", "storage", "scripting"];
  if (!options.firefox) permissions.push("sidePanel");

  const broadHostAccess = options.test;
  const manifest = {
    name: "Jelly Party",
    version: RELEASE_VERSION,
    description: "Watch videos with your friends — in sync!",
    manifest_version: 3,
    permissions,
    host_permissions: broadHostAccess
      ? ["https://*/*", "http://*/*"]
      : [...new Set([joinOriginMatch, creationOriginMatch])].filter(
          (permission) => !options.development || permission !== "http://localhost/*",
        ),
    ...(!broadHostAccess && {
      optional_host_permissions: ["https://*/*", "http://*/*"],
    }),
    action: {
      default_icon: ICONS,
    },
    ...(!options.firefox && {
      side_panel: { default_path: "src/sidebar/sidebar.html" },
    }),
    background: options.firefox
      ? { scripts: ["src/background/index.ts"], type: "module" }
      : { service_worker: "src/background/index.ts", type: "module" },
    content_scripts: [
      {
        matches: [joinPageMatch],
        js: ["src/content/join.ts"],
        run_at: "document_start",
      },
    ],
    icons: ICONS,
    content_security_policy: {
      extension_pages: `script-src 'self'; object-src 'self'; connect-src 'self' ${socket.protocol}//${socket.host} ${new URL(creationUrl).origin}`,
    },
    ...(!options.firefox && { minimum_chrome_version: CHROME_MIN_VERSION }),
    ...(options.firefox && {
      sidebar_action: {
        default_panel: "src/sidebar/sidebar.html",
        open_at_install: false,
      },
      commands: {
        _execute_sidebar_action: {
          suggested_key: { default: "Alt+Shift+J" },
        },
      },
      browser_specific_settings: {
        gecko: {
          // Must match the published AMO add-on GUID or the upload becomes a new
          // listing instead of an update for existing users.
          id: FIREFOX_ADDON_GUID,
          strict_min_version: FIREFOX_MIN_VERSION,
          data_collection_permissions: {
            required: [
              "browsingActivity",
              "personalCommunications",
              "personallyIdentifyingInfo",
              "websiteActivity",
            ],
          },
        },
      },
    }),
  };

  return manifest;
}

const ICONS = {
  "16": "16x16.png",
  "32": "32x32.png",
  "48": "48x48.png",
  "128": "128x128.png",
};
