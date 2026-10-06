import { bindings, defineConfig, defineWorker, exports, triggers } from "cf/config";
import { productionRoutes } from "../../config/production-routes.ts";
import * as entrypoint from "./src/main.ts" with { type: "cf-worker" };

const relay = defineWorker({
  name: "jelly-party-relay",
  compatibilityDate: "2026-09-01",
  entrypoint,
  exports: {
    Party: exports.durableObject({
      storage: "sqlite",
    }),
    PartyQuota: exports.durableObject({
      storage: "sqlite",
    }),
    LiveStats: exports.durableObject({
      storage: "sqlite",
    }),
  },
});

export default defineConfig({
  worker: {
    ...relay,
    workersDev: false,
    previewUrls: false,
    limits: {
      cpuMs: 100,
      subrequests: 8,
    },
    assets: {
      notFoundHandling: "404-page",
      runWorkerFirst: ["/", "/health", "/party", "/party/*", "/admin", "/admin/*"],
    },
    domains: ["dashboard.jelly-party.com"],
    triggers: productionRoutes.map((route) => triggers.fetch(route)),
    env: {
      MAX_PARTIES_PER_MONTH: bindings.text<string>("1000000"),
      ACCESS_TEAM_DOMAIN: bindings.text("still-bush-b570.cloudflareaccess.com"),
      ACCESS_AUD: bindings.text("1bcf73441353f22ff3a03ef62ab876be52a3a23aef17b0dcf4654c6a29abf8f3"),
      ANALYTICS_DB: bindings.d1({
        name: "jelly-party-analytics",
        id: "1f777b9f-e77e-4969-b8d8-0879bc3b2b49",
      }),
      PARTY: bindings.durableObject<typeof relay, "Party">({
        worker: relay,
        exportName: "Party",
      }),
      PARTY_QUOTA: bindings.durableObject<typeof relay, "PartyQuota">({
        worker: relay,
        exportName: "PartyQuota",
      }),
      LIVE_STATS: bindings.durableObject<typeof relay, "LiveStats">({
        worker: relay,
        exportName: "LiveStats",
      }),
      PARTY_CREATION_RATE_LIMITER: bindings.rateLimit({
        namespace: "9202101",
        simple: {
          limit: 5,
          period: 60,
        },
      }),
      PARTY_CONNECTION_RATE_LIMITER: bindings.rateLimit({
        namespace: "9202102",
        simple: {
          limit: 30,
          period: 60,
        },
      }),
      ASSETS: bindings.assets(),
    },
  },
});
