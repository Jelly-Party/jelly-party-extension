import {
  delayExtensionVideoPlay,
  expect,
  launchExtensionPeer,
  openSidebar,
  recordedEvents,
  test,
} from "./fixtures";
import type { Page } from "@playwright/test";

const videoUrl = "http://localhost:16333/autoplay-test.html";
const time = (page: Page) =>
  page.locator("video").evaluate((video: HTMLVideoElement) => video.currentTime);

test("a slow playback start is reported as applied and ends in sync", async () => {
  test.setTimeout(120_000);
  const began = Date.now();
  const host = await launchExtensionPeer();
  const guest = await launchExtensionPeer();

  try {
    const hostVideo = await host.context.newPage();
    await hostVideo.goto(videoUrl);
    await expect(hostVideo.locator("video")).toHaveJSProperty("readyState", 4);
    await hostVideo.locator("video").evaluate(async (video: HTMLVideoElement) => {
      video.loop = true;
      await video.play();
    });
    const hostSidebar = await openSidebar(host, hostVideo);
    await hostSidebar.getByTestId("create-party").click();
    await expect(hostSidebar.getByTestId("connection-status")).toContainText("Connected");
    const invite = (await hostSidebar.getByTestId("invite-link").textContent()) ?? "";

    const guestVideo = await guest.context.newPage();
    await guestVideo.goto(invite);
    await guestVideo.getByRole("button", { name: "Open video and join" }).click();
    await guestVideo.waitForURL(videoUrl);
    await expect(guestVideo.locator("video")).toHaveJSProperty("paused", false);
    const guestSidebar = await openSidebar(guest, guestVideo);
    await expect(guestSidebar.getByTestId("connection-status")).toContainText("Connected");

    await hostVideo.locator("video").evaluate((video: HTMLVideoElement) => {
      video.loop = false;
      video.pause();
    });
    await expect(guestVideo.locator("video")).toHaveJSProperty("paused", true);

    await delayExtensionVideoPlay(guest, guestVideo, 1500);
    await hostVideo.locator("video").evaluate((video: HTMLVideoElement) => {
      video.currentTime = 0.5;
      return video.play();
    });
    await expect(guestVideo.locator("video")).toHaveJSProperty("paused", false);
    await expect
      .poll(async () => Math.abs((await time(hostVideo)) - (await time(guestVideo))))
      .toBeLessThan(0.75);
    await expect(guestSidebar.getByRole("alert")).toHaveCount(0);

    await expect
      .poll(
        async () => {
          const rows = await recordedEvents(began);
          const count = (match: (row: (typeof rows)[number]) => boolean) =>
            rows.filter(match).reduce((sum, row) => sum + row.count, 0);
          return {
            applied: count((row) => row.outcome === "applied") > 0,
            issues: count((row) => ["video-missing", "failed", "timeout"].includes(row.outcome)),
          };
        },
        { timeout: 60_000 },
      )
      .toEqual({ applied: true, issues: 0 });
  } finally {
    await guest.close();
    await host.close();
  }
});
