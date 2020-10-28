import { Provider } from "../../Provider";
import { DisneyPlusController } from "./DisneyPlusController";
import { DisneyPlusCustomizer } from "./DisneyPlusCustomizer";
import { Controller } from "../Controller";
import { Customizer } from "../Customizer";

export class DisneyPlus extends Provider {
  public controller: Controller;
  public customizer: Customizer;
  public iFrameTargetSelector: string;
  public iFrameTarget: HTMLElement | null;
  public awaitCSSSelector: string;
  public host: string;

  constructor() {
    super();
    this.iFrameTargetSelector = "#app_body_content";
    this.awaitCSSSelector = "#app_index";
    this.host = window.location.host;
    this.controller = new DisneyPlusController();
    this.customizer = new DisneyPlusCustomizer();
    this.iFrameTarget = document.querySelector(this.iFrameTargetSelector);
  }
}
