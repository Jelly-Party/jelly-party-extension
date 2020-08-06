import { Customizer } from "../Customizer";

export class DisneyPlusCustomizer extends Customizer {
  public styleTargetSelector = "#hudson-wrapper";
  public styleTarget: HTMLElement | null;
  private wrapperIdentifier = "#app_body_content";
  public wrapperTarget: HTMLElement | null;

  constructor() {
    super();
    // Targets
    this.styleTarget = document.querySelector(this.styleTargetSelector);
    this.wrapperTarget = document.querySelector(this.wrapperIdentifier);
  }

  adjustForFullscreenAndNoSidebar() {
    if (this.styleTarget) {
      this.styleTarget.style.width = "100%";
      this.styleTarget.style.left = "";
    }
  }

  adjustForFullscreenAndSidebar() {
    if (this.styleTarget) {
      this.styleTarget.style.width =
        "calc(100vw - var(--jelly-party-sidebar-width))";
      this.styleTarget.style.left = "0";
    }
  }

  adjustForNoFullscreenAndNoSidebar() {
    this.adjustForFullscreenAndNoSidebar();
  }

  adjustForNoFullscreenAndSidebar() {
    this.adjustForFullscreenAndSidebar();
  }
}
