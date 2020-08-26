import { Provider } from "../../Provider";
import { AmazonController } from "./AmazonController";
import { AmazonCustomizer } from "./AmazonCustomizer";
import { Controller } from "../Controller";
import { Customizer } from "../Customizer";

export class Amazon extends Provider {
  public controller: Controller;
  public customizer: Customizer;
  public iFrameTargetSelector: string;
  public iFrameTarget: HTMLElement | null;
  public awaitCSSSelector: string;
  public host: string;

  constructor() {
    super();
    this.iFrameTargetSelector = ".webPlayerSDKContainer";
    this.awaitCSSSelector = "body";
    this.host = window.location.host;
    this.controller = new AmazonController();
    this.customizer = new AmazonCustomizer();
    this.iFrameTarget =
      document.querySelector(this.iFrameTargetSelector) ??
      document.querySelector(".cascadesContainer");
  }
}
