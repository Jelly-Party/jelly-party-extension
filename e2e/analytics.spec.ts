import { expect, test, type WebSocketRoute } from "@playwright/test";
import type {
  LiveSnapshot,
  PlaybackSummary,
  UsagePartyPage,
  UsageReport,
} from "../packages/jelly-party-lib/src/analytics";

const emptyPlayback: PlaybackSummary = {
  attempts: 0,
  parties: 0,
  affectedParties: 0,
  eligibleParties: 0,
  syncedParties: 0,
  applied: 0,
  recovered: 0,
  blocked: 0,
  failed: 0,
  superseded: 0,
  unanswered: 0,
  unsupported: 0,
  pending: 0,
};
const emptyFunnel = {
  started: 0,
  together: 0,
  fiveMinutes: 0,
  uncertain: 0,
  medianTimeToJoinMs: null,
};
const emptySnapshot: LiveSnapshot = {
  uncertainParties: 0,
  uncertainPeers: 0,
  observedAt: null,
  parties: 0,
  peers: 0,
  together: 0,
  sites: [],
  updatedAt: 0,
};
const playback: PlaybackSummary = {
  attempts: 10,
  parties: 4,
  affectedParties: 2,
  eligibleParties: 4,
  syncedParties: 3,
  applied: 4,
  recovered: 2,
  blocked: 1,
  failed: 1,
  superseded: 1,
  unanswered: 1,
  unsupported: 1,
  pending: 1,
};

function emptyReport(query: URLSearchParams): UsageReport {
  return {
    from: query.get("from")!,
    to: query.get("to")!,
    generatedAt: Date.now(),
    lastEventAt: null,
    totals: [],
    previousTotals: [],
    funnel: emptyFunnel,
    previousFunnel: emptyFunnel,
    daily: [],
    sites: [],
    sizes: [],
    playback: emptyPlayback,
    playbackResults: [],
    outcomes: [],
    filters: { sites: [], browsers: [], versions: [] },
  };
}

test("dashboard shows live and playback signals and loads party records separately", async ({
  page,
}) => {
  let reportRequests = 0;
  let partyRequests = 0;
  let reportQuery = new URLSearchParams();
  let partyQuery = new URLSearchParams();
  let stream: WebSocketRoute | undefined;

  await page.route("**/admin/api/stats?*", async (route) => {
    reportRequests++;
    reportQuery = new URL(route.request().url()).searchParams;
    await route.fulfill({
      json: {
        ...emptyReport(reportQuery),
        lastEventAt: Date.parse(`${reportQuery.get("to")}T00:00:00Z`),
        funnel: {
          started: 4,
          together: 3,
          fiveMinutes: 2,
          uncertain: 0,
          medianTimeToJoinMs: 60000,
        },
        previousFunnel: { ...emptyFunnel, started: 2, together: 1 },
        filters: { sites: ["youtube.com"], browsers: ["chrome"], versions: ["2.4.0"] },
        playback,
        playbackResults: [
          { site: "youtube.com", browser: "chrome", version: "2.4.0", ...playback },
        ],
        outcomes: [
          {
            site: "youtube.com",
            browser: "chrome",
            version: "2.4.0",
            kind: "permission_denied",
            outcome: "",
            count: 2,
          },
        ],
      } satisfies UsageReport,
    });
  });
  await page.route("**/admin/api/parties?*", async (route) => {
    partyRequests++;
    partyQuery = new URL(route.request().url()).searchParams;
    const currentPage = Number(partyQuery.get("page"));
    await route.fulfill({
      json: {
        page: currentPage,
        totalParties: 104,
        parties: [
          {
            key: "example-" + currentPage,
            startedAt: Date.parse(`${partyQuery.get("from")}T12:00:00Z`),
            durationMs: 80 * 60_000,
            togetherMs: 0,
            status: "ended",
            observedAt: Date.now(),
            participants: 4,
            peak: 1,
            connected: 0,
            messages: 36,
            sites: ["youtube.com"],
          },
        ],
        hasMoreParties: currentPage === 0,
      } satisfies UsagePartyPage,
    });
  });
  await page.routeWebSocket("**/admin/api/live", (socket) => {
    socket.onMessage((message) => {
      if (message === "ping") socket.send("pong");
    });
    stream = socket;
    socket.send(
      JSON.stringify({
        ...emptySnapshot,
        observedAt: Date.now(),
        parties: 1,
        peers: 2,
        together: 1,
        sites: [{ site: "youtube.com", parties: 1, peers: 2 }],
        updatedAt: Date.now(),
      } satisfies LiveSnapshot),
    );
  });

  await page.goto("http://localhost:16180/admin");
  await expect(page.getByTestId("live-participants")).toHaveText("2");
  await expect(page.getByRole("status")).toHaveText("● Connected");
  await expect(page.getByTestId("loaded-range")).toContainText("UTC");
  await expect(page.getByText("4 of 7 eligible attempts")).toBeVisible();
  await expect(page.getByText("1 blocked · 1 failed · 1 unanswered")).toBeVisible();
  expect(partyRequests).toBe(0);

  await page.getByText("Playback by website, browser, and version", { exact: true }).click();
  const results = page.getByRole("table", { name: "Playback results", exact: true });
  await expect(results.getByRole("cell", { name: "4 (57%)", exact: true })).toBeVisible();
  await expect(results.getByRole("cell", { name: "2 of 4", exact: true })).toBeVisible();
  await page.getByText("Onboarding and playback event counts", { exact: true }).click();
  await expect(page.getByRole("cell", { name: "Access declined" })).toBeVisible();

  stream!.send(JSON.stringify({ ...emptySnapshot, updatedAt: Date.now() - 90_000 }));
  await expect(page.getByTestId("live-participants")).toHaveText("0");
  await expect(page.getByRole("status")).toHaveText("● Connected");
  await expect(page.getByText("Showing older counts.")).toBeVisible();
  expect(reportRequests).toBe(1);
  expect(partyRequests).toBe(0);

  await page.getByRole("button", { name: "Yesterday", exact: true }).click();
  await expect.poll(() => reportRequests).toBe(2);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  expect(reportQuery.get("from")).toBe(yesterday);
  expect(reportQuery.get("to")).toBe(yesterday);
  await page.getByRole("button", { name: "30 days", exact: true }).click();
  await expect.poll(() => reportRequests).toBe(3);
  expect(Date.parse(reportQuery.get("to")!) - Date.parse(reportQuery.get("from")!)).toBe(
    29 * 86_400_000,
  );
  await page.getByRole("button", { name: "Custom", exact: true }).click();
  await page.getByLabel("Start date").fill("2026-09-01");
  await page.getByLabel("End date").fill("2026-09-02");
  await page.getByRole("button", { name: "View", exact: true }).click();
  await expect.poll(() => reportRequests).toBe(4);
  expect(reportQuery.get("from")).toBe("2026-09-01");
  expect(reportQuery.get("to")).toBe("2026-09-02");
  expect(reportQuery.has("page")).toBe(false);
  expect(partyRequests).toBe(0);

  await page.getByText("Party records", { exact: true }).click();
  const parties = page.getByRole("table", { name: "Recent parties" });
  await expect(parties.getByRole("cell", { name: "youtube.com" })).toBeVisible();
  await expect(parties.getByRole("cell", { name: "1h 20m" })).toBeVisible();
  await expect(parties.getByRole("cell", { name: "0 min", exact: true })).toBeVisible();
  expect(partyRequests).toBe(1);
  expect(partyQuery.get("from")).toBe("2026-09-01");
  expect(partyQuery.get("to")).toBe("2026-09-02");

  await page.getByRole("combobox", { name: "Browser", exact: true }).selectOption("chrome");
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText("Page 2 · 104 starts")).toBeVisible();
  expect(partyRequests).toBe(2);
  expect(partyQuery.get("page")).toBe("1");
  expect(partyQuery.has("browser")).toBe(false);
  expect(reportRequests).toBe(4);

  await page.getByRole("button", { name: "Apply filters", exact: true }).click();
  await expect.poll(() => reportQuery.get("browser")).toBe("chrome");
  await expect.poll(() => partyQuery.get("browser")).toBe("chrome");
  expect(partyQuery.get("page")).toBe("0");

  await stream!.close({ code: 1008, reason: "Sign in again" });
  await expect(page.getByRole("status")).toContainText("Sign in again");
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/analytics-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/analytics-mobile.png", fullPage: true });
});

test("failed or delayed date requests preserve the loaded report and party filters", async ({
  page,
}) => {
  const initialFrom = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
  let reportRequests = 0;
  let partyQuery = new URLSearchParams();
  let release: (() => void) | undefined;
  await page.routeWebSocket("**/admin/api/live", (socket) =>
    socket.send(
      JSON.stringify({
        ...emptySnapshot,
        updatedAt: Date.now(),
        uncertainParties: 1,
        uncertainPeers: 2,
      } satisfies LiveSnapshot),
    ),
  );
  await page.route("**/admin/api/stats?*", async (route) => {
    reportRequests++;
    const query = new URL(route.request().url()).searchParams;
    if (reportRequests === 2) {
      await new Promise<void>((resolve) => (release = resolve));
      await route.fulfill({ status: 503, body: "Unavailable" });
      return;
    }
    await route.fulfill({
      json: {
        ...emptyReport(query),
        totals: [{ kind: "party_created", count: 7 }],
        funnel: { ...emptyFunnel, started: 7 },
      } satisfies UsageReport,
    });
  });
  await page.route("**/admin/api/parties?*", async (route) => {
    partyQuery = new URL(route.request().url()).searchParams;
    await route.fulfill({
      json: {
        parties: [],
        totalParties: 0,
        page: 0,
        hasMoreParties: false,
      } satisfies UsagePartyPage,
    });
  });
  await page.goto("http://localhost:16180/admin");
  const range = page.getByTestId("loaded-range");
  await expect(range).toContainText(
    new Date(initialFrom).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
  );
  const original = await range.textContent();

  await page.getByRole("button", { name: "Custom", exact: true }).click();
  await page.getByLabel("Start date").fill("2026-01-01");
  await expect(range).toHaveText(original!);
  await page.getByRole("button", { name: "Yesterday", exact: true }).click();
  await expect.poll(() => reportRequests).toBe(2);
  await expect(range).toHaveText(original!);
  release!();

  await expect(page.getByRole("alert")).toContainText("original dates and filters");
  await expect(range).toHaveText(original!);
  await expect(
    page.getByText("Membership could not be confirmed for 1 party", { exact: false }),
  ).toBeVisible();
  await page.getByText("Party records", { exact: true }).click();
  await expect(page.getByText("No party starts matched.")).toBeVisible();
  expect(partyQuery.get("from")).toBe(initialFrom);
});
