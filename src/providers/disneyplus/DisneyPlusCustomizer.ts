import { Customizer } from "../Customizer";

export class DisneyPlusCustomizer extends Customizer {
  public styleTargetSelector = "#hudson-wrapper";
  private wrapperIdentifier = "#app_body_content";
  public wrapperTarget: HTMLElement | null;

  constructor() {
    super();
    this.wrapperTarget = this.querySelector(this.wrapperIdentifier);
  }

  adjustForFullscreenAndNoSidebar() {
    this.querySelector(this.styleTargetSelector).style.width = "100%";
    this.querySelector(this.styleTargetSelector).style.left = "";
  }

  adjustForFullscreenAndSidebar() {
    this.querySelector(this.styleTargetSelector).style.width =
      "calc(100vw - var(--jelly-party-sidebar-width))";
    this.querySelector(this.styleTargetSelector).style.left = "0";
  }

  adjustForNoFullscreenAndNoSidebar() {
    this.adjustForFullscreenAndNoSidebar();
  }

  adjustForNoFullscreenAndSidebar() {
    this.adjustForFullscreenAndSidebar();
  }
}
