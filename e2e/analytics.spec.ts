import { test, expect, type WebSocketRoute } from "@playwright/test";

test("dashboard applies pushed counts, shows disconnection, and fetches history only on demand", async ({
  page,
}) => {
  let requests = 0;
  let stream: WebSocketRoute | undefined;
  await page.route("**/admin/api/stats?*", async (route) => {
    requests++;
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
  await expect(page.getByRole("cell", { name: "youtube.com" })).toBeVisible();
  stream!.send(
    JSON.stringify({ parties: 0, peers: 0, together: 0, sites: [], updatedAt: Date.now() }),
  );
  await expect(page.getByTestId("live-participants")).toHaveText("0");
  await page.clock.install();
  await page.clock.fastForward(60000);
  expect(requests).toBe(1);
  await page.getByRole("button", { name: "Apply" }).click();
  await expect.poll(() => requests).toBe(2);
  await stream!.close({ code: 1008, reason: "Sign in again" });
  await expect(page.getByRole("status")).toContainText("Sign in again");
  await expect(
    page.getByText("Showing the last received snapshot.", { exact: false }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/analytics-mobile.png", fullPage: true });
});
