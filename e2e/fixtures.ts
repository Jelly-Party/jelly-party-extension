import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { type BrowserContext, type Page, chromium, test } from "@playwright/test";

const directory = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.join(directory, "..", "packages", "jelly-party-extension", "dist-test");

export interface ExtensionPeer {
  context: BrowserContext;
  extensionId: string;
  close(): Promise<void>;
}

export async function launchExtensionPeer(): Promise<ExtensionPeer> {
  const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "jelly-party-e2e-"));
  const context = await chromium.launchPersistentContext(userDataDirectory, {
    channel: "chromium",
    headless: process.env.JELLY_E2E_HEADED !== "1",
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--autoplay-policy=no-user-gesture-required",
    ],
  });
  let worker = context.serviceWorkers()[0];
  if (!worker) worker = await context.waitForEvent("serviceworker");
  const extensionId = new URL(worker.url()).host;
  return {
    context,
    extensionId,
    async close() {
      await context.close();
      fs.rmSync(userDataDirectory, { recursive: true, force: true });
    },
  };
}

export async function blockNextExtensionVideoPlay(peer: ExtensionPeer, page: Page): Promise<void> {
  const tabId = await extensionTabId(peer, page);
  const worker = peer.context.serviceWorkers()[0];
  await worker.evaluate(async (targetTabId) => {
    const extension = globalThis as typeof globalThis & {
      chrome: {
        scripting: {
          executeScript(options: { target: { tabId: number }; func: () => void }): Promise<unknown>;
        };
      };
    };
    await extension.chrome.scripting.executeScript({
      target: { tabId: targetTabId },
      func: () => {
        const video = document.querySelector("video");
        if (!video) throw new Error("No video to instrument");
        const play = video.play.bind(video);
        let blocked = true;
        video.play = () => {
          if (!blocked) return play();
          blocked = false;
          return Promise.reject(
            new DOMException("Playback requires interaction", "NotAllowedError"),
          );
        };
      },
    });
  }, tabId);
}

export async function extensionTabId(peer: ExtensionPeer, page: Page): Promise<number> {
  const worker = peer.context.serviceWorkers()[0];
  const url = page.url();
  return worker.evaluate(async (pageUrl) => {
    const extension = globalThis as typeof globalThis & {
      chrome: { tabs: { query(query: object): Promise<Array<{ id?: number; url?: string }>> } };
    };
    const tabs = await extension.chrome.tabs.query({});
    const tab = tabs.find((candidate) => candidate.url === pageUrl);
    if (!tab?.id) throw new Error(`No extension tab for ${pageUrl}`);
    return tab.id;
  }, url);
}

export async function sidePanelOptions(
  peer: ExtensionPeer,
  page: Page,
): Promise<{ enabled?: boolean; path?: string; tabId?: number }> {
  const tabId = await extensionTabId(peer, page);
  const worker = peer.context.serviceWorkers()[0];
  return worker.evaluate(async (targetTabId) => {
    const extension = globalThis as typeof globalThis & {
      chrome: {
        sidePanel: {
          getOptions(options: { tabId: number }): Promise<{
            enabled?: boolean;
            path?: string;
            tabId?: number;
          }>;
        };
      };
    };
    return extension.chrome.sidePanel.getOptions({ tabId: targetTabId });
  }, tabId);
}

export async function sidePanelBehavior(
  peer: ExtensionPeer,
): Promise<{ openPanelOnActionClick?: boolean }> {
  const worker = peer.context.serviceWorkers()[0];
  return worker.evaluate(async () => {
    const extension = globalThis as typeof globalThis & {
      chrome: {
        sidePanel: {
          getPanelBehavior(): Promise<{ openPanelOnActionClick?: boolean }>;
        };
      };
    };
    return extension.chrome.sidePanel.getPanelBehavior();
  });
}

export async function openSidebar(peer: ExtensionPeer, videoPage: Page): Promise<Page> {
  const tabId = await extensionTabId(peer, videoPage);
  const sidebar = await peer.context.newPage();
  await sidebar.goto(
    `chrome-extension://${peer.extensionId}/src/sidebar/sidebar.html?tab=${tabId}`,
  );
  return sidebar;
}

/** Makes the extension's play() calls on this page take `delayMs` to start. */
export async function delayExtensionVideoPlay(
  peer: ExtensionPeer,
  page: Page,
  delayMs: number,
): Promise<void> {
  const tabId = await extensionTabId(peer, page);
  const worker = peer.context.serviceWorkers()[0];
  await worker.evaluate(
    async ({ targetTabId, delay }) => {
      const extension = globalThis as typeof globalThis & {
        chrome: {
          scripting: {
            executeScript(options: {
              target: { tabId: number };
              func: (delay: number) => void;
              args: [number];
            }): Promise<unknown>;
          };
        };
      };
      await extension.chrome.scripting.executeScript({
        target: { tabId: targetTabId },
        func: (delay) => {
          const video = document.querySelector("video");
          if (!video) throw new Error("No video to instrument");
          const play = video.play.bind(video);
          video.play = async () => {
            await new Promise((resolve) => setTimeout(resolve, delay));
            return play();
          };
        },
        args: [delay],
      });
    },
    { targetTabId: tabId, delay: delayMs },
  );
}

/** Test-source analytics rows recorded by the local relay since `began`. */
export async function recordedEvents(
  began: number,
): Promise<Array<{ kind: string; outcome: string; count: number }>> {
  const { stdout } = await promisify(execFile)(
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
    { encoding: "utf8", env: { ...process.env, CHOKIDAR_USEPOLLING: "1" }, timeout: 30_000 },
  );
  const [{ results }] = JSON.parse(stdout) as Array<{
    results: { rows: Array<[kind: string, outcome: string, count: number]> };
  }>;
  return results.rows.map(([kind, outcome, count]) => ({ kind, outcome, count }));
}

export { test };
export const expect = test.expect;
