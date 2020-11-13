import { Provider } from "../../Provider";
import { AmazonController } from "./AmazonController";
import { AmazonCustomizer } from "./AmazonCustomizer";
import { Controller } from "../Controller";
import { Customizer } from "../Customizer";
import {
  getRelativeReferenceToLargestVideo,
  timeoutQuerySelector,
} from "@/helpers/querySelectors";

export class Amazon extends Provider {
  public controller: Controller;
  public customizer: Customizer;
  public iFrameTargetSelector: string;
  public awaitPromise: Promise<any>;
  public host: string;

  constructor() {
    super();
    this.iFrameTargetSelector = ".webPlayerContainer";
    this.awaitPromise = new Promise(res => {
      timeoutQuerySelector(".cascadesContainer").then(el => {
        const mInt = setInterval(() => {
          const vid = getRelativeReferenceToLargestVideo(el);
          if ((vid?.readyState ?? 0) >= 3) {
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
  }
}
