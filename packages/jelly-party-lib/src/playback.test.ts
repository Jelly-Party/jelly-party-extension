import { RemoteSeekGuard } from "./playback";
import { describe, expect, it } from "vite-plus/test";
import { liveTimeFromEnd, RemoteEchoGuard, targetTime, timeFromEnd } from "./playback.js";

describe("finite playback positions", () => {
  it("translates positions through distance from the end", () => {
    expect(timeFromEnd(120, 30)).toBe(90);
    expect(targetTime(200, 90)).toBe(110);
  });

  it("clamps impossible and non-finite values", () => {
    expect(timeFromEnd(120, 140)).toBe(0);
    expect(targetTime(120, 500)).toBe(0);
    expect(targetTime(Number.POSITIVE_INFINITY, 10)).toBeNull();
  });
});

describe("live playback snapshots", () => {
  it("advances a playing snapshot by its elapsed wall-clock time", () => {
    expect(liveTimeFromEnd({ playing: true, timeFromEnd: 90, updatedAt: 1_000 }, 3_500)).toBe(87.5);
  });

  it("keeps paused snapshots fixed and ignores future timestamps", () => {
    expect(liveTimeFromEnd({ playing: false, timeFromEnd: 90, updatedAt: 1_000 }, 3_500)).toBe(90);
    expect(liveTimeFromEnd({ playing: true, timeFromEnd: 90, updatedAt: 3_500 }, 1_000)).toBe(90);
  });
});

describe("remote playback echo suppression", () => {
  it("consumes only events marked as consequences of a remote command", () => {
    const guard = new RemoteEchoGuard();
    guard.mark("pause", "seek");

    expect(guard.consume("pause")).toBe(true);
    expect(guard.consume("play")).toBe(false);
    expect(guard.consume("seek")).toBe(true);
    expect(guard.consume("seek")).toBe(false);
  });
});

describe("remote seek echoes", () => {
  it("suppresses duplicate player events but preserves another seek and expires", () => {
    const guard = new RemoteSeekGuard();
    guard.mark(20, 1000);
    expect(guard.consume(20, 1010)).toBe(true);
    expect(guard.consume(20.1, 1020)).toBe(true);
    expect(guard.consume(30, 1030)).toBe(false);
    guard.mark(40, 2000);
    expect(guard.consume(40, 5000)).toBe(false);
  });
});
