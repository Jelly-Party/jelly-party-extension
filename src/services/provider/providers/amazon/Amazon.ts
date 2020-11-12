import { Provider } from "../../Provider";
import { AmazonController } from "./AmazonController";
import { AmazonCustomizer } from "./AmazonCustomizer";
import { Controller } from "../Controller";
import { Customizer } from "../Customizer";
import {
  getReferenceToLargestVideo,
  timeoutQuerySelector,
} from "@/helpers/querySelectors";

export class Amazon extends Provider {
  public controller: Controller;
  public customizer: Customizer;
  public iFrameTargetSelector: string;
  public iFrameTarget: HTMLElement | null;
  public awaitPromise: Promise<any>;
  public host: string;

  constructor() {
    super();
    this.iFrameTargetSelector = ".webPlayerSDKContainer";
    this.awaitPromise = new Promise(res => {
      timeoutQuerySelector(".webPlayerContainer").then(el => {
        const mInt = setInterval(() => {
          const vid = getReferenceToLargestVideo();
          if (vid) {
            if (vid.paused) {
              clearInterval(mInt);
              res();
            }
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
