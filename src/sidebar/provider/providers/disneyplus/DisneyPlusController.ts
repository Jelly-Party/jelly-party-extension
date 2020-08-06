import { Controller } from "../Controller";
import { sleep } from "@/helpers/sleep";

export class DisneyPlusController extends Controller {
  initializeHost() {
    this.injectScript(() => {
      window.addEventListener("playRequest", function() {
        console.log("Jelly-Party: Disney+ Context: Received play request.");
        const vid: any = document.querySelector("video");
        if (vid) {
          const key: string | undefined = Object.keys(vid).find(elem =>
            elem.includes("reactInternalInstance"),
          );
          if (key) {
            // Play only if currently paused
            if (vid.paused) {
              vid[key]?.memoizedProps?.onPointerUp?.();
            }
          } else {
            console.error(
              "Jelly-Party: Disney+ Error. Cannot find react instance to attach to..",
            );
          }
        }
      });
      window.addEventListener("pauseRequest", function() {
        console.log("Jelly-Party: Disney+ Context: Received pause request.");
        const vid: any = document.querySelector("video");
        if (vid) {
          const key: string | undefined = Object.keys(vid).find(elem =>
            elem.includes("reactInternalInstance"),
          );
          if (key) {
            // Play only if currently playing
            if (!vid.paused) {
              vid[key]?.memoizedProps?.onPointerUp();
            }
          } else {
            console.error(
              "Jelly-Party: Disney+ Error. Cannot find react instance to attach to..",
            );
          }
        }
      });
    });
  }

  getPlayHook() {
    return async () => {
      window.dispatchEvent(new CustomEvent("playRequest"));
      await sleep(250);
    };
  }

  getPauseHook() {
    return async () => {
      window.dispatchEvent(new CustomEvent("pauseRequest"));
    };
  }
}
