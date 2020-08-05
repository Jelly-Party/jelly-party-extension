import { Provider } from "../../Provider";
import { YouTubeController } from "./YouTubeController";
import { YouTubeCustomizer } from "./YouTubeCustomizer";
import { Controller } from "../Controller";
import { Customizer } from "../Customizer";

export class YouTube extends Provider {
  public controller: Controller;
  public customizer: Customizer;
  public iFrameTargetSelector: string;
  public iFrameTarget: HTMLElement | null;
  public awaitCSSSelector: string;
  public host: string;

  constructor() {
    super();
    this.iFrameTargetSelector = "ytd-app";
    this.awaitCSSSelector = "body";
    this.host = window.location.host;
    this.controller = new YouTubeController();
    this.customizer = new YouTubeCustomizer();
    this.iFrameTarget = document.querySelector(this.iFrameTargetSelector);
  }
}
