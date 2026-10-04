import { test, expect, type WebSocketRoute } from "@playwright/test";

test("dashboard applies pushed counts, shows disconnection, and fetches history only on demand", async ({
  page,
}) => {
  let requests = 0;
  let query = new URLSearchParams();
  let stream: WebSocketRoute | undefined;
  await page.route("**/admin/api/stats?*", async (route) => {
    requests++;
    query = new URL(route.request().url()).searchParams;
    await route.fulfill({
      json: {
        from: query.get("from"),
        to: query.get("to"),
        generatedAt: Date.now(),
        lastEventAt: Date.now(),
        previousTotals: [],
        funnel: {
          started: 4,
          together: 3,
          fiveMinutes: 2,
          synced: 1,
          uncertain: 0,
          medianTimeToJoinMs: 60000,
        },
        previousFunnel: {
          started: 2,
          together: 1,
          fiveMinutes: 0,
          synced: 0,
          uncertain: 0,
          medianTimeToJoinMs: null,
        },
        filters: { sites: ["youtube.com"], browsers: ["chrome"], versions: ["2.4.0"] },
        playbackResults: [
          {
            site: "youtube.com",
            browser: "chrome",
            version: "2.4.0",
            attempts: 10,
            applied: 7,
            blocked: 4,
            failed: 2,
          },
        ],
        outcomes: [
          { kind: "sync_attempt", outcome: "", count: 10 },
          { kind: "sync_result", outcome: "applied", count: 7 },
          { kind: "sync_result", outcome: "autoplay-blocked", count: 4 },
          { kind: "sync_result", outcome: "timeout", count: 2 },
        ].map((row) => ({ ...row, site: "youtube.com", browser: "chrome", version: "2.4.0" })),
        page: Number(query.get("page") ?? 0),
        totalParties: 104,
        totals: [
          { kind: "party_created", count: 4 },
          { kind: "participant_joined", count: 12 },
          { kind: "chat_sent", count: 36 },
        ],
        daily: [{ day: "2026-09-11", parties: 4, participants: 12, messages: 36 }],
        sites: [{ site: "youtube.com", parties: 4, participants: 12 }],
        sizes: [{ peak: 3, parties: 4 }],
        parties: [
          {
            key: "example",
            startedAt: Date.parse("2026-09-11T12:00:00Z"),
            durationMs: 80 * 60000,
            togetherMs: 60 * 60000,
            status: "ended",
            observedAt: Date.now(),
            participants: 4,
            peak: 3,
            connected: 0,
            messages: 36,
            sites: ["youtube.com"],
          },
        ],
        hasMoreParties: query.get("page") === "0",
      },
    });
  });
  await page.routeWebSocket("**/admin/api/live", (socket) => {
    socket.onMessage((message) => {
      if (message === "ping") socket.send("pong");
    });
    stream = socket;
    socket.send(
      JSON.stringify({
        uncertainParties: 0,
        uncertainPeers: 0,
        observedAt: Date.now(),
        parties: 1,
        peers: 2,
        together: 1,
        sites: [{ site: "youtube.com", parties: 1, peers: 2 }],
        updatedAt: Date.now(),
      }),
    );
  });
  await page.goto("http://localhost:16180/admin");
  await expect(page.getByTestId("live-participants")).toHaveText("2");
  await expect(page.getByRole("status")).toHaveText("● Live");
  await expect(
    page.getByRole("table", { name: "Recent parties" }).getByRole("cell", { name: "youtube.com" }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: "1h 20m" })).toBeVisible();
  await expect(page.getByText("Counts update", { exact: false })).toHaveCount(0);
  await expect(page.getByTestId("loaded-range")).toContainText("UTC");
  const results = page.getByRole("table", { name: "Playback results", exact: true });
  await expect(results.getByRole("cell", { name: "7 (70%)", exact: true })).toBeVisible();
  await expect(results.getByRole("cell", { name: "4 (40%)", exact: true })).toBeVisible();
  await expect(results.getByRole("cell", { name: "2 (20%)", exact: true })).toBeVisible();
  stream!.send(
    JSON.stringify({ parties: 0, peers: 0, together: 0, sites: [], updatedAt: Date.now() }),
  );
  await expect(page.getByTestId("live-participants")).toHaveText("0");
  await page.clock.install();
  await page.clock.fastForward(60000);
  expect(requests).toBe(1);
  await page.getByRole("button", { name: "Yesterday", exact: true }).click();
  await expect.poll(() => requests).toBe(2);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  expect(query.get("from")).toBe(yesterday);
  expect(query.get("to")).toBe(yesterday);
  await page.getByRole("button", { name: "30 days", exact: true }).click();
  await expect.poll(() => requests).toBe(3);
  expect(Date.parse(query.get("to")!) - Date.parse(query.get("from")!)).toBe(29 * 86400000);
  await page.getByRole("button", { name: "Custom", exact: true }).click();
  await page.getByLabel("Start date").fill("2026-09-01");
  await page.getByLabel("End date").fill("2026-09-02");
  await page.getByRole("button", { name: "View", exact: true }).click();
  await expect.poll(() => requests).toBe(4);
  expect(query.get("from")).toBe("2026-09-01");
  expect(query.get("to")).toBe("2026-09-02");
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect.poll(() => query.get("page")).toBe("1");
  await page.getByRole("combobox", { name: "Browser", exact: true }).selectOption("chrome");
  await page.getByRole("button", { name: "Apply filters", exact: true }).click();
  await expect.poll(() => query.get("browser")).toBe("chrome");
  expect(query.get("page")).toBe("0");
  await stream!.close({ code: 1008, reason: "Sign in again" });
  await expect(page.getByRole("status")).toContainText("Sign in again");
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/analytics-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/analytics-mobile.png", fullPage: true });
});

test("failed or delayed date requests never relabel the previous report", async ({ page }) => {
  const initialFrom = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  let requestCount = 0;
  let release: (() => void) | undefined;
  await page.routeWebSocket("**/admin/api/live", (socket) =>
    socket.send(
      JSON.stringify({
        parties: 0,
        peers: 0,
        together: 0,
        sites: [],
        updatedAt: Date.now(),
        observedAt: null,
        uncertainParties: 1,
        uncertainPeers: 2,
      }),
    ),
  );
  await page.route("**/admin/api/stats?*", async (route) => {
    requestCount++;
    const query = new URL(route.request().url()).searchParams;
    if (requestCount === 2) {
      await new Promise<void>((resolve) => (release = resolve));
      await route.fulfill({ status: 503, body: "Unavailable" });
      return;
    }
    await route.fulfill({
      json: {
        from: query.get("from"),
        to: query.get("to"),
        generatedAt: Date.now(),
        lastEventAt: null,
        totals: [{ kind: "party_created", count: 7 }],
        previousTotals: [],
        funnel: {
          started: 7,
          together: 0,
          fiveMinutes: 0,
          synced: 0,
          uncertain: 0,
          medianTimeToJoinMs: null,
        },
        previousFunnel: {
          started: 0,
          together: 0,
          fiveMinutes: 0,
          synced: 0,
          uncertain: 0,
          medianTimeToJoinMs: null,
        },
        filters: { sites: [], browsers: [], versions: [] },
        playbackResults: [],
        daily: [],
        sites: [],
        sizes: [],
        parties: [],
        outcomes: [],
        hasMoreParties: false,
        page: 0,
        totalParties: 7,
      },
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
  await expect.poll(() => requestCount).toBe(2);
  await expect(range).toHaveText(original!);
  release!();
  await expect(page.getByRole("alert")).toContainText("original dates");
  await expect(range).toHaveText(original!);
  await expect(
    page.getByText("1 parties have unconfirmed membership", { exact: false }),
  ).toBeVisible();
});
