import { Customizer } from "../Customizer";

export class AmazonCustomizer extends Customizer {
  public styleIdentifier = "#dv-web-player";
  public pausedOverlayIdentifier = ".pausedOverlay";
  public controlsOverlayIdentifier = ".controlsOverlay";
  public videoIdentifier = "video";
  public iFrameTargetSelector = ".webPlayerSDKContainer";

  constructor() {
    super();
    // Styles
    this.querySelector(this.styleIdentifier).style.transition = "all 0.2s ease";
  }

  adjustForFullscreenAndNoSidebar() {
    [
      this.styleIdentifier,
      this.pausedOverlayIdentifier,
      this.controlsOverlayIdentifier,
      this.videoIdentifier,
    ].forEach(e => {
      this.querySelector(e).style.width = "100vw";
    });
  }

  adjustForFullscreenAndSidebar() {
    [
      this.styleIdentifier,
      this.pausedOverlayIdentifier,
      this.controlsOverlayIdentifier,
      this.videoIdentifier,
    ].forEach(e => {
      this.querySelector(e).style.width =
        "calc(100vw - var(--jelly-party-sidebar-width))";
    });
  }

  adjustForNoFullscreenAndNoSidebar() {
    this.adjustForFullscreenAndNoSidebar();
  }

  adjustForNoFullscreenAndSidebar() {
    this.adjustForFullscreenAndSidebar();
  }
}
