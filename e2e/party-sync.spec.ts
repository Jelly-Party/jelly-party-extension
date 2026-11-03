import {
  expect,
  extensionTabId,
  launchExtensionPeer,
  openSidebar,
  sidePanelBehavior,
  sidePanelOptions,
  test,
} from "./fixtures";

const videoUrl = "http://localhost:16333/video-swap-test.html";

test("two peers create, join, chat, and synchronize playback in both directions", async () => {
  test.setTimeout(90_000);
  const peerA = await launchExtensionPeer();
  const peerB = await launchExtensionPeer();

  try {
    await expect
      .poll(() => sidePanelBehavior(peerA))
      .toMatchObject({
        openPanelOnActionClick: false,
      });
    const videoA = await peerA.context.newPage();
    await videoA.goto(videoUrl);
    await expect(videoA.locator("video")).toHaveJSProperty("readyState", 4);
    await videoA.locator("video").evaluate(async (video: HTMLVideoElement) => {
      video.loop = true;
      video.currentTime = 1;
      await video.play();
    });
    let sidebarA = await openSidebar(peerA, videoA);

    await expect(sidebarA.getByTestId("video-state")).toHaveText("Video ready");
    await sidebarA.getByTestId("name-input").fill("Mira");
    await sidebarA.getByTestId("emoji-option-jellyfish").click();
    await sidebarA.getByTestId("create-party").click();
    await expect(sidebarA.getByTestId("connection-status")).toContainText("Connected");
    await expect(sidebarA.getByTestId("people-summary")).toContainText("You lead · 1 watching");
    await expect(sidebarA.getByTestId("system-message")).toContainText(
      "Mira started the party with “Jelly Party local video fixture”",
    );
    await expect
      .poll(() => sidePanelOptions(peerA, videoA))
      .toMatchObject({
        enabled: true,
        path: expect.stringContaining(`sidebar.html?tab=${await extensionTabId(peerA, videoA)}`),
      });
    const invite = (await sidebarA.getByTestId("invite-link").textContent()) ?? "";
    const inviteUrl = new URL(invite);
    expect(inviteUrl.search).toBe("");
    expect(inviteUrl.hash).toContain(`@${videoUrl}`);
    await sidebarA.getByTestId("chat-input").fill("Mira got here first.");
    await sidebarA.getByTestId("send-chat").click();
    await expect(sidebarA.getByTestId("messages")).toContainText("Mira got here first.");

    const joinPage = await peerB.context.newPage();
    await joinPage.goto(invite);
    await joinPage.waitForURL(/\/src\/grant\/grant\.html\?/);
    await expect(joinPage.getByRole("button", { name: "Open video and join" })).toBeEnabled();
    await joinPage.getByRole("button", { name: "Open video and join" }).click();
    await joinPage.waitForURL(videoUrl);
    await expect(joinPage.locator("video")).toHaveJSProperty("readyState", 4);

    const sidebarB = await openSidebar(peerB, joinPage);
    await expect(sidebarB.getByTestId("connection-status")).toContainText("Connected");
    await expect(sidebarB.getByTestId("messages")).toContainText("Mira got here first.");
    await expect(sidebarB.getByTestId("system-message")).toContainText(
      "Mira started the party with “Jelly Party local video fixture”",
    );
    await expect(sidebarB.getByTestId("people-summary")).toContainText("Mira leads · 2 watching");
    await sidebarB.getByTestId("people-summary").click();
    await expect(sidebarB.getByTestId("peer-list")).toBeVisible();
    await expect(sidebarA.getByTestId("peer")).toHaveCount(2);
    await expect(sidebarB.getByTestId("peer")).toHaveCount(2);
    await expect(sidebarA.getByTestId("peer").filter({ hasText: "Mira" })).toContainText("Leader");
    await expect
      .poll(() =>
        sidebarB
          .getByTestId("peer-list")
          .evaluate((element) => element.scrollWidth - element.clientWidth),
      )
      .toBeLessThanOrEqual(1);
    await expect.poll(() => paused(joinPage)).toBe(false);
    await expect
      .poll(async () => Math.abs((await currentTime(videoA)) - (await currentTime(joinPage))))
      .toBeLessThan(1);
    await videoA.locator("video").evaluate((video: HTMLVideoElement) => {
      video.pause();
      video.loop = false;
    });
    await expect.poll(() => paused(joinPage)).toBe(true);
    await expect(sidebarB.getByTestId("party-activity")).toContainText("Mira paused the video");

    const secondInvitePage = await peerA.context.newPage();
    await secondInvitePage.goto(invite);
    await expect(secondInvitePage.locator("#status")).toContainText("already in a party");
    await expect(sidebarB.getByTestId("peer")).toHaveCount(2);

    await sidebarB.getByTestId("chat-input").fill("Ready for movie night?");
    await sidebarB.getByTestId("send-chat").click();
    await expect(sidebarA.getByTestId("messages")).toContainText("Ready for movie night?");

    for (let index = 1; index <= 16; index += 1) {
      await sendChat(sidebarB, `Scroll check ${index}: keeping the conversation moving.`);
    }
    await expect(sidebarA.getByTestId("chat-message")).toHaveCount(18);
    await expect.poll(() => chatDistanceFromBottom(sidebarA)).toBeLessThanOrEqual(1);

    await sidebarA.getByTestId("messages").evaluate((element) => {
      element.scrollTop = 0;
      element.dispatchEvent(new Event("scroll"));
    });
    const detachedScrollTop = await sidebarA
      .getByTestId("messages")
      .evaluate((element) => element.scrollTop);
    await sendChat(sidebarB, "This arrives while Mira is reading older messages.");
    await expect(sidebarA.getByTestId("new-messages")).toHaveText("↓ 1 new update");
    await expect
      .poll(() => sidebarA.getByTestId("messages").evaluate((element) => element.scrollTop))
      .toBe(detachedScrollTop);

    await sidebarA.getByTestId("new-messages").click();
    await expect(sidebarA.getByTestId("new-messages")).toBeHidden();
    await expect.poll(() => chatDistanceFromBottom(sidebarA)).toBeLessThanOrEqual(1);
    await sendChat(sidebarB, "Following the latest messages again.");
    await expect(sidebarA.getByTestId("new-messages")).toBeHidden();
    await expect.poll(() => chatDistanceFromBottom(sidebarA)).toBeLessThanOrEqual(1);

    await sidebarA.getByTestId("messages").evaluate((element) => {
      element.scrollTop = 0;
      element.dispatchEvent(new Event("scroll"));
    });
    await sendChat(sidebarB, "Another message while the reader is detached.");
    await expect(sidebarA.getByTestId("new-messages")).toBeVisible();
    await sidebarA.getByTestId("messages").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      element.dispatchEvent(new Event("scroll"));
    });
    await expect(sidebarA.getByTestId("new-messages")).toBeHidden();
    await sendChat(sidebarB, "Manual return to the bottom reattaches too.");
    await expect.poll(() => chatDistanceFromBottom(sidebarA)).toBeLessThanOrEqual(1);

    await sidebarA.close();
    await expect(sidebarB.getByTestId("peer")).toHaveCount(2);

    const secondaryVideo = joinPage.frameLocator("iframe").locator("video");
    await expect(secondaryVideo).toHaveJSProperty("readyState", 4);
    const primaryTime = await currentTime(videoA);
    await secondaryVideo.evaluate((video: HTMLVideoElement) => {
      video.currentTime = 2;
    });
    await joinPage.waitForTimeout(500);
    expect(await currentTime(videoA)).toBeCloseTo(primaryTime, 1);

    await seek(joinPage, 1);
    await expect.poll(() => currentTime(videoA)).toBeCloseTo(1, 0);

    await videoA.locator("video").evaluate((video: HTMLVideoElement) => video.play());
    await expect.poll(() => paused(joinPage)).toBe(false);
    await videoA.locator("video").evaluate((video: HTMLVideoElement) => video.pause());
    await expect.poll(() => paused(joinPage)).toBe(true);
    const pausedTime = await currentTime(videoA);

    await videoA.locator("video").evaluate((video: HTMLVideoElement) => {
      const replacement = video.cloneNode(true) as HTMLVideoElement;
      video.replaceWith(replacement);
      replacement.load();
    });
    await expect(videoA.locator("video")).toHaveJSProperty("readyState", 4);
    await expect.poll(() => currentTime(videoA)).toBeCloseTo(pausedTime, 0);
    await seek(videoA, 3);
    await expect.poll(() => currentTime(joinPage)).toBeCloseTo(3, 0);
    await joinPage.locator("video").evaluate((video: HTMLVideoElement) => video.play());
    await expect.poll(() => paused(videoA)).toBe(false);
    await joinPage.locator("video").evaluate((video: HTMLVideoElement) => video.pause());
    await expect.poll(() => paused(videoA)).toBe(true);

    // A different hostname exercises the real cross-origin navigation path,
    // including scan invalidation and destination revision hand-off.
    const nextVideoUrl = "http://127.0.0.1:16333/frame-video.html";
    await videoA.goto(nextVideoUrl);
    await expect(videoA.locator("video")).toHaveJSProperty("readyState", 4);
    await joinPage.waitForURL(nextVideoUrl);
    await expect(joinPage.locator("video")).toHaveJSProperty("readyState", 4);
    sidebarA = await openSidebar(peerA, videoA);
    await expect(sidebarA.getByTestId("return-to-video-notice")).toBeHidden();
    await expect(sidebarB.getByTestId("party-activity")).toContainText("Mira changed the video");
    await expect(sidebarB.getByTestId("system-message")).toHaveCount(2);
    await expect(sidebarB.getByTestId("system-message").last()).toContainText(
      "Mira changed the video to “Secondary framed video”",
    );
    await seek(videoA, 2);
    await expect.poll(() => currentTime(joinPage)).toBeCloseTo(2, 0);
    await joinPage.locator("video").evaluate((video: HTMLVideoElement) => video.play());
    await expect.poll(() => paused(videoA)).toBe(false);
    await joinPage.locator("video").evaluate((video: HTMLVideoElement) => video.pause());
    await expect.poll(() => paused(videoA)).toBe(true);

    // Keep the newest command queued while the follower's page/controller is
    // being replaced, then apply it as soon as discovery completes again.
    await joinPage.reload({ waitUntil: "commit" });
    await seek(videoA, 4);
    await expect(joinPage.locator("video")).toHaveJSProperty("readyState", 4);
    await expect.poll(() => currentTime(joinPage)).toBeCloseTo(4, 0);

    const noVideoUrl = "http://localhost:16333/no-video.html";
    await videoA.goto(noVideoUrl);
    await expect(sidebarA.getByTestId("return-to-video-notice")).toContainText(
      "Looking for the new video",
    );
    await expect(joinPage).toHaveURL(nextVideoUrl);
    await expect(sidebarB.getByTestId("system-message")).toHaveCount(2);
    await sidebarA.getByTestId("return-to-video").click();
    await videoA.waitForURL(nextVideoUrl);
    await expect(videoA.locator("video")).toHaveJSProperty("readyState", 4);
    await expect(sidebarA.getByTestId("return-to-video-notice")).toBeHidden();
    await seek(videoA, 3);
    await expect.poll(() => currentTime(joinPage)).toBeCloseTo(3, 0);

    await joinPage.goto(videoUrl);
    await expect(sidebarB.getByTestId("return-to-video-notice")).toContainText(
      "You left Mira’s video",
    );
    await sidebarB.getByTestId("return-to-video").click();
    await joinPage.waitForURL(nextVideoUrl);
    await expect(sidebarB.getByTestId("return-to-video-notice")).toBeHidden();
    await sidebarA.close();

    const unrelatedTab = await peerA.context.newPage();
    await unrelatedTab.goto(videoUrl);
    await expect
      .poll(() => sidePanelOptions(peerA, unrelatedTab))
      .toMatchObject({ enabled: false });
    const awaySidebar = await openSidebar(peerA, unrelatedTab);
    await expect(awaySidebar.getByTestId("away-view")).toContainText("Your party is still active");
    await expect(awaySidebar.getByTestId("away-view")).toContainText("Secondary framed video");
    await awaySidebar.getByTestId("return-to-party").click();
    await awaySidebar.close();

    sidebarA = await openSidebar(peerA, videoA);
    await expect(sidebarA.getByTestId("connection-status")).toContainText("Connected");
    await expect(sidebarA.getByTestId("messages")).toContainText("Ready for movie night?");

    await sidebarA.getByTestId("people-summary").click();
    await expect(sidebarA.getByTestId("make-leader")).toHaveCount(1);
    await sidebarA.getByTestId("make-leader").click();
    await expect(sidebarB.getByTestId("people-summary")).toContainText("You lead · 2 watching");
    await expect(sidebarA.getByTestId("people-summary")).not.toContainText("You lead");
    await expect(sidebarA.getByTestId("system-message").last()).toContainText("Mira made");
    await expect(sidebarA.getByTestId("system-message").last()).toContainText("the leader");

    const handedOverVideoUrl = "http://127.0.0.1:16333/video-swap-test.html";
    await joinPage.goto(handedOverVideoUrl);
    await expect(joinPage.locator("video")).toHaveJSProperty("readyState", 4);
    await videoA.waitForURL(handedOverVideoUrl);
    await expect(videoA.locator("video")).toHaveJSProperty("readyState", 4);
    await expect(sidebarA.getByTestId("system-message").last()).toContainText(
      "changed the video to “Jelly Party local video fixture”",
    );

    // Keep the party quiet beyond Chrome's service-worker idle window, then
    // change destinations again. The follower must remain connected and follow.
    await joinPage.waitForTimeout(31_000);
    await expect(sidebarA.getByTestId("peer")).toHaveCount(2);
    await expect(sidebarB.getByTestId("peer")).toHaveCount(2);
    const secondHandedOverVideoUrl = "http://localhost:16333/frame-video.html?second-switch";
    await joinPage.goto(secondHandedOverVideoUrl);
    await expect(joinPage.locator("video")).toHaveJSProperty("readyState", 4);
    await videoA.waitForURL(secondHandedOverVideoUrl);
    await expect(videoA.locator("video")).toHaveJSProperty("readyState", 4);
    await expect(sidebarA.getByTestId("system-message").last()).toContainText(
      "changed the video to “Secondary framed video”",
    );

    const unrelatedPeerBTab = await peerB.context.newPage();
    await unrelatedPeerBTab.goto(videoUrl);
    const awaySidebarB = await openSidebar(peerB, unrelatedPeerBTab);
    await expect(awaySidebarB.getByTestId("away-view")).toBeVisible();

    await videoA.close();
    await expect(sidebarA.getByTestId("setup-view")).toBeVisible();
    await expect(sidebarB.getByTestId("peer")).toHaveCount(1);
    await expect(sidebarB.getByTestId("peer")).toContainText("Leader");
    await expect(sidebarB.getByTestId("people-summary")).toContainText("You lead · 1 watching");
    await expect.poll(() => sidePanelOptions(peerA, unrelatedTab)).toMatchObject({ enabled: true });

    await awaySidebarB.getByTestId("leave-party").click();

    expect(await extensionTabId(peerA, unrelatedTab)).toBeGreaterThan(0);
  } finally {
    await peerB.close();
    await peerA.close();
  }
});

test("discovers a video inside an iframe added after the initial scan", async () => {
  const peer = await launchExtensionPeer();

  try {
    const page = await peer.context.newPage();
    await page.goto("http://localhost:16333/dynamic-frame-video.html");
    const sidebar = await openSidebar(peer, page);
    await expect(sidebar.getByTestId("video-state")).toHaveText("No video found in this tab");

    await page.getByRole("button", { name: "Add framed video" }).click();
    await expect(page.frameLocator("iframe").locator("video")).toHaveJSProperty("readyState", 4);
    await expect(sidebar.getByTestId("video-state")).toHaveText("Video ready");
  } finally {
    await peer.close();
  }
});

async function seek(page: import("@playwright/test").Page, seconds: number): Promise<void> {
  await page.locator("video").evaluate((video: HTMLVideoElement, target) => {
    video.currentTime = target;
  }, seconds);
}

async function currentTime(page: import("@playwright/test").Page): Promise<number> {
  return page.locator("video").evaluate((video: HTMLVideoElement) => video.currentTime);
}

async function paused(page: import("@playwright/test").Page): Promise<boolean> {
  return page.locator("video").evaluate((video: HTMLVideoElement) => video.paused);
}

async function sendChat(sidebar: import("@playwright/test").Page, text: string): Promise<void> {
  await sidebar.getByTestId("chat-input").fill(text);
  await sidebar.getByTestId("send-chat").click();
}

async function chatDistanceFromBottom(sidebar: import("@playwright/test").Page): Promise<number> {
  return sidebar
    .getByTestId("messages")
    .evaluate((element) => element.scrollHeight - element.clientHeight - element.scrollTop);
}
