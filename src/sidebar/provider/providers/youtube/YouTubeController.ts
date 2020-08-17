import { Controller } from "../Controller";

export class YouTubeController extends Controller {
  constructor() {
    super();
  }

  setupNavigationListener = () => {
    document.addEventListener("yt-navigate-finish", () => {
      console.log("Must notify peers about navigation :)");
    });
  };

  navigateToVideo = (url: URL) => {
    if (url.pathname.includes("/watch")) {
      const customHref: string = url.pathname + url.search;
      const videoId: string | null = new URLSearchParams(url.search).get("v");
      const nextVideo = document.getElementById("thumbnail") as
        | (HTMLElement & { data: any })
        | null;

      if (nextVideo && videoId) {
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
  };
}
