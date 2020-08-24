import { Controller } from "../Controller";
import { hostMessenger } from "@/messaging/HostMessenger";

export class YouTubeController extends Controller {
  constructor() {
    super();
    this.navigationListener = () => {
      console.log("Jelly-Party: Must notify peers about navigation :)");
      hostMessenger.messenger.tell("forwardNavigation", {
        url: window.location.href,
      });
    };
    this.addNavigationListener();
  }

  addNavigationListener = () => {
    document.addEventListener("yt-navigate-finish", this.navigationListener);
  };

  resetNavigationListener = () => {
    document.removeEventListener("yt-navigate-finish", this.navigationListener);
    const temporaryListener = () => {
      document.removeEventListener("yt-navigate-finish", temporaryListener);
      document.addEventListener("yt-navigate-finish", this.navigationListener);
    };
    document.addEventListener("yt-navigate-finish", temporaryListener);
  };

  navigateToVideo = (stringifiedURL: string) => {
    console.log(`Should navigate to ${stringifiedURL}`);
    this.resetNavigationListener();
    const url = new URL(stringifiedURL);
    if (url.pathname.includes("/watch")) {
      const customHref: string = url.pathname + url.search;
      const videoId: string | null = new URLSearchParams(url.search).get("v");
      const nextVideo = document.querySelectorAll(
        "#thumbnail.yt-simple-endpoint",
      )[0] as (HTMLElement & { data: any }) | null;
      if (nextVideo && videoId) {
        // const handler = {
        //   get: function(obj, prop: string) {
        //     if (prop === "data") {
        //       return {
        //         watchEndpoint: { video: videoId },
        //         commandMetadata: { webCommandMetadata: { url: customHref } },
        //       };
        //     }
        //     return "world";
        //   },
        // };

        // new Proxy(nextVideo, handler);
        nextVideo.data.watchEndpoint.videoId = videoId;
        nextVideo.data.commandMetadata.webCommandMetadata.url = customHref;
        nextVideo.setAttribute("href", customHref);
        nextVideo.click();
      } else {
        console.log(
          "Jelly-Party: Missing nextVideo or videoId. Skipping navigation.",
        );
      }
    } else {
      console.log("Jelly-Party: Skipping navigation to a non-video site.");
    }

    // const nextVideoData = {
    //   clickTrackingParams:
    //     "CLwDENwwIhMIoP7h7Y206wIVgg-bCh1LUQd8MgpnLWhpZ2gtY3J2Wg9GRXdoYXRfdG9fd2F0Y2iaAQUQjh4YZg==",
    //   commandMetadata: {
    //     webCommandMetadata: {
    //       rootVe: 3832,
    //       url: "/watch?v=DeR43H-lAf8",
    //       webPageType: "WEB_PAGE_TYPE_WATCH",
    //     },
    //   },
    //   watchEndpoint: {
    //     videoId: "DeR43H-lAf8",
    //   },
    // };
  };
}
