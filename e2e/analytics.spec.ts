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
            participants: 4,
            peak: 3,
            connected: 0,
            messages: 36,
            sites: ["youtube.com"],
          },
        ],
        hasMoreParties: false,
      },
    });
  });
  await page.routeWebSocket("**/admin/api/live", (socket) => {
    stream = socket;
    socket.send(
      JSON.stringify({
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
  await expect(page.getByText("Dates are in UTC", { exact: false })).toHaveCount(0);
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
  await stream!.close({ code: 1008, reason: "Sign in again" });
  await expect(page.getByRole("status")).toContainText("Sign in again");
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/analytics-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/analytics-mobile.png", fullPage: true });
});
