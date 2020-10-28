import { Provider } from "../../Provider";
import { VimeoController } from "./VimeoController";
import { VimeoCustomizer } from "./VimeoCustomizer";
import { Controller } from "../Controller";
import { Customizer } from "../Customizer";

export class Vimeo extends Provider {
  public controller: Controller;
  public customizer: Customizer;
  public iFrameTargetSelector: string;
  public iFrameTarget: HTMLElement | null;
  public awaitCSSSelector: string;
  public host: string;

  constructor() {
    super();
    this.iFrameTargetSelector = "#main";
    this.awaitCSSSelector = "body";
    this.host = window.location.host;
    this.controller = new VimeoController();
    this.customizer = new VimeoCustomizer();
    this.iFrameTarget = document.querySelector(this.iFrameTargetSelector);
  }
}
