import { querySelector } from "@/helpers/querySelectors";
import { Controller } from "../Controller";

export class FourAnimeController extends Controller {
  public element: HTMLElement = querySelector("#example_video_1");
  constructor() {
    super();
  }

  toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      this.element.requestFullscreen();
    }
  };
}
