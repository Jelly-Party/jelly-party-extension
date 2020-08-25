import { Customizer } from "../Customizer";

export class DefaultCustomizer extends Customizer {
  public styleTargetSelector = "body";

  constructor() {
    super();
    console.log(
      `Jelly-Party: Default Provider -> Constructor -> No customization intended for this host`,
    );
  }

  adjustForFullscreenAndSidebar() {
    this.querySelector(this.styleTargetSelector).style.width =
      "calc(100vw - var(--jelly-party-sidebar-width))";
  }

  adjustForNoFullscreenAndNoSidebar() {
    this.querySelector(this.styleTargetSelector).style.width = "100%";
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
