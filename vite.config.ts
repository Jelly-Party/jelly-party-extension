import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      dev: {
        command:
          'vp exec concurrently --kill-others "vp run jelly-party-server#dev" "vp run jelly-party-website#dev" "vp run jelly-party-extension#dev" --names "server,web,extensions" --prefix-colors "blue,green,magenta"',
        cache: false,
      },
      "test:services": {
        command:
          'vp exec concurrently --kill-others "vp run test:server" "vp run test:web" --names "server,web" --prefix-colors "blue,green"',
        cache: false,
      },
      "test:server": {
        command: [
          "vp exec wrangler d1 migrations apply ANALYTICS_DB --local",
          "vp exec wrangler dev --config wrangler.jsonc --local --port 16080",
        ],
        cache: false,
      },
      "test:web": {
        command: "vp dev --host 127.0.0.1 --port 16180 --strictPort",
        cwd: "packages/jelly-party-website",
        cache: false,
      },
      build: {
        command: "vp exec node scripts/package-extension.mjs",
        dependsOn: ["jelly-party-extension#build"],
        cache: false,
      },
      "build:all": {
        command: ["vp run build:cloudflare", "vp run build"],
        cache: false,
      },
      "build:cloudflare": {
        command: 'vp exec wrangler deploy --env="" --dry-run',
        dependsOn: ["jelly-party-website#build"],
        cache: false,
      },
      predeploy: {
        command: ["vp check", "vp run check:wrangler", "vp run test:all", "vp run build:all"],
        cache: false,
      },
      "check:wrangler": {
        command:
          "vp exec wrangler types packages/jelly-party-server/src/worker-configuration.d.ts --include-runtime=false --strict-vars=false --check",
        cache: false,
      },
      deploy: {
        command: [
          "vp exec wrangler d1 migrations apply ANALYTICS_DB --remote",
          'vp exec wrangler deploy --env=""',
          "JELLY_REQUIRE_RELEASE_VERSION=1 vp run smoke:production",
        ],
        dependsOn: ["predeploy"],
        cache: false,
      },
      stage: {
        command: "vp exec node scripts/stage-extension.mjs",
        dependsOn: ["predeploy", "smoke:production"],
        cache: false,
      },
      "smoke:production": {
        command: "vp exec node scripts/smoke-production.ts",
        cache: false,
      },
      "assets:store": {
        command:
          'vp exec concurrently --kill-others --success first "vp run test:web" "vp exec node scripts/capture-store-assets.ts" --names "web,capture" --prefix-colors "green,magenta"',
        cache: false,
      },
      "assets:icons": {
        command: "vp exec node scripts/generate-icons.ts",
        cache: false,
      },
      "test:analytics": {
        command: "vp test --run --config vitest.workers.config.ts",
        cache: false,
      },
      "test:all": {
        command: [
          "vp test --run",
          "vp run test:analytics",
          "vp run test:e2e",
          "vp run test:e2e:firefox",
        ],
        cache: false,
      },
      "test:e2e": {
        command: [
          "VITE_JELLY_WS_URL=ws://localhost:16080 VITE_JELLY_WEBSITE_URL=http://localhost:16180 vp run jelly-party-extension#build:test",
          "VITE_JELLY_WS_URL=ws://localhost:16080 VITE_JELLY_WEBSITE_URL=http://localhost:16180 vp run jelly-party-extension#build:test:firefox",
          "vp exec playwright test",
        ],
        cache: false,
      },
      "test:e2e:production": {
        command: ["vp run build", "vp exec node e2e/production-join.ts"],
        cache: false,
      },
      "test:e2e:firefox": {
        command: [
          "VITE_JELLY_WS_URL=ws://localhost:16080 VITE_JELLY_WEBSITE_URL=http://localhost:16180 vp run jelly-party-extension#build:test:firefox",
          'vp exec concurrently --kill-others --success first "vp run test:services" "vp dev e2e/fixtures --host 0.0.0.0 --port 16334 --strictPort" "vp exec node e2e/firefox-extension.ts"',
        ],
        cache: false,
      },
      "test:e2e:ui": {
        command: [
          "VITE_JELLY_WS_URL=ws://localhost:16080 VITE_JELLY_WEBSITE_URL=http://localhost:16180 vp run jelly-party-extension#build:test",
          "vp exec playwright test --ui",
        ],
        cache: false,
      },
      "test:e2e:headed": {
        command: [
          "VITE_JELLY_WS_URL=ws://localhost:16080 VITE_JELLY_WEBSITE_URL=http://localhost:16180 vp run jelly-party-extension#build:test",
          "JELLY_E2E_HEADED=1 vp exec playwright test --headed",
        ],
        cache: false,
      },
    },
  },
  staged: {
    "*": "vp check --fix",
  },
  fmt: { ignorePatterns: ["packages/jelly-party-server/src/worker-configuration.d.ts"] },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  test: {
    expect: { requireAssertions: true },
    environment: "node",
    include: [
      "config/**/*.{test,spec}.ts",
      "packages/jelly-party-lib/src/**/*.{test,spec}.ts",
      "packages/jelly-party-extension/src/**/*.{test,spec}.ts",
      "packages/jelly-party-server/src/**/*.{test,spec}.ts",
    ],
  },
});
