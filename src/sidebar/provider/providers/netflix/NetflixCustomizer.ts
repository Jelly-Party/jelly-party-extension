import { Customizer } from "../Customizer";

export class NetflixCustomizer extends Customizer {
  public styleTargetSelector = ".nfp.AkiraPlayer";
  public styleTarget: HTMLElement | null;

  constructor() {
    super();
    this.styleTarget = document.querySelector(this.styleTargetSelector);
  }

  adjustForFullscreenAndNoSidebar() {
    if (this.styleTarget) {
      this.styleTarget.style.width = "100%";
    }
  }

  adjustForNoFullscreenAndSidebar() {
    if (this.styleTarget) {
      this.styleTarget.style.width =
        "calc(100vw - var(--jelly-party-sidebar-width))";
    }
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
