import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Builder, By, until } from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const extensionPath = path.join(root, "packages/jelly-party-extension/dist-firefox-test");
const fixtureOrigin = process.env.JELLY_FIREFOX_FIXTURE_ORIGIN ?? "http://localhost:16334";
const videoUrl = `${fixtureOrigin}/video-swap-test.html`;
type FirefoxDriver = firefox.Driver;
const extensionPages = new WeakMap<FirefoxDriver, string>();
const addonIds = new WeakMap<FirefoxDriver, string>();
const videoHandles = new WeakMap<FirefoxDriver, string>();
const sidebarHandles = new WeakMap<FirefoxDriver, string>();

await waitForUrl("http://localhost:16180");
await waitForUrl("http://localhost:16080/health");
await waitForUrl(videoUrl);

const peerA = await launchFirefoxPeer();
const peerB = await launchFirefoxPeer();

try {
  await peerA.get(videoUrl);
  await waitForVideo(peerA);
  console.log("Firefox peer A video ready");
  videoHandles.set(peerA, await peerA.getWindowHandle());
  assert.equal(await nativeSidebarOpen(peerA), false, "Firefox sidebar opened on install");
  await openSidebar(peerA);
  await openSidebarPage(peerA);
  console.log("Firefox peer A sidebar ready");
  await waitForSidebarText(peerA, "[data-testid='video-state']", "Video ready");
  await sidebarFill(peerA, "[data-testid='name-input']", "Mira");
  await sidebarClick(peerA, "[data-testid='emoji-option-jellyfish']");
  await sidebarClick(peerA, "[data-testid='create-party']");
  await waitForSidebarText(peerA, "[data-testid='connection-status']", "Connected");
  console.log("Firefox peer A party connected");
  const invite = await sidebarText(peerA, "[data-testid='invite-link']");
  assert.equal(new URL(invite).search, "");
  assert.ok(new URL(invite).hash.endsWith(`@${videoUrl}`));

  if (await nativeSidebarOpen(peerB)) {
    await closeNativeSidebar(peerB);
    await waitForSidebarClosed(peerB);
  }
  await peerB.get(invite);
  console.log("Firefox peer B invite loaded");
  try {
    await peerB.wait(async () => {
      const extensionPage = extensionPages.get(peerB);
      if (!extensionPage) return false;
      const extensionRoot = extensionPage.split("/src/")[0];
      return (await peerB.getCurrentUrl()).startsWith(`${extensionRoot}/src/grant/grant.html?`);
    }, 10_000);
  } catch (error) {
    throw new Error(
      `Firefox invite did not hand off to the extension: ${await peerB.getCurrentUrl()}`,
      { cause: error },
    );
  }
  const join = await peerB.findElement(By.css("#allow"));
  await peerB.wait(async () => join.isEnabled(), 10_000);
  await join.click();
  try {
    await peerB.wait(until.urlIs(videoUrl), 15_000);
  } catch (error) {
    throw new Error(
      `Firefox join did not navigate: ${JSON.stringify({
        url: await peerB.getCurrentUrl(),
        status: await peerB.findElement(By.css("#status")).getText(),
        extension: await peerB.executeScript(
          "return document.documentElement.dataset.jellyPartyExtension",
        ),
      })}`,
      { cause: error },
    );
  }
  console.log("Firefox peer B joined destination");
  await waitForVideo(peerB);
  videoHandles.set(peerB, await peerB.getWindowHandle());
  await waitForNativeSidebar(peerB);
  await openSidebarPage(peerB);
  console.log("Firefox peer B sidebar opened automatically");
  await waitForSidebarText(peerB, "[data-testid='connection-status']", "Connected");
  await waitForSidebarText(
    peerB,
    "[data-testid='system-message']",
    "Mira started the party with “Jelly Party local video fixture”",
  );
  await waitForSidebarText(peerB, "[data-testid='people-summary']", "Mira leads · 2 watching");
  await sidebarClick(peerB, "[data-testid='people-summary']");
  await waitForSidebarCount(peerA, "[data-testid='peer']", 2);
  await waitForSidebarCount(peerB, "[data-testid='peer']", 2);
  console.log("Firefox peers present");

  await sidebarFill(peerB, "[data-testid='chat-input']", "Firefox movie night is ready.");
  await sidebarClick(peerB, "[data-testid='send-chat']");
  await waitForSidebarText(peerA, "[data-testid='messages']", "Firefox movie night is ready.");
  console.log("Firefox chat relayed");

  for (let index = 1; index <= 14; index += 1) {
    await sidebarFill(
      peerB,
      "[data-testid='chat-input']",
      `Firefox scroll check ${index}: enough content to overflow the sidebar.`,
    );
    await sidebarClick(peerB, "[data-testid='send-chat']");
    await waitForSidebarCount(peerA, "[data-testid='chat-message']", index + 1);
  }
  assert.ok((await sidebarDistanceFromBottom(peerA)) <= 1);
  await sidebarScroll(peerA, 0);
  const detachedTop = await sidebarScrollTop(peerA);
  await sidebarFill(peerB, "[data-testid='chat-input']", "Arriving while Firefox is detached.");
  await sidebarClick(peerB, "[data-testid='send-chat']");
  await waitForSidebarText(peerA, "[data-testid='new-messages']", "1 new update");
  assert.equal(await sidebarScrollTop(peerA), detachedTop);
  await sidebarClick(peerA, "[data-testid='new-messages']");
  await waitFor(async () => (await sidebarDistanceFromBottom(peerA)) <= 1);
  console.log("Firefox chat scrolling verified");

  await seek(peerA, 1);
  await waitFor(async () => Math.abs((await currentTime(peerB)) - 1) < 0.6);
  await setPaused(peerB, false);
  await waitFor(async () => !(await paused(peerA)));
  await setPaused(peerB, true);
  await waitFor(async () => await paused(peerA));
  console.log("Firefox playback synchronization verified");

  // Exercise a true cross-origin follow while keeping the fixture deterministic.
  const nextVideoUrl = "http://127.0.0.1:16334/frame-video.html";
  await switchToVideo(peerA);
  await peerA.get(nextVideoUrl);
  await waitForVideo(peerA);
  await waitFor(async () => {
    await switchToVideo(peerB);
    return (await peerB.getCurrentUrl()) === nextVideoUrl;
  });
  await waitForVideo(peerB);
  await waitForSidebarCount(peerB, "[data-testid='system-message']", 2);
  await waitForSidebarText(
    peerB,
    "[data-testid='system-message']:last-of-type",
    "Mira changed the video to “Secondary framed video”",
  );
  await seek(peerA, 2);
  await waitFor(async () => Math.abs((await currentTime(peerB)) - 2) < 0.6);
  console.log("Firefox leader video change followed automatically");

  const noVideoUrl = `${fixtureOrigin}/no-video.html`;
  await switchToVideo(peerA);
  await peerA.get(noVideoUrl);
  await waitForSidebarText(
    peerA,
    "[data-testid='return-to-video-notice']",
    "Looking for the new video",
  );
  await switchToVideo(peerB);
  assert.equal(await peerB.getCurrentUrl(), nextVideoUrl);
  await waitForSidebarCount(peerB, "[data-testid='system-message']", 2);
  await sidebarClickAndWaitForActiveTab(peerA, "[data-testid='return-to-video']", nextVideoUrl);
  await switchToVideo(peerA);
  await peerA.wait(until.urlIs(nextVideoUrl), 10_000);
  await waitForVideo(peerA);
  await seek(peerA, 3);
  await waitFor(async () => Math.abs((await currentTime(peerB)) - 3) < 0.6);
  console.log("Firefox leader Return restored playback synchronization");

  await closeSidebarPage(peerA);
  await closeNativeSidebar(peerA);
  await waitForSidebarClosed(peerA);
  await waitForSidebarCount(peerB, "[data-testid='peer']", 2);
  await reopenNativeSidebar(peerA);
  await waitForNativeSidebar(peerA);
  await openSidebarPage(peerA, nextVideoUrl);
  await waitForSidebarText(peerA, "[data-testid='connection-status']", "Connected");
  await waitForSidebarText(peerA, "[data-testid='messages']", "Firefox movie night is ready.");
  console.log("Firefox sidebar close and reopen preserved the party");

  await closeSidebarPage(peerA);
  await peerA.switchTo().newWindow("tab");
  const unrelatedUrl = videoUrl;
  await peerA.get(unrelatedUrl);
  await openSidebarPage(peerA, unrelatedUrl);
  await waitForSidebarText(peerA, "[data-testid='away-view']", "Your party is still active");
  assert.equal(await sidebarExists(peerA, "[data-testid='return-to-party']"), true);
  assert.equal(await sidebarExists(peerA, "[data-testid='leave-party']"), true);
  await sidebarClickAndWaitForActiveTab(peerA, "[data-testid='return-to-party']", nextVideoUrl);
  console.log("Firefox unrelated-tab away view verified");
  await closeSidebarPage(peerA);
  await openSidebarPage(peerA, nextVideoUrl);
  await waitForSidebarText(peerA, "[data-testid='connection-status']", "Connected");

  await sidebarClick(peerB, "[data-testid='leave-party']");
  await waitForSidebarCount(peerA, "[data-testid='peer']", 1);

  console.log("Firefox loaded-extension acceptance flow passed");
} finally {
  await Promise.allSettled([peerA.quit(), peerB.quit()]);
}

async function launchFirefoxPeer(): Promise<FirefoxDriver> {
  const options = new firefox.Options()
    .addArguments("--headless")
    .setPreference("media.autoplay.default", 0)
    .setPreference("media.autoplay.blocking_policy", 0)
    .setPreference("media.autoplay.enabled.user-gestures-needed", false);
  if (process.env.FIREFOX_BIN) options.setBinary(process.env.FIREFOX_BIN);
  const service = new firefox.ServiceBuilder(process.env.GECKODRIVER_BIN).addArguments(
    "--allow-system-access",
  );
  const driver = (await new Builder()
    .forBrowser("firefox")
    .setFirefoxOptions(options)
    .setFirefoxService(service)
    .build()) as FirefoxDriver;
  const addonId = await driver.installAddon(extensionPath, true);
  await driver.setContext(firefox.Context.CHROME);
  const extensionPage = await driver.executeScript<string>(
    `return WebExtensionPolicy.getByID(arguments[0]).getURL("src/sidebar/sidebar.html");`,
    addonId,
  );
  await driver.setContext(firefox.Context.CONTENT);
  addonIds.set(driver, addonId);
  extensionPages.set(driver, extensionPage);
  return driver;
}

async function openSidebar(driver: FirefoxDriver): Promise<void> {
  const addonId = addonIds.get(driver);
  assert.ok(addonId);
  await driver.setContext(firefox.Context.CHROME);
  try {
    await driver.executeAsyncScript(
      `
        const done = arguments[arguments.length - 1];
        gUnifiedExtensions.togglePanel().then(done, (error) => done(String(error)));
      `,
    );
    const action = await driver.wait(
      until.elementLocated(
        By.css(`.unified-extensions-item-action-button[data-extensionid="${addonId}"]`),
      ),
      5_000,
    );
    await action.click();
  } finally {
    await driver.setContext(firefox.Context.CONTENT);
  }
  try {
    await waitForNativeSidebar(driver);
  } catch (error) {
    throw new Error("Firefox native sidebar did not open", { cause: error });
  }
}

async function waitForNativeSidebar(driver: FirefoxDriver): Promise<void> {
  await driver.wait(async () => nativeSidebarOpen(driver), 10_000);
  await driver.setContext(firefox.Context.CHROME);
  try {
    await driver.wait(
      async () =>
        (await driver.executeScript<string | null>(`
          return document.getElementById("sidebar")?.contentDocument
            ?.querySelector("browser")?.currentURI?.spec ?? null;
        `)) === extensionPages.get(driver),
      10_000,
      "Firefox native sidebar did not load the packaged Jelly Party panel",
    );
  } finally {
    await driver.setContext(firefox.Context.CONTENT);
  }
}

async function nativeSidebarOpen(driver: FirefoxDriver): Promise<boolean> {
  await driver.setContext(firefox.Context.CHROME);
  try {
    return await driver.executeScript<boolean>(`
      const box = document.getElementById("sidebar-box");
      const browser = document.getElementById("sidebar");
      if (typeof SidebarController?.isOpen === "boolean") return SidebarController.isOpen;
      return !box?.hidden && !box?.collapsed && browser?.getAttribute("src") === "chrome://browser/content/webext-panels.xhtml";
    `);
  } finally {
    await driver.setContext(firefox.Context.CONTENT);
  }
}

async function openSidebarPage(driver: FirefoxDriver, targetUrl = videoUrl): Promise<void> {
  const videoHandle = videoHandles.get(driver);
  const extensionPage = extensionPages.get(driver);
  assert.ok(videoHandle && extensionPage);
  await driver.switchTo().newWindow("tab");
  const sidebarHandle = await driver.getWindowHandle();
  sidebarHandles.set(driver, sidebarHandle);
  await driver.get(extensionPage);
  const tabId = await driver.executeAsyncScript<number | undefined>(
    `
      const done = arguments[arguments.length - 1];
      chrome.tabs.query({}).then((tabs) => done(tabs.find((tab) => tab.url === arguments[0])?.id));
    `,
    targetUrl,
  );
  assert.equal(typeof tabId, "number", "Firefox extension could not resolve the video tab");
  await driver.get(`${extensionPage}?tab=${tabId}`);
}

async function closeSidebarPage(driver: FirefoxDriver): Promise<void> {
  const sidebarHandle = sidebarHandles.get(driver);
  const videoHandle = videoHandles.get(driver);
  assert.ok(sidebarHandle && videoHandle);
  await driver.switchTo().window(sidebarHandle);
  await driver.close();
  sidebarHandles.delete(driver);
  await driver.switchTo().window(videoHandle);
}

async function closeNativeSidebar(driver: FirefoxDriver): Promise<void> {
  await driver.setContext(firefox.Context.CHROME);
  try {
    const result = await driver.executeScript<false | Record<string, unknown>>(`
      const button = document.getElementById("sidebar-close");
      if (!button) return false;
      button.click();
      return {
        isOpen: SidebarController?.isOpen,
        currentID: SidebarController?.currentID,
        hidden: document.getElementById("sidebar-box")?.hidden,
        collapsed: document.getElementById("sidebar-box")?.collapsed,
      };
    `);
    assert.notEqual(result, false, "Firefox native sidebar close control was not available");
    console.log(`Firefox native sidebar close state: ${JSON.stringify(result)}`);
  } finally {
    await driver.setContext(firefox.Context.CONTENT);
  }
}

async function reopenNativeSidebar(driver: FirefoxDriver): Promise<void> {
  await driver.setContext(firefox.Context.CHROME);
  try {
    const opened = await driver.executeScript<boolean>(`
      const item = document.querySelector(
        '[id^="sidebarswitcher_menu_"][id$="-sidebar-action"]',
      );
      if (!item) return false;
      item.click();
      return true;
    `);
    assert.equal(opened, true, "Firefox Jelly Party sidebar menu item was not available");
  } finally {
    await driver.setContext(firefox.Context.CONTENT);
  }
}

async function waitForSidebarClosed(driver: FirefoxDriver): Promise<void> {
  await driver.wait(async () => !(await nativeSidebarOpen(driver)), 10_000);
}

async function sidebarEvaluate<T>(
  driver: FirefoxDriver,
  body: string,
  ...args: unknown[]
): Promise<T> {
  const sidebarHandle = sidebarHandles.get(driver);
  assert.ok(sidebarHandle, "Firefox sidebar assertion page is not open");
  await driver.switchTo().window(sidebarHandle);
  return driver.executeScript<T>(body, ...args);
}

async function sidebarText(driver: FirefoxDriver, selector: string): Promise<string> {
  return sidebarEvaluate<string>(
    driver,
    "return document.querySelector(arguments[0])?.textContent ?? '';",
    selector,
  );
}

async function sidebarFill(driver: FirefoxDriver, selector: string, value: string): Promise<void> {
  const filled = await sidebarEvaluate<boolean>(
    driver,
    `
      const element = document.querySelector(arguments[0]);
      if (!element) return false;
      const prototype = element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value").set;
      setter.call(element, arguments[1]);
      element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: arguments[1] }));
      return true;
    `,
    selector,
    value,
  );
  assert.equal(filled, true, `Missing sidebar input ${selector}`);
}

async function sidebarClick(driver: FirefoxDriver, selector: string): Promise<void> {
  const clicked = await sidebarEvaluate<boolean>(
    driver,
    `
      const element = document.querySelector(arguments[0]);
      if (!element) return false;
      element.click();
      return true;
    `,
    selector,
  );
  assert.equal(clicked, true, `Missing sidebar control ${selector}`);
}

async function sidebarExists(driver: FirefoxDriver, selector: string): Promise<boolean> {
  return sidebarEvaluate<boolean>(
    driver,
    "return document.querySelector(arguments[0]) !== null;",
    selector,
  );
}

async function sidebarClickAndWaitForActiveTab(
  driver: FirefoxDriver,
  selector: string,
  url: string,
): Promise<void> {
  const focused = await sidebarEvaluate<boolean>(
    driver,
    `
      const element = document.querySelector(arguments[0]);
      if (!element) return false;
      element.click();
      const expectedUrl = arguments[1];
      const deadline = Date.now() + 10_000;
      return new Promise((resolve) => {
        const check = async () => {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.url === expectedUrl) return resolve(true);
          if (Date.now() >= deadline) return resolve(false);
          setTimeout(check, 100);
        };
        void check();
      });
    `,
    selector,
    url,
  );
  assert.equal(focused, true, "Return to party did not focus the Firefox party tab");
}

async function sidebarScroll(driver: FirefoxDriver, top: number): Promise<void> {
  await sidebarEvaluate<void>(
    driver,
    `
      const element = document.querySelector("[data-testid='messages']");
      element.scrollTop = arguments[0];
      element.dispatchEvent(new Event("scroll"));
    `,
    top,
  );
}

async function sidebarScrollTop(driver: FirefoxDriver): Promise<number> {
  return sidebarEvaluate<number>(
    driver,
    "return document.querySelector(\"[data-testid='messages']\").scrollTop;",
  );
}

async function sidebarDistanceFromBottom(driver: FirefoxDriver): Promise<number> {
  return sidebarEvaluate<number>(
    driver,
    `
      const element = document.querySelector("[data-testid='messages']");
      return element.scrollHeight - element.clientHeight - element.scrollTop;
    `,
  );
}

async function waitForSidebarText(
  driver: FirefoxDriver,
  selector: string,
  text: string,
): Promise<void> {
  await driver.wait(async () => (await sidebarText(driver, selector)).includes(text), 10_000);
}

async function waitForSidebarCount(
  driver: FirefoxDriver,
  selector: string,
  count: number,
): Promise<void> {
  await driver.wait(
    async () =>
      (await sidebarEvaluate<number>(
        driver,
        "return document.querySelectorAll(arguments[0]).length;",
        selector,
      )) === count,
    10_000,
  );
}

async function waitForVideo(driver: FirefoxDriver): Promise<void> {
  await driver.wait(
    async () =>
      (await driver.executeScript<number>("return document.querySelector('video')?.readyState")) ===
      4,
    10_000,
  );
}

async function seek(driver: FirefoxDriver, seconds: number): Promise<void> {
  await switchToVideo(driver);
  await driver.executeScript("document.querySelector('video').currentTime = arguments[0]", seconds);
}

async function currentTime(driver: FirefoxDriver): Promise<number> {
  await switchToVideo(driver);
  return driver.executeScript<number>("return document.querySelector('video').currentTime");
}

async function paused(driver: FirefoxDriver): Promise<boolean> {
  await switchToVideo(driver);
  return driver.executeScript<boolean>("return document.querySelector('video').paused");
}

async function setPaused(driver: FirefoxDriver, shouldPause: boolean): Promise<void> {
  await switchToVideo(driver);
  await driver.executeScript(
    shouldPause
      ? "document.querySelector('video').pause()"
      : "document.querySelector('video').play()",
  );
}

async function switchToVideo(driver: FirefoxDriver): Promise<void> {
  const videoHandle = videoHandles.get(driver);
  assert.ok(videoHandle);
  await driver.switchTo().window(videoHandle);
}

async function waitFor(predicate: () => Promise<boolean>, timeout = 10_000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Condition was not met within ${timeout}ms`);
}

async function waitForUrl(url: string): Promise<void> {
  await waitFor(async () => {
    try {
      return (await fetch(url)).ok;
    } catch {
      return false;
    }
  }, 30_000);
}
