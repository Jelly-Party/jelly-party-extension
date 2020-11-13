import { Provider } from "../../Provider";
import { NetflixController } from "./NetflixController";
import { NetflixCustomizer } from "./NetflixCustomizer";
import { Controller } from "../Controller";
import { Customizer } from "../Customizer";
import { timeoutQuerySelector } from "@/helpers/querySelectors";

export class Netflix extends Provider {
  public controller: Controller;
  public customizer: Customizer;
  public iFrameTargetSelector: string;
  public awaitPromise: Promise<any>;
  public host: string;

  constructor() {
    super();
    this.iFrameTargetSelector = ".sizing-wrapper";
    this.awaitPromise = new Promise(res => {
      timeoutQuerySelector("body").then(e => res());
    });
    this.host = window.location.host;
    this.controller = new NetflixController();
    this.customizer = new NetflixCustomizer();
  }
}
