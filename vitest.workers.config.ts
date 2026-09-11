import { defineConfig } from "vite-plus";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations("./migrations"),
          ACCESS_TEAM_DOMAIN: "analytics-test.cloudflareaccess.com",
          ACCESS_AUD: "analytics-test",
        },
      },
    }),
  ],
  test: {
    include: ["packages/jelly-party-server/test/*.test.ts"],
    expect: { requireAssertions: true },
  },
});
