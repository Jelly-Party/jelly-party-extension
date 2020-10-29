import { sleep } from "@/helpers/sleep";
import { DeferredPromise } from "@/helpers/deferredPromise";
import {
  customQuerySelector,
  getReferenceToLargestVideo,
  timeoutQuerySelectorAll,
} from "@/helpers/querySelectors";
import { VideoState } from "@/apps/iframe/store/types";
import { PromiseQueue } from "@/helpers/promiseQueue";
import { browser, Runtime } from "webextension-polyfill-ts";
import { ProtoframePubsub } from "@/helpers/protoframe-webext";
import { VideoControllerProtocol, VideoDescriptor } from "@/messaging/Protocol";

// The VideoHandler handles playing, pausing & seeking videos
// on different websites. For most websites the generic video.play(),
// video.pause() & video.currentTime= will suffice, however some websites,
// such as Netflix, require custom video controllers.

// The VideoController Enqueues Media Promises (Play, Pause, Seek), that it
// will play back one after another. If it fails to replay a media command
// within videoCommandTimeout, it jumps to the next enqueed command.

// While playing back media commands, we must ensure that we disable media
// event listeners. We do this by using a deferrred promise, that resolves
// once the media command has executed successfully and thereby reactivates
// media event listeners.

const videoCommandTimeout = 3000;

export abstract class Controller {
  findVideoInterval!: number;
  video: HTMLVideoElement | null;
  deferred!: DeferredPromise<any>;
  skipNextEvent: boolean;
  messagingPort!: Runtime.Port;
  pubsub!: ProtoframePubsub<VideoControllerProtocol>;
  play!: () => Promise<boolean>;
  pause!: () => Promise<boolean>;
  seek!: (tick: number) => Promise<any>;
  playAndForward!: () => Promise<void>;
  pauseAndForward!: () => Promise<void>;
  querySelector: typeof customQuerySelector;

  constructor() {
    this.querySelector = customQuerySelector;
    this.skipNextEvent = false;
    this.video = null;
    this.initializeHost();
    this.setupVideoHooks();
  }

  initializeHost(): void {
    // Override this method for custom initialization
    console.log(
      "Jelly-Party: No video controller customization in place for this host",
    );
  }

  getPlayHook(): () => Promise<void> {
    // Override this method for a custom play hook
    return async () => {
      await this.video?.play();
    };
  }

  getPauseHook(): () => Promise<void> {
    // Override this method for a custom pause hook
    return async () => {
      this.video?.pause();
    };
  }

  getSeekHook(): (tick: number) => Promise<void> {
    // Override this method for a custom seek hook
    return async (tick: number) => {
      if (this.video?.currentTime) {
        this.video.currentTime = tick;
      }
    };
  }

  setupVideoHooks() {
    this.play = this.wrapPlayHandler(this.getPlayHook());
    this.pause = this.wrapPauseHandler(this.getPauseHook());
    this.seek = this.wrapSeekHandler(this.getSeekHook());
    this.playAndForward = this.getPlayHook();
    this.pauseAndForward = this.getPauseHook();
    this.findVideoAndAttach();
  }

  findVideoAndAttach = async () => {
    console.log("Jelly-Party: Scanning for video to attach to.");
    const videos = (await timeoutQuerySelectorAll("video")) as NodeListOf<
      HTMLVideoElement
    >;
    this.video = getReferenceToLargestVideo(videos);
    clearInterval(this.findVideoInterval);
    console.log("Jelly-Party: Found video. Attaching to video..");
    this.connectToBackgroundScript();
    this.addListeners();
  };

  connectToBackgroundScript = () => {
    // Connect to the background script
    if (!this.messagingPort) {
      this.messagingPort = browser.runtime.connect(undefined, {
        name: "videoController",
      });
      this.pubsub = ProtoframePubsub.build(VideoDescriptor, this.messagingPort);
      this.pubsub.handleAsk("getVideoState", async () => {
        return { videoState: this.getVideoState() };
      });
      this.pubsub.handleTell("togglePlayPause", async () => {
        this.togglePlayPause();
      });
      this.pubsub.handleTell("enqueuePlay", async ({ tick }) => {
        PromiseQueue.enqueue(() => this.seek(tick));
        PromiseQueue.enqueue(() => this.play());
      });
      this.pubsub.handleTell("enqueuePause", async ({ tick }) => {
        PromiseQueue.enqueue(() => this.seek(tick));
        PromiseQueue.enqueue(() => this.pause());
      });
      this.pubsub.handleTell("enqueueSeek", async ({ tick }) => {
        PromiseQueue.enqueue(() => this.seek(tick));
      });

      // Let's tell the background script what videoSize we've encountered
      this.pubsub.tell("tellVideo", { videoSize: this.getVideoSize() });
    } else {
      console.log("Jelly-Party: Already connected to background script.");
    }
    this.messagingPort.onDisconnect.addListener(() => {
      // We're not wanted. Background script closed connection, ideally because
      // there's a videoController with a preferable (=larger) video.
      this.removeListeners();
    });
  };

  togglePlayPause() {
    console.log("Jelly-Party: Toggling play pause.");
    if (this.video?.paused) {
      this.playAndForward();
    } else {
      this.pauseAndForward();
    }
  }

  wrapPlayHandler = (fun: () => Promise<void>) => {
    return async () => {
      const deferred = this.initNewDeferred();
      if (this.video && this.video.paused) {
        this.skipNextEvent = true;
        fun();
        const prom = Promise.race([deferred, sleep(videoCommandTimeout)]);
        prom.then(() => (this.skipNextEvent = false));
        return prom;
      } else {
        // Immediately resolve deferred, video already playing
        this.skipNextEvent = false;
        return deferred.resolve();
      }
    };
  };

  wrapPauseHandler = (fun: () => Promise<void>) => {
    return async () => {
      const deferred = this.initNewDeferred();
      if (this.video && !this.video.paused) {
        this.skipNextEvent = true;
        fun();
        const prom = Promise.race([deferred, sleep(videoCommandTimeout)]);
        prom.then(() => (this.skipNextEvent = false));
        return prom;
      } else {
        // Immediately resolve deferred, video already paused
        this.skipNextEvent = false;
        return deferred.resolve();
      }
    };
  };

  wrapSeekHandler = (fun: (tick: number) => Promise<void>) => {
    return async (tick: number) => {
      const timeDelta = Math.abs(tick - (this.getVideoState().tick ?? tick));
      if (timeDelta > 0.5) {
        // Seeking is actually worth it. We're off by more than half a second.
        const deferred = this.initNewDeferred();
        this.skipNextEvent = true;
        fun(tick);
        return Promise.race([deferred, sleep(videoCommandTimeout)]).then(
          () => (this.skipNextEvent = false),
        );
      } else {
        // Immediately resolve deferred, not seeking
        this.skipNextEvent = false;
        return new DeferredPromise().resolve();
      }
    };
  };

  initNewDeferred() {
    this.deferred = new DeferredPromise();
    return this.deferred;
  }

  injectScript(func: () => void) {
    // See https://stackoverflow.com/questions/9515704/insert-code-into-the-page-context-using-a-content-script
    // This takes a function as an argument and injects + executes it in the current tab, with full access to the global window object
    const actualCode = "(" + func + ")();";
    const script = document.createElement("script");
    script.textContent = actualCode;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  playListener = () => {
    console.log({ type: "play", tick: this.video?.currentTime });
    if (this.skipNextEvent) {
      // We get here by programatically triggering a video event
      this.skipNextEvent = false;
      console.log(
        "Jelly-Party: Skipping event forwarding for event that we received.",
      );
      // Therefore we must resolve our deferred
      this.deferred.resolve();
      return;
    }
    // We get here through a user action
    this.pubsub.tell("requestPeersToPlay", {
      tick: this.video?.currentTime ?? 0,
    });
  };

  pauseListener = () => {
    console.log({ type: "pause", tick: this.video?.currentTime });
    if (this.skipNextEvent) {
      // We get here by programatically triggering a video event
      this.skipNextEvent = false;
      console.log(
        "Jelly-Party: Skipping event forwarding for event that we received.",
      );
      // Therefore we must resolve our deferred
      this.deferred.resolve();
      return;
    }
    // We get here through a user action
    this.pubsub.tell("requestPeersToPause", {
      tick: this.video?.currentTime ?? 0,
    });
  };

  seekedListener = () => {
    console.log({ type: "seek", tick: this.video?.currentTime });
    if (this.skipNextEvent) {
      // We get here by programatically triggering a video event
      this.skipNextEvent = false;
      console.log(
        "Jelly-Party: Skipping event forwarding for event that we received.",
      );
      // Therefore we must resolve our deferred
      this.deferred.resolve();
      return;
    }
    // We get here through a user action
    this.pubsub.tell("requestPeersToSeek", {
      tick: this.video?.currentTime ?? 0,
    });
  };

  addListeners = () => {
    this.removeListeners();
    this.video?.addEventListener("play", this.playListener);
    this.video?.addEventListener("pause", this.pauseListener);
    this.video?.addEventListener("seeked", this.seekedListener);
    this.video?.addEventListener("emptied", this.emptiedListener);
  };

  removeListeners = () => {
    this.video?.removeEventListener("play", this.playListener);
    this.video?.removeEventListener("pause", this.pauseListener);
    this.video?.removeEventListener("seeked", this.seekedListener);
    this.video?.removeEventListener("emptied", this.emptiedListener);
  };

  emptiedListener = () => {
    this.removeListeners();
    this.video = null;
    this.findVideoAndAttach();
  };

  getVideoState(): VideoState {
    return {
      paused: this.video?.paused ?? true,
      tick: this.video?.currentTime ?? 0,
    };
  }

  getVideoSize(): number {
    if (this.video) {
      return this.video.offsetWidth * this.video.offsetHeight;
    } else {
      return 0;
    }
  }
}
