import { describe, expect, it } from "vite-plus/test";
import { createExtensionManifest } from "./extension-manifest";
import {
  DEFAULT_BUILD_URLS,
  partyCreationUrl,
  resolveBuildUrls,
  toWebExtensionMatchPattern,
  toWebExtensionPagePattern,
} from "./urls";

describe("extension manifest configuration", () => {
  it("propagates the configured production endpoints into Chromium", () => {
    const urls = resolveBuildUrls({
      VITE_JELLY_JOIN_URL: "https://invites.example/accept",
      VITE_JELLY_WS_URL: "wss://relay.example/socket",
    });
    const manifest = createExtensionManifest(urls, { firefox: false, test: false });

    expect(manifest.host_permissions).toEqual([
      "https://invites.example/*",
      "https://relay.example/*",
    ]);
    expect(manifest.optional_host_permissions).toEqual(["https://*/*", "http://*/*"]);
    expect(manifest.content_scripts[0]?.matches).toEqual(["https://invites.example/accept*"]);
    expect(manifest.content_security_policy.extension_pages).toContain(
      "connect-src 'self' wss://relay.example",
    );
    expect(manifest.content_security_policy.extension_pages).toContain("https://relay.example");
    expect(manifest.permissions).toContain("sidePanel");
    // Tracking native side-panel closure requires Chrome 142's onClosed event.
    expect(manifest).toHaveProperty("minimum_chrome_version", "142");
    expect(manifest).toHaveProperty("side_panel.default_path", "src/sidebar/sidebar.html");
  });

  it("uses the single centralized defaults for Firefox production builds", () => {
    const manifest = createExtensionManifest(DEFAULT_BUILD_URLS, {
      firefox: true,
      test: false,
    });
    const joinOriginMatch = toWebExtensionMatchPattern(DEFAULT_BUILD_URLS.join);
    const creationOriginMatch = toWebExtensionMatchPattern(
      partyCreationUrl(DEFAULT_BUILD_URLS.websocket),
    );
    const joinPageMatch = toWebExtensionPagePattern(DEFAULT_BUILD_URLS.join);
    const socket = new URL(DEFAULT_BUILD_URLS.websocket);

    expect(manifest.host_permissions).toEqual([joinOriginMatch, creationOriginMatch]);
    expect(manifest.content_scripts[0]?.matches).toEqual([joinPageMatch]);
    expect(manifest.content_security_policy.extension_pages).toContain(
      `connect-src 'self' ${socket.protocol}//${socket.host}`,
    );
    expect(manifest.permissions).not.toContain("sidePanel");
    expect(manifest).not.toHaveProperty("minimum_chrome_version");
    expect(manifest).toHaveProperty("sidebar_action.default_panel", "src/sidebar/sidebar.html");
    expect(manifest).toHaveProperty("sidebar_action.open_at_install", false);
  });

  it("pre-grants video origins in disposable test manifests", () => {
    const manifest = createExtensionManifest(
      resolveBuildUrls(
        {
          VITE_JELLY_WEBSITE_URL: "http://localhost:16180",
          VITE_JELLY_JOIN_URL: "http://localhost:16180/join",
          VITE_JELLY_WS_URL: "ws://localhost:16080",
        },
        { allowInsecureLocalhost: true },
      ),
      { firefox: false, test: true },
    );

    expect(manifest.host_permissions).toEqual(["https://*/*", "http://*/*"]);
    expect(manifest).not.toHaveProperty("optional_host_permissions");
  });

  it("keeps site access optional in development builds", () => {
    const urls = resolveBuildUrls(
      {
        VITE_JELLY_WEBSITE_URL: "http://127.0.0.1:5180",
        VITE_JELLY_JOIN_URL: "http://127.0.0.1:5180/join",
        VITE_JELLY_WS_URL: "ws://localhost:8080",
      },
      { allowInsecureLocalhost: true },
    );
    const manifest = createExtensionManifest(urls, {
      firefox: false,
      test: false,
      development: true,
    });

    // vite-plugin-web-extension adds http://localhost/* to development manifests itself.
    expect(manifest.host_permissions).toEqual(["http://127.0.0.1/*"]);
    expect(manifest.optional_host_permissions).toEqual(["https://*/*", "http://*/*"]);
  });
});
