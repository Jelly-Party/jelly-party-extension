import {
  isPlaybackAction,
  RemoteEchoGuard,
  RemoteSeekGuard,
  targetTime,
  timeFromEnd,
  type PlaybackAction,
} from "jelly-party-lib";

declare global {
  interface Window {
    __jellyPartyVideoController?: {
      isAlive(): boolean;
      refresh(): void;
      stop(): void;
    };
    __jellyPartyVideoScanId?: number;
  }
}

// Normal rescans reuse the controller so they cannot interrupt a media event.
// A development extension reload leaves its page global behind, but invalidates
// the old runtime context; replace the controller only in that case.
const previousController = window.__jellyPartyVideoController;
if (previousController?.isAlive()) {
  previousController.refresh();
} else {
  try {
    previousController?.stop();
  } catch {
    // The previous controller belongs to an invalidated extension context.
  }
  window.__jellyPartyVideoController = start();
}

function start(): NonNullable<Window["__jellyPartyVideoController"]> {
  let video: HTMLVideoElement | null = null;
  let echo = new RemoteEchoGuard();
  let remoteSeek = new RemoteSeekGuard();
  let frameScanTimer: ReturnType<typeof setTimeout> | null = null;
  const events = new AbortController();

  const report = () => {
    const next = findBestVideo(video);
    if (next !== video) {
      echo = new RemoteEchoGuard();
      remoteSeek = new RemoteSeekGuard();
    }
    video = next;
    const metrics = video ? videoMetrics(video) : null;
    void chrome.runtime.sendMessage({
      type: "video:frame-status",
      hasVideo: Boolean(video),
      area: metrics?.area ?? 0,
      score: metrics?.score ?? 0,
      canSync: Boolean(video && mediaEnd(video) !== null),
      scanId: window.__jellyPartyVideoScanId,
    });
  };

  const local = (action: PlaybackAction) => {
    if (!video) return;
    if (action === "seek" && remoteSeek.consume(video.currentTime)) return;
    if (echo.consume(action)) return;
    const end = mediaEnd(video);
    const position = end === null ? null : timeFromEnd(end, video.currentTime);
    if (position === null) return;
    void chrome.runtime.sendMessage({
      type: "video:local",
      action,
      timeFromEnd: position,
      scanId: window.__jellyPartyVideoScanId,
    });
  };

  const requestFrameScan = () => {
    if (window !== window.top || frameScanTimer) return;
    frameScanTimer = setTimeout(() => {
      frameScanTimer = null;
      void chrome.runtime.sendMessage({
        type: "video:frames-changed",
        scanId: window.__jellyPartyVideoScanId,
      });
    }, 100);
  };

  const mediaEvent = (action: PlaybackAction) => (event: Event) => {
    report();
    if (event.target === video) local(action);
  };

  document.addEventListener("play", mediaEvent("play"), { capture: true, signal: events.signal });
  document.addEventListener("pause", mediaEvent("pause"), {
    capture: true,
    signal: events.signal,
  });
  document.addEventListener("seeked", mediaEvent("seek"), {
    capture: true,
    signal: events.signal,
  });
  for (const event of ["loadedmetadata", "durationchange", "progress"]) {
    document.addEventListener(event, report, { capture: true, signal: events.signal });
  }

  const runtimeListener = (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ) => {
    if (isRefreshMessage(message)) {
      report();
      sendResponse({ ok: true });
      return undefined;
    }
    if (isSnapshotMessage(message)) {
      report();
      if (!video) {
        sendResponse({ ok: false, error: "No video found" });
        return undefined;
      }
      const end = mediaEnd(video);
      const position = end === null ? null : timeFromEnd(end, video.currentTime);
      sendResponse(
        position === null
          ? { ok: false, error: "Video duration is unavailable" }
          : {
              ok: true,
              action: video.paused ? "pause" : "play",
              timeFromEnd: position,
            },
      );
      return undefined;
    }
    if (!isApplyMessage(message)) return undefined;
    void apply(message.action, message.timeFromEnd).then(sendResponse);
    return true;
  };
  chrome.runtime.onMessage.addListener(runtimeListener);

  async function apply(action: PlaybackAction, positionFromEnd: number): Promise<object> {
    report();
    if (!video) return { ok: false, error: "No video found" };
    const end = mediaEnd(video);
    const desired = end === null ? null : targetTime(end, positionFromEnd);
    if (desired === null) {
      return {
        ok: false,
        reason: "video-unavailable",
        error: "Video duration is unavailable",
      };
    }

    const controlled = video;
    const startedAt = Date.now();
    try {
      if (Math.abs(video.currentTime - desired) > 0.5) {
        remoteSeek.mark(desired);
        video.currentTime = desired;
      }
      if (action === "play" && video.paused) {
        echo.mark("play");
        await video.play();
      } else if (action === "pause" && !video.paused) {
        echo.mark("pause");
        video.pause();
      }
      if (controlled.seeking)
        await new Promise<void>((resolve) => {
          const done = () => {
            clearTimeout(timer);
            controlled.removeEventListener("seeked", done);
            resolve();
          };
          const timer = setTimeout(done, 5000);
          controlled.addEventListener("seeked", done, { once: true });
        });
      const expected = Math.min(
        end!,
        desired + (controlled.paused ? 0 : (Date.now() - startedAt) / 1000),
      );
      if (
        controlled !== video ||
        controlled.seeking ||
        Math.abs(controlled.currentTime - expected) > 1 ||
        (action === "play" && controlled.paused) ||
        (action === "pause" && !controlled.paused)
      )
        return { ok: false, error: "The player did not apply the playback change." };
      return { ok: true };
    } catch (error) {
      // A rejected play() emits no play event, so remove the echo marker before
      // the user's eventual manual click produces one.
      if (action === "play") echo.consume("play");
      return isAutoplayBlock(error)
        ? {
            ok: false,
            reason: "interaction-required",
            error: "Press Play on the video once to resume synchronization.",
          }
        : { ok: false, error: "The page could not start playback." };
    }
  }

  const observer = new MutationObserver((mutations) => {
    report();
    if (
      mutations.some((mutation) =>
        [...mutation.addedNodes].some(
          (node) =>
            node instanceof HTMLIFrameElement ||
            (node instanceof Element && Boolean(node.querySelector("iframe"))),
        ),
      )
    ) {
      requestFrameScan();
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  document.addEventListener(
    "load",
    (event) => {
      if (event.target instanceof HTMLIFrameElement) requestFrameScan();
    },
    { capture: true, signal: events.signal },
  );
  window.addEventListener("resize", report, { signal: events.signal });
  window.addEventListener("scroll", report, { capture: true, signal: events.signal });
  report();
  return {
    isAlive() {
      try {
        return Boolean(chrome.runtime.id);
      } catch {
        return false;
      }
    },
    refresh: report,
    stop() {
      events.abort();
      observer.disconnect();
      try {
        chrome.runtime.onMessage.removeListener(runtimeListener);
      } catch {
        // The extension may have reloaded before this controller was replaced.
      }
      if (frameScanTimer) clearTimeout(frameScanTimer);
    },
  };
}

function isAutoplayBlock(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "NotAllowedError"
  );
}

function isSnapshotMessage(value: unknown): value is { type: "video:snapshot" } {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "video:snapshot"
  );
}

function isRefreshMessage(value: unknown): value is { type: "video:refresh" } {
  return (
    typeof value === "object" && value !== null && "type" in value && value.type === "video:refresh"
  );
}

function findBestVideo(current: HTMLVideoElement | null): HTMLVideoElement | null {
  const candidates = [...document.querySelectorAll("video")]
    .map((video) => ({ video, ...videoMetrics(video) }))
    .filter((candidate) => candidate.area > 0 && candidate.playable)
    .sort((left, right) => right.score - left.score || right.area - left.area);
  const best = candidates[0];
  if (!best) return null;
  const selected = candidates.find((candidate) => candidate.video === current);
  return selected && selected.score >= best.score * 0.8 ? selected.video : best.video;
}

function videoMetrics(video: HTMLVideoElement): {
  area: number;
  score: number;
  playable: boolean;
} {
  const style = getComputedStyle(video);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    Number.parseFloat(style.opacity) === 0
  ) {
    return { area: 0, score: 0, playable: false };
  }
  const rect = video.getBoundingClientRect();
  const width = Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0));
  const height = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
  const area = width * height;
  const playable = video.readyState > HTMLMediaElement.HAVE_NOTHING || Boolean(video.currentSrc);
  return {
    area,
    score: area * (video.paused ? 1 : 4),
    playable,
  };
}

function mediaEnd(video: HTMLVideoElement): number | null {
  if (Number.isFinite(video.duration) && video.duration >= 0) return video.duration;
  if (video.seekable.length === 0) return null;
  const end = video.seekable.end(video.seekable.length - 1);
  return Number.isFinite(end) && end >= 0 ? end : null;
}

function isApplyMessage(value: unknown): value is {
  type: "video:apply";
  action: PlaybackAction;
  timeFromEnd: number;
} {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Record<string, unknown>;
  return (
    message.type === "video:apply" &&
    isPlaybackAction(message.action) &&
    typeof message.timeFromEnd === "number" &&
    Number.isFinite(message.timeFromEnd)
  );
}
