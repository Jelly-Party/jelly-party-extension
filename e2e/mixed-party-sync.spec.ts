import path from "node:path";
import { fileURLToPath } from "node:url";
import { Builder, By, until } from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox.js";
import { expect, launchExtensionPeer, openSidebar, test } from "./fixtures";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const firefoxExtension = path.join(root, "packages/jelly-party-extension/dist-firefox-test");
const initialUrl = "http://localhost:16333/video-swap-test.html";
const nextUrl = "http://127.0.0.1:16333/frame-video.html";
type FirefoxDriver = firefox.Driver;

test("a Firefox-led party stays synchronized after a cross-origin destination change", async () => {
  const chromePeer = await launchExtensionPeer();
  const options = new firefox.Options()
    .addArguments("--headless")
    .setPreference("media.autoplay.default", 0)
    .setPreference("media.autoplay.blocking_policy", 0)
    .setPreference("media.autoplay.enabled.user-gestures-needed", false);
  if (process.env.FIREFOX_BIN) options.setBinary(process.env.FIREFOX_BIN);
  const service = new firefox.ServiceBuilder(process.env.GECKODRIVER_BIN).addArguments(
    "--allow-system-access",
  );
  const firefoxPeer = (await new Builder()
    .forBrowser("firefox")
    .setFirefoxOptions(options)
    .setFirefoxService(service)
    .build()) as FirefoxDriver;

  try {
    const addonId = await firefoxPeer.installAddon(firefoxExtension, true);
    await firefoxPeer.setContext(firefox.Context.CHROME);
    const extensionPage = await firefoxPeer.executeScript<string>(
      `return WebExtensionPolicy.getByID(arguments[0]).getURL("src/sidebar/sidebar.html");`,
      addonId,
    );
    await firefoxPeer.setContext(firefox.Context.CONTENT);
    await firefoxPeer.get(initialUrl);
    const firefoxVideoHandle = await firefoxPeer.getWindowHandle();
    await firefoxPeer.switchTo().newWindow("tab");
    await firefoxPeer.get(extensionPage);
    const firefoxTabId = await firefoxPeer.executeAsyncScript<number | undefined>(
      `
        const done = arguments[arguments.length - 1];
        chrome.tabs.query({}).then((tabs) => done(tabs.find((tab) => tab.url === arguments[0])?.id));
      `,
      initialUrl,
    );
    await firefoxPeer.get(`${extensionPage}?tab=${firefoxTabId}`);
    const create = await firefoxPeer.wait(
      until.elementLocated(By.css("[data-testid='create-party']")),
      10_000,
    );
    await firefoxPeer.wait(async () => create.isEnabled(), 10_000);
    await create.click();
    const status = await firefoxPeer.wait(
      until.elementLocated(By.css("[data-testid='connection-status']")),
      10_000,
    );
    await firefoxPeer.wait(until.elementTextContains(status, "Connected"), 10_000);
    const invite = await firefoxPeer.findElement(By.css("[data-testid='invite-link']")).getText();

    const chromeVideo = await chromePeer.context.newPage();
    await chromeVideo.goto(invite);
    await chromeVideo.getByRole("button", { name: "Open video and join" }).click();
    await chromeVideo.waitForURL(initialUrl);
    const chromeSidebar = await openSidebar(chromePeer, chromeVideo);
    await expect(chromeSidebar.getByTestId("connection-status")).toContainText("Connected");
    await expect(chromeSidebar.getByTestId("peer")).toHaveCount(2);

    await firefoxPeer.switchTo().window(firefoxVideoHandle);
    await firefoxPeer.get(nextUrl);
    await chromeVideo.waitForURL(nextUrl, { timeout: 30_000 });
    await expect(chromeSidebar.getByTestId("system-message")).toHaveCount(2);
    await expect(chromeSidebar.getByTestId("system-message").last()).toContainText(
      "changed the video",
    );
    await expect(chromeVideo.locator("video")).toHaveJSProperty("readyState", 4);
    await firefoxPeer.wait(
      async () =>
        (await firefoxPeer.executeScript<number>(
          "return document.querySelector('video')?.readyState ?? 0",
        )) === 4,
      30_000,
    );

    const durations = {
      chrome: await chromeVideo
        .locator("video")
        .evaluate((video: HTMLVideoElement) => video.duration),
      firefox: await firefoxPeer.executeScript<number>(
        "return document.querySelector('video').duration",
      ),
    };
    expect(Math.abs(durations.chrome - durations.firefox)).toBeLessThan(1);

    const seekTarget = 2;
    await firefoxPeer.executeScript(
      `
      document.querySelector("video").pause();
      document.querySelector("video").currentTime = arguments[0];
    `,
      seekTarget,
    );
    await expect(chromeSidebar.getByTestId("party-activity")).toContainText("seeked the video");
    await expect
      .poll(() =>
        chromeVideo.locator("video").evaluate((video: HTMLVideoElement) => video.currentTime),
      )
      .toBeCloseTo(seekTarget, 0);
    await chromeVideo.locator("video").evaluate((video: HTMLVideoElement) => video.pause());
    await firefoxPeer.wait(
      async () =>
        firefoxPeer.executeScript<boolean>("return document.querySelector('video').paused"),
      10_000,
    );
    await chromeVideo.locator("video").evaluate((video: HTMLVideoElement) => video.play());
    await firefoxPeer.wait(
      async () =>
        !(await firefoxPeer.executeScript<boolean>(
          "return document.querySelector('video').paused",
        )),
      10_000,
    );
  } finally {
    await Promise.allSettled([firefoxPeer.quit(), chromePeer.close()]);
  }
});
