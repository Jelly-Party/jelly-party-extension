import { sleep } from "@/helpers/sleep";
import { DeferredPromise } from "@/helpers/deferredPromise";
import { hostMessenger } from "@/messaging/HostMessenger";
import { Sidebar, sidebar } from "@/sidebar/Sidebar";
import { getReferenceToLargestVideo } from "@/helpers/querySelectors";
import { VideoState } from "@/messaging/protocol";

// The VideoHandler handles playing, pausing & seeking videos
// on different websites. For most websites the generic video.play(),
// video.pause() & video.currentTime= will work, however some websites,
// such as Netflix, require direct access to video controllers.

export abstract class Controller {
  findVideoInterval!: NodeJS.Timeout;
  video: HTMLVideoElement | null;
  deferred!: DeferredPromise;
  skipNextEvent: boolean;
  sidebar: Sidebar;
  play!: () => Promise<boolean>;
  pause!: () => Promise<boolean>;
  seek!: (tick: number) => Promise<any>;
  playAndForward!: () => Promise<void>;
  pauseAndForward!: () => Promise<void>;

  constructor() {
    this.sidebar = sidebar;
    this.skipNextEvent = false;
    this.video = null;
    this.initializeHost();
    this.setHooks();
  }

  initializeHost(): void {
    console.log(
      "Jelly-Party: No video controller customization in place for this host",
    );
  }

  getPlayHook(): () => Promise<void> {
    return async () => {
      await this.video?.play();
    };
  }

  getPauseHook(): () => Promise<void> {
    return async () => {
      this.video?.pause();
    };
  }

  getSeekHook(): (tick: number) => Promise<void> {
    return async (tick: number) => {
      if (this.video?.currentTime) {
        this.video.currentTime = tick;
      }
    };
  }

  setHooks() {
    this.play = this.wrapPlayPauseHandler(this.getPlayHook());
    this.pause = this.wrapPlayPauseHandler(this.getPauseHook());
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

  wrapPlayPauseHandler = (fun: () => Promise<void>) => {
    return async () => {
      const deferred = this.initNewDeferred();
      this.skipNextEvent = true;
      fun();
      return Promise.race([deferred, sleep(1000)]).then(
        () => (this.skipNextEvent = false),
      );
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
        return Promise.race([deferred, sleep(1000)]).then(
          () => (this.skipNextEvent = false),
        );
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
      paused: this.video?.paused ?? false,
      tick: this.video?.currentTime ?? 0,
    };
  }
}
