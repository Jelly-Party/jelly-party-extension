import { execFileSync } from "node:child_process";
import {
  blockNextExtensionVideoPlay,
  expect,
  launchExtensionPeer,
  openSidebar,
  test,
} from "./fixtures";

const videoUrl = "http://localhost:16333/autoplay-test.html";

test("a blocked remote play asks for one video interaction and then catches up", async () => {
  const began = Date.now();
  const host = await launchExtensionPeer();
  const guest = await launchExtensionPeer();

  try {
    const hostVideo = await host.context.newPage();
    await hostVideo.goto(videoUrl);
    await expect(hostVideo.locator("video")).toHaveJSProperty("readyState", 4);
    await hostVideo.locator("video").evaluate(async (video: HTMLVideoElement) => {
      video.loop = true;
      video.currentTime = 1;
      await video.play();
    });

    const hostSidebar = await openSidebar(host, hostVideo);
    await hostSidebar.getByTestId("create-party").click();
    await expect(hostSidebar.getByTestId("connection-status")).toContainText("Connected");
    const invite = (await hostSidebar.getByTestId("invite-link").textContent()) ?? "";

    const guestVideo = await guest.context.newPage();
    await guestVideo.goto(invite);
    await guestVideo.waitForURL(/\/src\/grant\/grant\.html\?/);
    await guestVideo.getByRole("button", { name: "Open video and join" }).click();
    await guestVideo.waitForURL(videoUrl);
    await expect(guestVideo.locator("video")).toHaveJSProperty("readyState", 4);

    const guestSidebar = await openSidebar(guest, guestVideo);
    await expect(guestSidebar.getByTestId("connection-status")).toContainText("Connected");
    await hostVideo.locator("video").evaluate((video: HTMLVideoElement) => video.pause());
    await expect(guestVideo.locator("video")).toHaveJSProperty("paused", true);

    // Reload the media, then make exactly one extension-triggered play() reject
    // with the NotAllowedError used by browser autoplay policies.
    await guestVideo.reload();
    await expect(guestVideo.locator("video")).toHaveJSProperty("readyState", 4);
    await blockNextExtensionVideoPlay(guest, guestVideo);
    await hostVideo.locator("video").evaluate((video: HTMLVideoElement) => video.play());
    await expect(guestSidebar.getByTestId("playback-blocked-notice")).toContainText(
      "Press Play on the video",
    );
    await expect(guestVideo.locator("video")).toHaveJSProperty("paused", true);

    await guestVideo.getByRole("button", { name: "Play video" }).click();
    await expect(guestSidebar.getByTestId("playback-blocked-notice")).toBeHidden();
    await expect(guestVideo.locator("video")).toHaveJSProperty("paused", false);
    await expect
      .poll(async () =>
        Math.abs(
          (await hostVideo
            .locator("video")
            .evaluate((video: HTMLVideoElement) => video.currentTime)) -
            (await guestVideo
              .locator("video")
              .evaluate((video: HTMLVideoElement) => video.currentTime)),
        ),
      )
      .toBeLessThan(1);
    await expect
      .poll(
        () => {
          const output = execFileSync(
            "vp",
            [
              "exec",
              "cf",
              "d1",
              "raw",
              "1f777b9f-e77e-4969-b8d8-0879bc3b2b49",
              "--local",
              "--persist-to",
              ".wrangler/state",
              "--sql",
              `SELECT kind,outcome,COUNT(*) AS n FROM events WHERE occurred_at >= ${began} AND source = 'test' GROUP BY kind,outcome`,
            ],
            {
              encoding: "utf8",
              env: { ...process.env, CHOKIDAR_USEPOLLING: "1" },
              timeout: 10000,
            },
          );
          const rows = (
            JSON.parse(output) as Array<{
              results: { rows: Array<[kind: string, outcome: string, count: number]> };
            }>
          )[0].results.rows;
          return {
            invited: rows.some(([kind]) => kind === "invite_opened"),
            attempted: rows.some(([kind]) => kind === "sync_attempt"),
            blocked: rows.some(([, outcome]) => outcome === "autoplay-blocked"),
            applied: rows.some(([, outcome]) => outcome === "applied"),
          };
        },
        { timeout: 15000 },
      )
      .toEqual({ invited: true, attempted: true, blocked: true, applied: true });
  } finally {
    await guest.close();
    await host.close();
  }
});
