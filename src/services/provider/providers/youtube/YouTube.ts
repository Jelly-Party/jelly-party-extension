import { Provider } from "../../Provider";
import { YouTubeController } from "./YouTubeController";
import { YouTubeCustomizer } from "./YouTubeCustomizer";
import { Controller } from "../Controller";
import { Customizer } from "../Customizer";
import { timeoutQuerySelector } from "@/helpers/querySelectors";

export class YouTube extends Provider {
  public controller: Controller;
  public customizer: Customizer;
  public iFrameTargetSelector: string;
  public awaitPromise: Promise<any>;
  public host: string;

  constructor() {
    super();
    this.iFrameTargetSelector = "ytd-app";
    this.awaitPromise = new Promise(res => {
      timeoutQuerySelector("body").then(e => res());
    });
    this.host = window.location.host;
    this.controller = new YouTubeController();
    this.customizer = new YouTubeCustomizer();
  }
}
