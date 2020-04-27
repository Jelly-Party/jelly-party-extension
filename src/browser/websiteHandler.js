export default class WebsiteHandler {
  constructor(host) {
    this.host = host;
    this.initialize(host);
    this.play = this.getPlayHook(host);
    this.pause = this.getPauseHook(host);
    this.seek = this.getSeekHook(host);
  }

  initialize(host) {
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
          document
            .querySelector(".sizing-wrapper")
            .append(document.querySelector(".notyf"));
        });
        break;
      default:
        console.log(
          `Jelly-Party: No custom initialization required for ${this.host}.`
        );
    }
  }

  getPlayHook(host) {
    switch (host) {
      case "www.netflix.com":
        return function() {
          window.dispatchEvent(new CustomEvent("playRequest"));
        };
      default:
        return function(video) {
          video.play();
        };
    }
  }

  getPauseHook(host) {
    switch (host) {
      case "www.netflix.com":
        return function() {
          window.dispatchEvent(new CustomEvent("pauseRequest"));
        };
      default:
        return function(video) {
          video.pause();
        };
    }
  }

  getSeekHook(host) {
    switch (host) {
      case "www.netflix.com":
        return function(_, tick) {
          window.dispatchEvent(
            new CustomEvent("seekRequest", { detail: tick })
          );
        };
      default:
        return function(video, tick) {
          video.currentTime = tick;
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
}
