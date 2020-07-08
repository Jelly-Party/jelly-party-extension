import { MainFrameMessenger, MediaCommandFrame } from "@/browser/Messenger";

// The VideoHandler handles playing, pausing & seeking videos
// on different websites. For most websites the generic video.play(),
// video.pause() & video.currentTime= will work, however some websites,
// such as Netflix, require direct access to video controllers.

export interface VideoState {
  paused: boolean | undefined;
  currentTime: number | undefined;
}

export default class VideoHandler {
  host: string;
  notyf: any;
  mainFrameMessenger: MainFrameMessenger;
  eventsToProcess: number;
  findVideoInterval: number | undefined;
  video: HTMLVideoElement | null;
  findVideoAndAttach: () => void;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seek: (tick: number) => Promise<void>;
  constructor(
    host: string,
    // notyf: any,
    mainFrameMessenger: MainFrameMessenger
  ) {
    this.host = host;
    // this.notyf = notyf;
    this.eventsToProcess = 0;
    this.findVideoInterval;
    this.video = null;
    this.mainFrameMessenger = mainFrameMessenger;
    this.findVideoAndAttach = () => {
      if (!this.video) {
        console.log("Jelly-Party: Scanning for video to attach to.");
        this.video = document.querySelector("video");
        if (this.video) {
          clearInterval(this.findVideoInterval);
          // if (this.party.ws?.readyState === 1) {
          //   this.party.updateMagicLink();
          //   this.party.updateClientState();
          // }
          console.log("Jelly-Party: Found video. Attaching to video..");
          // this.notyf.success("Video detected!");

          this.video.addEventListener("play", this.playListener);
          this.video.addEventListener("pause", this.pauseListener);
          this.video.addEventListener("seeking", this.seekingListener);
          this.video.addEventListener("emptied", this.emptiedListener);
        }
      } else {
        console.log("Jelly-Party: Checking if video source has changed..");
      }
    };
    this.initialize(host);
    this.play = this.getPlayHook(host);
    this.pause = this.getPauseHook(host);
    this.seek = this.getSeekHook(host);
  }

  initialize(host: string) {
    this.findVideoInterval = setInterval(this.findVideoAndAttach, 1000);
    switch (host) {
      case "www.netflix.com":
        this.injectScript(() => {
          console.log("Jelly-Party: Injecting Netflix hack for seeking..");
          const getPlayer = () => {
            const videoPlayer = (window as any).netflix.appContext.state.playerApp.getAPI()
              .videoPlayer;
            return videoPlayer.getVideoPlayerBySessionId(
              videoPlayer.getAllPlayerSessionIds()[0]
            );
          };
          window.addEventListener("seekRequest", function(e: any) {
            console.log("Jelly-Party: Netflix Context: Received seek request");
            console.log(e);
            const tick = e.detail * 1000;
            console.log(`tick is ${tick}`);
            getPlayer().seek(tick);
          });
          window.addEventListener("playRequest", function() {
            console.log("Jelly-Party: Netflix Context: Received play request.");
            getPlayer().play();
          });
          window.addEventListener("pauseRequest", function() {
            console.log(
              "Jelly-Party: Netflix Context: Received pause request."
            );
            getPlayer().pause();
          });
        });
        break;
      case "www.disneyplus.com":
        this.injectScript(() => {
          window.addEventListener("playPauseRequest", function() {
            console.log(
              "Jelly-Party: Disney+ Context: Received playPause request."
            );
            const vid: any = document.querySelector("video");
            if (vid) {
              const key: string | undefined = Object.keys(vid).find((elem) =>
                elem.includes("reactInternalInstance")
              );
              if (key) {
                vid[key]?.memoizedProps?.onPointerUp?.();
              }
            }
          });
        });
        break;
      default:
        console.log(
          `Jelly-Party: No custom initialization required for ${this.host}.`
        );
    }
  }

  sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  togglePlayPause() {
    this.eventsToProcess += 1;
    if (this.video?.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  getPlayHook(host: string) {
    switch (host) {
      case "www.netflix.com": {
        return async function(this: VideoHandler) {
          this.eventsToProcess += 1;
          window.dispatchEvent(new CustomEvent("playRequest"));
          await this.sleep(50);
        };
      }
      case "www.disneyplus.com": {
        return async function(this: VideoHandler) {
          this.eventsToProcess += 1;
          window.dispatchEvent(new CustomEvent("playPauseRequest"));
          await this.sleep(50);
        };
      }
      default:
        return async function(this: VideoHandler) {
          this.eventsToProcess += 1;
          await this.video?.play();
        };
    }
  }

  getPauseHook(host: string) {
    switch (host) {
      case "www.netflix.com":
        return async function(this: VideoHandler) {
          this.eventsToProcess += 1;
          window.dispatchEvent(new CustomEvent("pauseRequest"));
          await this.sleep(50);
        };
      case "www.disneyplus.com": {
        return async function(this: VideoHandler) {
          this.eventsToProcess += 1;
          window.dispatchEvent(new CustomEvent("playPauseRequest"));
          await this.sleep(50);
        };
      }
      default:
        return async function(this: VideoHandler) {
          this.eventsToProcess += 1;
          await this.video?.pause();
        };
    }
  }

  getSeekHook(host: string) {
    switch (host) {
      case "www.netflix.com":
        return async function(this: VideoHandler, tick: number) {
          const timeDelta = Math.abs(
            tick - (this.getVideoState().currentTime ?? tick)
          );
          if (timeDelta > 0.5) {
            // Seeking is actually worth it. We're off by more than half a second.
            // Disable forwarding for the upcoming seek event.
            this.eventsToProcess += 1;
            window.dispatchEvent(
              new CustomEvent<number>("seekRequest", { detail: tick })
            );
            await this.sleep(50);
          }
        };
      default:
        return async function(this: VideoHandler, tick: number) {
          if (this.video?.currentTime) {
            const timeDelta = Math.abs(
              tick - (this.getVideoState().currentTime ?? tick)
            );
            if (timeDelta > 0.5) {
              // Seeking is actually worth it. We're off by more than half a second.
              // Disable forwarding for the upcoming seek event.
              this.eventsToProcess += 1;
              this.video.currentTime = tick;
              await this.sleep(50);
            }
          }
        };
    }
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
    if (this.eventsToProcess > 0) {
      // Somebody else is asking us to play
      // We must not forward the event, otherwise we'll end up in an infinite "play now" loop
      console.log(
        "Jelly-Party: Not asking party to act - we did not generate the event. Event was caused by a peer."
      );
    } else {
      // We triggered the PlayPause button, so forward it to everybody
      // Trigger play (will sync as well)
      const dataframe: MediaCommandFrame = {
        type: "media",
        payload: {
          type: "videoUpdate",
          data: {
            variant: "play",
            tick: this.video?.currentTime,
          },
        },
        context: "JellyParty",
      };
      this.mainFrameMessenger.sendData(dataframe);
    }
    this.eventsToProcess -= 1;
  };

  pauseListener = () => {
    console.log({ type: "pause", tick: this.video?.currentTime });
    if (this.eventsToProcess > 0) {
      // Somebody else is asking us to pause
      // We must not forward the event, otherwise we'll end up in an infinite "pause now" loop
      console.log(
        "Jelly-Party: Not asking party to act - we did not generate the event. Event was caused by a peer."
      );
    } else {
      // We triggered the PlayPause button, so forward it to everybody
      // Trigger pause (will sync as well)
      const dataframe: MediaCommandFrame = {
        type: "media",
        payload: {
          type: "videoUpdate",
          data: {
            variant: "pause",
            tick: this.video?.currentTime,
          },
        },
        context: "JellyParty",
      };
      this.mainFrameMessenger.sendData(dataframe);
    }
    this.eventsToProcess -= 1;
  };

  seekingListener = () => {
    console.log({ type: "seek", tick: this.video?.currentTime });
    if (this.eventsToProcess > 0) {
      // Somebody else is asking us to seek
      // We must not forward the event, otherwise we'll end up in an infinite seek loop
      console.log(
        "Jelly-Party: Not asking party to act - we did not generate the event. Event was caused by a peer."
      );
    } else {
      // We triggered the seek, so forward it to everybody
      const dataframe: MediaCommandFrame = {
        type: "media",
        payload: {
          type: "videoUpdate",
          data: {
            variant: "seek",
            tick: this.video?.currentTime,
          },
        },
        context: "JellyParty",
      };
      this.mainFrameMessenger.sendData(dataframe);
    }
    this.eventsToProcess -= 1;
  };

  emptiedListener() {
    // this.notyf.success("Video lost! Rescanning for video..");
    // Remove open event listeners
    this.video?.removeEventListener("play", this.playListener);
    this.video?.removeEventListener("pause", this.pauseListener);
    this.video?.removeEventListener("seeked", this.seekingListener);
    this.video?.removeEventListener("emptied", this.emptiedListener);
    this.video = null;
    this.findVideoInterval = setInterval(this.findVideoAndAttach, 1000);
  }

  getVideoState(): VideoState {
    return { paused: this.video?.paused, currentTime: this.video?.currentTime };
  }
}
