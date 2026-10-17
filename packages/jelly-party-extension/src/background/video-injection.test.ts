import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { injectVideoController, setVideoScanId } from "./video-injection";

afterEach(() => vi.unstubAllGlobals());

describe("video controller injection", () => {
  it("accepts the restarted worker's first scan despite a larger previous sequence", () => {
    const page = { __jellyPartyVideoScanId: "previous-worker:100" };
    vi.stubGlobal("window", page);

    setVideoScanId("restarted-worker:1");

    expect(page.__jellyPartyVideoScanId).toBe("restarted-worker:1");
  });

  it("keeps the latest scan when an earlier injection finishes late", () => {
    const page = {};
    vi.stubGlobal("window", page);

    setVideoScanId("worker:2");
    setVideoScanId("worker:1");

    expect(page).toHaveProperty("__jellyPartyVideoScanId", "worker:2");
  });

  it("keeps a usable main-frame player when an optional frame is inaccessible", async () => {
    const inject = vi.fn(async (allFrames: boolean) => {
      if (allFrames) throw new Error("Cannot access a cross-origin frame");
    });

    await expect(injectVideoController(inject)).resolves.toBe(true);
    expect(inject).toHaveBeenNthCalledWith(1, false);
    expect(inject).toHaveBeenNthCalledWith(2, true);
  });

  it("reports missing tab access when the main frame cannot be injected", async () => {
    const inject = vi.fn(async () => {
      throw new Error("Missing host permission");
    });

    await expect(injectVideoController(inject)).resolves.toBe(false);
    expect(inject).toHaveBeenCalledTimes(1);
  });
});
