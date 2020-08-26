import { Provider } from "../../Provider";
import { DefaultController } from "./DefaultController";
import { DefaultCustomizer } from "./DefaultCustomizer";
import { Controller } from "../Controller";
import { Customizer } from "../Customizer";

export class Default extends Provider {
  public controller: Controller;
  public customizer: Customizer;
  public iFrameTargetSelector: string;
  public iFrameTarget: HTMLElement | null;
  public awaitCSSSelector: string;
  public host: string;

  constructor() {
    super();
    this.iFrameTargetSelector = "body";
    this.awaitCSSSelector = "body";
    this.host = window.location.host;
    this.controller = new DefaultController();
    this.customizer = new DefaultCustomizer();
    this.iFrameTarget = document.querySelector(this.iFrameTargetSelector);
  }
}
