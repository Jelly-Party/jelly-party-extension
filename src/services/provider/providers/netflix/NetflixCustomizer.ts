import { Customizer } from "../Customizer";

export class NetflixCustomizer extends Customizer {
  public styleTargetSelector = ".watch-video--player-view";
  public styleTarget: HTMLElement | null;

  constructor() {
    super();
    this.styleTarget = document.querySelector(this.styleTargetSelector);
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
