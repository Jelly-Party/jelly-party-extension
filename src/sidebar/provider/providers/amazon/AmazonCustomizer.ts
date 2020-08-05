import { Customizer } from "../Customizer";

export class AmazonCustomizer extends Customizer {
  public styleIdentifier = "#dv-web-player";
  public styleTarget: HTMLElement | null;

  constructor() {
    super();
    // Styles
    this.styleTarget = document.querySelector(this.styleIdentifier);
    if (this.styleTarget) {
      this.styleTarget.style.transition = "all 0.2s ease";
    } else {
      console.log(
        "Jelly-Party: Amazon Provider -> Constructor -> No rootTarget found!",
      );
    }
  }

  adjustForFullscreenAndNoSidebar() {
    if (this.styleTarget) {
      this.styleTarget.style.width = "100%";
    }
  }

  adjustForFullscreenAndSidebar() {
    if (this.styleTarget) {
      this.styleTarget.style.width =
        "calc(100vw - var(--jelly-party-sidebar-width))";
    }
  }

  adjustForNoFullscreenAndNoSidebar() {
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
}
