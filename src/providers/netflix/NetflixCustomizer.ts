import { Customizer } from "../Customizer";

export class NetflixCustomizer extends Customizer {
  public styleTargetSelector = ".nfp.AkiraPlayer";
  public styleTarget: HTMLElement | null;
  public iFrameTargetSelector = ".sizing-wrapper";

  constructor() {
    super();
    this.styleTarget = this.querySelector(this.styleTargetSelector);
  }

  adjustForFullscreenAndNoSidebar() {
    this.querySelector(this.styleTargetSelector).style.width = "100%";
  }

  adjustForNoFullscreenAndSidebar() {
    this.querySelector(this.styleTargetSelector).style.width =
      "calc(100vw - var(--jelly-party-sidebar-width))";
  }

  adjustForNoFullscreenAndNoSidebar() {
    // No need for differentiating
    this.adjustForFullscreenAndNoSidebar();
  }

  adjustForFullscreenAndSidebar() {
    // No need for differentiating
    this.adjustForNoFullscreenAndSidebar();
  }
}
