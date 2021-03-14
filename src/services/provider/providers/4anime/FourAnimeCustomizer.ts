import { Customizer } from "../Customizer";

export class FourAnimeCustomizer extends Customizer {
  public styleTargetSelector = "#example_video_1";
  public pageTargetSelector = "#app-mount"

  constructor() {
    super();
    console.log(
      `Jelly-Party: FourAnime Provider -> Constructor -> No customization intended for this host`,
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
    // Change the "pageContainer" width so that it's not hide with the sidebar
    this.querySelector(this.pageTargetSelector).style.width =
      "calc(100vw - var(--jelly-party-sidebar-width))";
  }
}
