import { Provider } from "../../Provider";
import { NetflixController } from "./NetflixController";
import { NetflixCustomizer } from "./NetflixCustomizer";
import { Controller } from "../Controller";
import { Customizer } from "../Customizer";

export class Netflix extends Provider {
  public controller: Controller;
  public customizer: Customizer;
  public iFrameTargetSelector: string;
  public iFrameTarget: HTMLElement | null;
  public awaitCSSSelector: string;
  public host: string;

  constructor() {
    super();
    this.iFrameTargetSelector = ".sizing-wrapper";
    this.awaitCSSSelector = "body";
    this.host = window.location.host;
    this.controller = new NetflixController();
    this.customizer = new NetflixCustomizer();
    this.iFrameTarget = document.querySelector(this.iFrameTargetSelector);
  }
}
