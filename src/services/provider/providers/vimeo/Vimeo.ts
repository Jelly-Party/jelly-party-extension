import { Provider } from "../../Provider";
import { VimeoController } from "./VimeoController";
import { VimeoCustomizer } from "./VimeoCustomizer";
import { Controller } from "../Controller";
import { Customizer } from "../Customizer";
import { timeoutQuerySelector } from "@/helpers/querySelectors";

export class Vimeo extends Provider {
  public controller: Controller;
  public customizer: Customizer;
  public iFrameTargetSelector: string;
  public awaitPromise: Promise<any>;
  public host: string;

  constructor() {
    super();
    this.iFrameTargetSelector = "#main";
    this.awaitPromise = new Promise(res => {
      timeoutQuerySelector("body").then(e => res());
    });
    this.host = window.location.host;
    this.controller = new VimeoController();
    this.customizer = new VimeoCustomizer();
  }
}
