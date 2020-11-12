import { Provider } from "../../Provider";
import { DefaultController } from "./DefaultController";
import { DefaultCustomizer } from "./DefaultCustomizer";
import { Controller } from "../Controller";
import { Customizer } from "../Customizer";
import { timeoutQuerySelector } from "@/helpers/querySelectors";

export class Default extends Provider {
  public controller: Controller;
  public customizer: Customizer;
  public iFrameTargetSelector: string;
  public iFrameTarget: HTMLElement | null;
  public awaitPromise: Promise<any>;
  public host: string;

  constructor() {
    super();
    this.iFrameTargetSelector = "body";
    this.awaitPromise = new Promise(res => {
      timeoutQuerySelector("body").then(() => {
        res();
      });
    });
    this.host = window.location.host;
    this.controller = new DefaultController();
    this.customizer = new DefaultCustomizer();
    this.iFrameTarget = document.querySelector(this.iFrameTargetSelector);
  }
}
