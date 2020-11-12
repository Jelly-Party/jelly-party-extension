import { Controller } from "./providers/Controller";
import { Customizer } from "./providers/Customizer";

export abstract class Provider {
  public abstract controller: Controller;
  public abstract customizer: Customizer;
  public abstract iFrameTargetSelector: string;
  public abstract iFrameTarget: HTMLElement | null;
  public abstract awaitPromise: Promise<any>;
  public abstract host: string;
}
