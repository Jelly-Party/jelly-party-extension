import { Provider } from "../../Provider";
import { AmazonController } from "./AmazonController";
import { AmazonCustomizer } from "./AmazonCustomizer";
import { Controller } from "../Controller";
import { Customizer } from "../Customizer";
import { timeoutQuerySelector } from "@/helpers/querySelectors";

export class Amazon extends Provider {
  public controller: Controller;
  public customizer: Customizer;
  public iFrameTargetSelector: string;
  public iFrameTarget: HTMLElement | null;
  public awaitPromise: Promise<any>;
  public host: string;

  constructor() {
    super();
    this.iFrameTargetSelector = ".cascadesContainer";
    this.awaitPromise = new Promise(res => {
      timeoutQuerySelector(".webPlayerContainer").then(el => {
        const mInt = setInterval(() => {
          const vid = el.querySelector("video");
          if (vid) {
            clearInterval(mInt);
            setTimeout(() => {
              res();
            }, 1000);
          }
        }, 500);
      });
    });
    this.host = window.location.host;
    this.controller = new AmazonController();
    this.customizer = new AmazonCustomizer();
    this.iFrameTarget =
      document.querySelector(this.iFrameTargetSelector) ??
      document.querySelector(".cascadesContainer");
  }
}
