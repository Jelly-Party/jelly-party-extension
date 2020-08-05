import { Customizer } from "../Customizer";

export class DisneyPlusCustomizer extends Customizer {
  public styleTargetSelector = "#app_body_content";
  public styleTarget: HTMLElement | null;
  private wrapperIdentifier = "#hudson-wrapper";
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
