import { sleep } from "@/helpers/sleep";
import { DeferredPromise } from "@/helpers/deferredPromise";
import { hostMessenger } from "@/services/messaging/HostMessenger";
import { getRelativeReferenceToLargestVideo } from "@/helpers/querySelectors";
import { VideoState } from "@/services/messaging/protocols/Protocol";

// The VideoHandler handles playing, pausing & seeking videos
// on different websites. For most websites the generic video.play(),
// video.pause() & video.currentTime= will work, however some websites,
// such as Netflix, require direct access to video controllers.

export abstract class Controller {
  public videoCommandTimeout = 3000;
  public deferredPlay: DeferredPromise = new DeferredPromise();
  public deferredPause: DeferredPromise = new DeferredPromise();
  public deferredSeek: DeferredPromise = new DeferredPromise();
  public seekTimeDelta = 0.5;
  findVideoInterval!: NodeJS.Timeout;
  video: HTMLVideoElement | null;
  public skipNextPlay = false;
  public skipNextPause = false;
  public skipNextSeek = false;
  public videoParentDiv: Promise<HTMLElement> | null = null;
  play!: () => Promise<boolean>;
  pause!: () => Promise<boolean>;
  seek!: (tick: number) => Promise<any>;
  playAndForward!: () => Promise<void>;
  pauseAndForward!: () => Promise<void>;

  constructor() {
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

  getSeekHook(): (arg0: number) => Promise<void> {
    // Override this method for a custom seek hook
    return async (timeFromEnd: number) => {
      if (this.video?.currentTime) {
        this.video.currentTime = this.video.duration - timeFromEnd;
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

  findVideoAndAttach = async () => {
    if (!this.video) {
      console.log("Jelly-Party: Scanning for video to attach to.");
      if (this.videoParentDiv) {
        this.video = getRelativeReferenceToLargestVideo(
          await this.videoParentDiv,
        );
      } else {
        this.video = getRelativeReferenceToLargestVideo(document.body);
      }
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
      this.deferredPlay = new DeferredPromise();
      if (this.video && this.video.paused) {
        this.skipNextPlay = true;
        fun();
        const prom = Promise.race([
          this.deferredPlay,
          sleep(this.videoCommandTimeout),
        ]);
        prom.then(() => (this.skipNextPlay = false));
        return prom;
      } else {
        // Immediately resolve deferred, video already playing
        this.skipNextPlay = false;
        return this.deferredPlay.resolve();
      }
    };
  };

  wrapPauseHandler = (fun: () => Promise<void>) => {
    return async () => {
      this.deferredPause = new DeferredPromise();
      if (this.video && !this.video.paused) {
        this.skipNextPause = true;
        fun();
        const prom = Promise.race([
          this.deferredPause,
          sleep(this.videoCommandTimeout),
        ]);
        prom.then(() => (this.skipNextPause = false));
        return prom;
      } else {
        // Immediately resolve deferred, video already paused
        this.skipNextPause = false;
        return this.deferredPause.resolve();
      }
    };
  };

  wrapSeekHandler = (fun: (timeFromEnd: number) => Promise<void>) => {
    return async (timeFromEnd: number) => {
      const currentTimeFromEnd = this.video?.duration
        ? this.video.duration - this.getVideoState().tick
        : 0;
      const timeDelta = Math.abs(timeFromEnd - currentTimeFromEnd);
      if (timeDelta > this.seekTimeDelta) {
        // Seeking is actually worth it. We're off by more than half a second.
        // First we must ensure that we're paused
        let videoWasPaused = true;
        if (!this.video?.paused) {
          videoWasPaused = false;
          await this.pause();
        }
        // Next we run the seek command. This will now only trigger the seek event!!!
        this.deferredSeek = new DeferredPromise();
        this.skipNextSeek = true;
        fun(timeFromEnd);
        return Promise.race([
          this.deferredSeek,
          sleep(this.videoCommandTimeout),
        ]).then(async () => {
          // If we weren't previously paused, let's resume playback
          if (!videoWasPaused && this.video?.paused) {
            await this.play();
          }
          this.skipNextSeek = false;
        });
      } else {
        // Immediately resolve deferred, not seeking
        console.log(`Jelly-Party: Skipping sync - timeDelta is ${timeDelta}`);
        this.skipNextSeek = false;
        return this.deferredSeek.resolve();
      }
    };
  };

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
    console.log({
      type: "play",
      timeFromEnd: (this.video?.duration ?? 0) - (this.video?.currentTime ?? 0),
    });
    if (this.skipNextPlay) {
      // We get here by programatically triggering a video event
      this.skipNextPlay = false;
      console.log(
        "Jelly-Party: Skipping event forwarding for event that we received.",
      );
      // Therefore we must resolve our deferred
      this.deferredPlay.resolve();
      return;
    }
    // We get here through a user action
    if (!this.video?.duration || !this.video?.currentTime) {
      console.log(
        `Skipping event forwarding. duration: ${this.video?.duration}; currentTime: ${this.video?.currentTime}`,
      );
    } else {
      const timeFromEnd = this.video.duration - this.video.currentTime;
      hostMessenger.messenger.tell("forwardMediaEvent", {
        event: "play",
        tick: timeFromEnd,
        type: "media",
      });
    }
  };

  pauseListener = () => {
    console.log({
      type: "pause",
      timeFromEnd: (this.video?.duration ?? 0) - (this.video?.currentTime ?? 0),
    });
    if (this.skipNextPause) {
      // We get here by programatically triggering a video event
      this.skipNextPause = false;
      console.log(
        "Jelly-Party: Skipping event forwarding for event that we received.",
      );
      // Therefore we must resolve our deferred
      this.deferredPause.resolve();
      return;
    }
    // We get here through a user action
    if (!this.video?.duration || !this.video?.currentTime) {
      console.log(
        `Skipping event forwarding. duration: ${this.video?.duration}; currentTime: ${this.video?.currentTime}`,
      );
    } else {
      const timeFromEnd = this.video.duration - this.video.currentTime;
      hostMessenger.messenger.tell("forwardMediaEvent", {
        event: "pause",
        tick: timeFromEnd,
        type: "media",
      });
    }
  };

  seekedListener = () => {
    console.log({
      type: "seek",
      timeFromEnd: (this.video?.duration ?? 0) - (this.video?.currentTime ?? 0),
    });
    if (this.skipNextSeek) {
      // We get here by programatically triggering a video event
      this.skipNextSeek = false;
      console.log(
        "Jelly-Party: Skipping event forwarding for event that we received.",
      );
      // Therefore we must resolve our deferred
      this.deferredSeek.resolve();
      return;
    }
    // We get here through a user action
    if (!this.video?.duration || !this.video?.currentTime) {
      console.log(
        `Skipping event forwarding. duration: ${this.video?.duration}; currentTime: ${this.video?.currentTime}`,
      );
    } else {
      const timeFromEnd = this.video.duration - this.video.currentTime;
      hostMessenger.messenger.tell("forwardMediaEvent", {
        event: "seek",
        tick: timeFromEnd,
        type: "media",
      });
    }
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
      duration: this.video?.duration ?? 0,
    };
  }
}
