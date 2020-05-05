export default class VideoHandler {
  constructor(host, notyf, party) {
    this.host = host;
    this.notyf = notyf;
    this.party = party;
    this.eventsToProcess = 0;
    this.findVideoInterval = null;
    this.findVideoAndAttach = null;
    this.boundPlayListener = this.playListener.bind(this);
    this.boundPauseListener = this.pauseListener.bind(this);
    this.boundSeekingListener = this.seekingListener.bind(this);
    this.boundEmptiedListener = this.emptiedListener.bind(this);
    this.initialize(host);
    this.play = this.getPlayHook(host);
    this.pause = this.getPauseHook(host);
    this.seek = this.getSeekHook(host);
  }

  initialize(host) {
    this.findVideoAndAttach = () => {
      if (!this.video) {
        console.log("Jelly-Party: Scanning for video to attach to.");
        this.video = document.querySelector("video");
        if (this.video) {
          clearInterval(this.findVideoInterval);
          this.party.chatHandler.resetChat();
          this.party.video = this.video;
          this.party.partyState.video = true;
          if (this.party.ws?.readyState === 1) {
            this.party.updateMagicLink();
            this.party.updateClientState();
          }
          console.log("Jelly-Party: Found video. Attaching to video..");
          this.notyf.success("Video detected!");

          this.video.addEventListener("play", this.boundPlayListener);
          this.video.addEventListener("pause", this.boundPauseListener);
          this.video.addEventListener("seeking", this.boundSeekingListener);
          this.video.addEventListener("emptied", this.boundEmptiedListener);
        }
      } else {
        console.log("Jelly-Party: Checking if video source has changed..");
      }
    };
    this.findVideoInterval = setInterval(this.findVideoAndAttach, 1000);
    switch (host) {
      case "www.netflix.com":
        this.injectScript(() => {
          console.log("Jelly-Party: Injecting Netflix hack for seeking..");
          const getPlayer = () => {
            const videoPlayer = window.netflix.appContext.state.playerApp.getAPI()
              .videoPlayer;
            return videoPlayer.getVideoPlayerBySessionId(
              videoPlayer.getAllPlayerSessionIds()[0]
            );
          };
          window.addEventListener("seekRequest", function(e) {
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
          // We must move the .notyf Node inside the .sizing wrapper, to enable
          // notyf notifications when Netflix is in full-screen mode.
          // This is, because unlike most websites which request the entire
          // html-document to be in fullscreen, netflix requests the
          // sizing wrapper to be in fullscreen.
          // See the fullscreen API: https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API
          try {
            document
              .querySelector(".sizing-wrapper")
              .append(document.querySelector(".notyf"));
          } catch {
            console.log("Jelly-Party: Cannot reattach Notyf.");
          }
        });
        break;
      case "www.disneyplus.com":
        try {
          document
            .querySelector("#app_body_content")
            .append(document.querySelector(".notyf"));
        } catch {
          console.log("Jelly-Party: Cannot reattach Notyf.");
        }
        break;
      default:
        console.log(
          `Jelly-Party: No custom initialization required for ${this.host}.`
        );
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getPlayHook(host) {
    switch (host) {
      case "www.netflix.com":
        return async function() {
          window.dispatchEvent(new CustomEvent("playRequest"));
          await this.sleep(50);
        };
      default:
        return async function() {
          await this.video.play();
        };
    }
  }

  getPauseHook(host) {
    switch (host) {
      case "www.netflix.com":
        return async function() {
          window.dispatchEvent(new CustomEvent("pauseRequest"));
          await this.sleep(50);
        };
      default:
        return async function() {
          await this.video.pause();
        };
    }
  }

  getSeekHook(host) {
    switch (host) {
      case "www.netflix.com":
        return async function(tick) {
          window.dispatchEvent(
            new CustomEvent("seekRequest", { detail: tick })
          );
          await this.sleep(50);
        };
      default:
        return async function(tick) {
          this.video.currentTime = tick;
          await this.sleep(50);
        };
    }
  }

  injectScript(func) {
    // See https://stackoverflow.com/questions/9515704/insert-code-into-the-page-context-using-a-content-script
    // This takes a function as an argument and injects + executes it in the current tab, with full access to the global window object
    var actualCode = "(" + func + ")();";
    var script = document.createElement("script");
    script.textContent = actualCode;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  playListener() {
    console.log({ type: "play", tick: this.video.currentTime });
    if (this.eventsToProcess > 0) {
      // Somebody else is asking us to play
      // We must not forward the event, otherwise we'll end up in an infinite "play now" loop
      console.log(
        "Jelly-Party: Not asking party to act - we did not generate the event. Event was caused by a peer."
      );
    } else {
      // We triggered the PlayPause button, so forward it to everybody
      // Trigger play (will sync as well)
      this.party.requestPeersToPlay();
    }
    this.eventsToProcess -= 1;
  }

  pauseListener() {
    console.log({ type: "pause", tick: this.video.currentTime });
    if (this.eventsToProcess > 0) {
      // Somebody else is asking us to pause
      // We must not forward the event, otherwise we'll end up in an infinite "pause now" loop
      console.log(
        "Jelly-Party: Not asking party to act - we did not generate the event. Event was caused by a peer."
      );
    } else {
      // We triggered the PlayPause button, so forward it to everybody
      // Trigger pause (will sync as well)
      this.party.requestPeersToPause();
    }
    this.eventsToProcess -= 1;
  }

  seekingListener() {
    console.log({ type: "seek", tick: this.video.currentTime });
    if (this.eventsToProcess > 0) {
      // Somebody else is asking us to seek
      // We must not forward the event, otherwise we'll end up in an infinite seek loop
      console.log(
        "Jelly-Party: Not asking party to act - we did not generate the event. Event was caused by a peer."
      );
    } else {
      // We triggered the seek, so forward it to everybody
      this.party.requestPeersToSeek();
    }
    this.eventsToProcess -= 1;
  }

  // TODO: Decide if switch to mutation observer is sensible
  emptiedListener() {
    this.notyf.success("Video lost! Rescanning for video..");
    // Remove open event listeners
    this.video.removeEventListener("play", this.boundPlayListener);
    this.video.removeEventListener("pause", this.boundPauseListener);
    this.video.removeEventListener("seeked", this.boundSeekingListener);
    this.video.removeEventListener("emptied", this.boundEmptiedListener);
    this.video = null;
    this.party.partyState.video = false;
    this.findVideoInterval = setInterval(this.findVideoAndAttach, 1000);
  }
}
