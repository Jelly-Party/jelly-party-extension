import { Provider } from "../../Provider";
import { DisneyPlusController } from "./DisneyPlusController";
import { DisneyPlusCustomizer } from "./DisneyPlusCustomizer";
import { Controller } from "../Controller";
import { Customizer } from "../Customizer";
import {
  getReferenceToLargestVideo,
  timeoutQuerySelector,
} from "@/helpers/querySelectors";

export class DisneyPlus extends Provider {
  public controller: Controller;
  public customizer: Customizer;
  public iFrameTargetSelector: string;
  public awaitPromise: Promise<any>;
  public host: string;

  constructor() {
    super();
    this.iFrameTargetSelector = "#app_body_content";
    this.awaitPromise = new Promise(res => {
      timeoutQuerySelector("#hudson-wrapper").then(el => {
        const mInt = setInterval(() => {
          const vid = getReferenceToLargestVideo();
          if (vid) {
            if (vid.src) {
              clearInterval(mInt);
              res();
            }
          }
        }, 500);
      });
    });
    this.host = window.location.host;
    this.controller = new DisneyPlusController();
    this.customizer = new DisneyPlusCustomizer();
  }
}
