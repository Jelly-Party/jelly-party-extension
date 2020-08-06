import { Customizer } from "../Customizer";

export class DefaultCustomizer extends Customizer {
  public styleTarget: HTMLElement | null;

  constructor() {
    super();
    this.styleTarget = document.body;
    console.log(
      `Jelly-Party: Default Provider -> Constructor -> No customization intended for this host`,
    );
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

  adjustForFullscreenAndNoSidebar() {
    // No need for differentiating
    this.adjustForNoFullscreenAndNoSidebar();
  }

  adjustForNoFullscreenAndSidebar() {
    // No need for differentiating
    this.adjustForFullscreenAndSidebar();
  }
}
