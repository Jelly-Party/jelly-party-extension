import { Provider } from "../../Provider";
import { FourAnimeController } from "./FourAnimeController";
import { FourAnimeCustomizer } from "./FourAnimeCustomizer";
import { Controller } from "../Controller";
import { Customizer } from "../Customizer";
import { timeoutQuerySelector } from "@/helpers/querySelectors";

export class FourAnime extends Provider {
  public controller: Controller;
  public customizer: Customizer;
  public iFrameTargetSelector: string;
  public awaitPromise: Promise<any>;
  public host: string;

  constructor() {
    super();
    this.iFrameTargetSelector = "#example_video_1";
    this.awaitPromise = new Promise(res => {
      timeoutQuerySelector("body").then(() => {
        res();
      });
    });
    this.host = window.location.host;
    this.controller = new FourAnimeController();
    this.customizer = new FourAnimeCustomizer();
  }
}
