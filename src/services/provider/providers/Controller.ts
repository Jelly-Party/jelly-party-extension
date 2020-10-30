import { sleep } from "@/helpers/sleep";
import { DeferredPromise } from "@/helpers/deferredPromise";
import { hostMessenger } from "@/services/messaging/HostMessenger";
import { getReferenceToLargestVideo } from "@/helpers/querySelectors";
import { VideoState } from "@/services/messaging/protocols/Protocol";

// The VideoHandler handles playing, pausing & seeking videos
// on different websites. For most websites the generic video.play(),
// video.pause() & video.currentTime= will work, however some websites,
// such as Netflix, require direct access to video controllers.

const videoCommandTimeout = 3000;

export abstract class Controller {
  findVideoInterval!: NodeJS.Timeout;
  video: HTMLVideoElement | null;
  deferred!: DeferredPromise;
  skipNextEvent: boolean;
  play!: () => Promise<boolean>;
  pause!: () => Promise<boolean>;
  seek!: (tick: number) => Promise<any>;
  playAndForward!: () => Promise<void>;
  pauseAndForward!: () => Promise<void>;

  constructor() {
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

  navigateToVideo(url: string): void {
    // Override this method for custom navigation
    console.log("Jelly-Party: No navigation in place for this website");
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
    this.findVideoInterval = setInterval(this.findVideoAndAttach, 1000);
  }

  findVideoAndAttach = () => {
    if (!this.video) {
      console.log("Jelly-Party: Scanning for video to attach to.");
      this.video = getReferenceToLargestVideo();
      if (this.video) {
        clearInterval(this.findVideoInterval);
        console.log("Jelly-Party: Found video. Attaching to video..");
        this.addListeners();
      }
    } else {
      console.log("Jelly-Party: Checking if video source has changed..");
    }
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
        // First we must ensure that we're paused
        let videoWasPaused = true;
        if (!this.video?.paused) {
          videoWasPaused = false;
          await this.pause();
        }
        // Next we run the seek command. This will now only trigger the seek event!!!
        const deferred = this.initNewDeferred();
        this.skipNextEvent = true;
        fun(tick);
        return Promise.race([deferred, sleep(videoCommandTimeout)]).then(
          async () => {
            // If we weren't previously paused, let's resume playback
            if (!videoWasPaused && this.video?.paused) {
              await this.play();
            }
            this.skipNextEvent = false;
          },
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
    hostMessenger.messenger.tell("forwardMediaEvent", {
      event: "play",
      tick: this.video?.currentTime ?? 0,
      type: "media",
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
    hostMessenger.messenger.tell("forwardMediaEvent", {
      event: "pause",
      tick: this.video?.currentTime ?? 0,
      type: "media",
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
    hostMessenger.messenger.tell("forwardMediaEvent", {
      event: "seek",
      tick: this.video?.currentTime ?? 0,
      type: "media",
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
    this.findVideoInterval = setInterval(this.findVideoAndAttach, 1000);
  };

  getVideoState(): VideoState {
    return {
      paused: this.video?.paused ?? true,
      tick: this.video?.currentTime ?? 0,
    };
  }
}
