import { Controller } from "../Controller";
import { sleep } from "@/helpers/sleep";

export class NetflixController extends Controller {
  initializeHost() {
    this.injectScript(() => {
      console.log("Jelly-Party: Injecting Netflix hack for seeking..");
      const getPlayer = () => {
        const videoPlayer = (window as any).netflix.appContext.state.playerApp.getAPI()
          .videoPlayer;
        return videoPlayer.getVideoPlayerBySessionId(
          videoPlayer.getAllPlayerSessionIds()[0],
        );
      };
      window.addEventListener("seekRequest", function(e: any) {
        console.log("Jelly-Party: Netflix Context: Received seek request");
        console.log(e);
        const timeFromEnd = e.detail * 1000;
        getPlayer().seek(getPlayer().getDuration() - timeFromEnd);
      });
      window.addEventListener("playRequest", function() {
        console.log("Jelly-Party: Netflix Context: Received play request.");
        getPlayer().play();
      });
      window.addEventListener("pauseRequest", function() {
        console.log("Jelly-Party: Netflix Context: Received pause request.");
        getPlayer().pause();
      });
    });
  }

  getPlayHook() {
    return async () => {
      window.dispatchEvent(new CustomEvent("playRequest"));
    };
  }

  getPauseHook() {
    return async () => {
      window.dispatchEvent(new CustomEvent("pauseRequest"));
      await sleep(250);
    };
  }

  getSeekHook() {
    return async (tick: number) => {
      window.dispatchEvent(
        new CustomEvent<number>("seekRequest", { detail: tick }),
      );
    };
  }
}
