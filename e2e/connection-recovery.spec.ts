import { expect, launchExtensionPeer, openSidebar, test } from "./fixtures";

const videoUrl = "http://localhost:16333/autoplay-test.html";
test("a transport interruption reconnects the same party and duplicate remote seeks do not echo", async () => {
  const host = await launchExtensionPeer(),
    guest = await launchExtensionPeer();
  try {
    const hostVideo = await host.context.newPage();
    await hostVideo.goto(videoUrl);
    await expect(hostVideo.locator("video")).toHaveJSProperty("readyState", 4);
    const hostSidebar = await openSidebar(host, hostVideo);
    await hostSidebar.getByTestId("create-party").click();
    await expect(hostSidebar.getByTestId("connection-status")).toContainText("Connected");
    const invite = (await hostSidebar.getByTestId("invite-link").textContent())!;
    const guestVideo = await guest.context.newPage();
    await guestVideo.goto(invite);
    await guestVideo.waitForURL(/\/src\/grant\/grant\.html\?/);
    await guestVideo.getByRole("button", { name: "Open video and join" }).click();
    await guestVideo.waitForURL(videoUrl);
    const guestSidebar = await openSidebar(guest, guestVideo);
    await expect(guestSidebar.getByTestId("connection-status")).toContainText("Connected");
    await expect(guestVideo.locator("video")).toHaveJSProperty("readyState", 4);
    const worker = guest.context.serviceWorkers()[0];
    await worker.evaluate(() => {
      const state = globalThis as typeof globalThis & {
        testPlaybackMessages: number;
        testReconnects: number;
      };
      state.testPlaybackMessages = 0;
      state.testReconnects = 0;
      // The saved method is called with its original socket receiver.
      // oxlint-disable-next-line typescript/unbound-method
      const send = WebSocket.prototype.send;
      WebSocket.prototype.send = function (data) {
        if (typeof data === "string") {
          const message = JSON.parse(data);
          if (message.type === "playback") state.testPlaybackMessages++;
          if (message.type === "join") state.testReconnects++;
        }
        return send.call(this, data);
      };
    });
    await guestVideo.locator("video").evaluate((video: HTMLVideoElement) => {
      let duplicate = false;
      video.addEventListener("seeked", () => {
        if (duplicate) return;
        duplicate = true;
        video.dispatchEvent(new Event("seeked"));
        video.dispatchEvent(new Event("seeked"));
        duplicate = false;
      });
    });
    await hostVideo.locator("video").evaluate((video: HTMLVideoElement) => {
      video.pause();
      video.currentTime = 3;
    });
    await expect
      .poll(() =>
        guestVideo
          .locator("video")
          .evaluate((video: HTMLVideoElement) => Math.abs(video.currentTime - 3)),
      )
      .toBeLessThan(0.6);
    // Round-trip a chat after the media event so assertions observe processed messages.
    await guestSidebar.getByTestId("chat-input").fill("Seek verified");
    await guestSidebar.getByTestId("send-chat").click();
    await expect(hostSidebar.getByText("Seek verified", { exact: true })).toBeVisible();
    expect(
      await worker.evaluate(
        () =>
          (globalThis as typeof globalThis & { testPlaybackMessages: number }).testPlaybackMessages,
      ),
    ).toBe(0);
    // Exercise the real socket recovery path with a transport error on its next send.
    await worker.evaluate(() => {
      // The saved method is called with its original socket receiver.
      // oxlint-disable-next-line typescript/unbound-method
      const send = WebSocket.prototype.send;
      WebSocket.prototype.send = function (_data) {
        WebSocket.prototype.send = send;
        this.dispatchEvent(new Event("error"));
        return undefined;
      };
    });
    await guestSidebar.getByTestId("chat-input").fill("Interrupted send");
    await guestSidebar.getByTestId("send-chat").click();
    await expect
      .poll(() =>
        worker.evaluate(
          () => (globalThis as typeof globalThis & { testReconnects: number }).testReconnects,
        ),
      )
      .toBe(1);
    await expect(guestSidebar.getByTestId("connection-status")).toContainText("Connected");
    await expect(guestSidebar.getByTestId("invite-link")).toHaveText(invite);
    await guestSidebar.getByTestId("chat-input").fill("Recovered connection");
    await guestSidebar.getByTestId("send-chat").click();
    await expect(hostSidebar.getByText("Recovered connection", { exact: true })).toBeVisible();
  } finally {
    await guest.close();
    await host.close();
  }
});
