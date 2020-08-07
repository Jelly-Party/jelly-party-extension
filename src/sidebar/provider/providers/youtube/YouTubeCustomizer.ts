import { Customizer } from "../Customizer";

export class YouTubeCustomizer extends Customizer {
  public containerTargetSelector = "ytd-app";
  public containerTarget: HTMLElement | null;
  public playerSelector = "#ytd-player";
  public playerTarget: HTMLElement | null;
  public videoSelector = "video";
  public videoTarget: HTMLElement | null;
  public controlsSelector = ".ytp-chrome-bottom";
  public controlsTarget: HTMLElement | null;

  constructor() {
    super();
    this.containerTarget = document.querySelector(this.containerTargetSelector);
    this.playerTarget = document.querySelector(this.playerSelector);
    this.videoTarget = document.querySelector(this.videoSelector);
    this.controlsTarget = document.querySelector(this.controlsSelector);
    if (this.containerTarget) {
      this.containerTarget.style.overflow = "hidden";
    } else {
      console.log(
        `Jelly-Party: YouTube Provider -> Constructor -> Missing IFrame target.`,
      );
    }
  }

  adjustForFullscreenAndNoSidebar() {
    this.querySelector(this.containerTargetSelector).style.width = "100%";
    this.querySelector(this.videoSelector).style.width = `100vw`;
    this.querySelector(this.videoSelector).style.height = `100vh`;
    this.querySelector(this.videoSelector).style.top = `0px`;
    this.querySelector(this.controlsSelector).style.width =
      "calc(100vw - 30px)";
  }

  adjustForNoFullscreenAndSidebar() {
    this.querySelector(this.containerTargetSelector).style.width =
      "calc(100vw - var(--jelly-party-sidebar-width))";
    const playerWidth = this.querySelector(this.playerSelector).offsetWidth;
    const playerHeight = this.querySelector(this.playerSelector).offsetHeight;
    this.querySelector(this.videoSelector).style.width = `${playerWidth}px`;
    this.querySelector(this.videoSelector).style.height = `${playerHeight}px`;
    this.querySelector(this.controlsSelector).style.width = `${playerWidth -
      30}px`;
  }

  adjustForNoFullscreenAndNoSidebar() {
    this.querySelector(this.containerTargetSelector).style.width = "100%";
    const player: HTMLElement | null = document.querySelector("#ytd-player");
    if (!player) {
      console.log(`Jelly-Party: Missing youtube player: #ytd-player.`);
      return;
    }
    const playerWidth = player.offsetWidth;
    const playerHeight = player.offsetHeight;
    this.querySelector(this.videoSelector).style.width = `${playerWidth}px`;
    this.querySelector(this.videoSelector).style.height = `${playerHeight}px`;
    this.querySelector(this.controlsSelector).style.width = `${playerWidth -
      30}px`;
  }

  adjustForFullscreenAndSidebar() {
    this.querySelector(this.containerTargetSelector).style.width =
      "calc(100vw - var(--jelly-party-sidebar-width))";
    this.querySelector(this.videoSelector).style.width =
      "calc(100vw - var(--jelly-party-sidebar-width))";
    this.querySelector(this.videoSelector).style.height = `100vh`;
    this.querySelector(this.videoSelector).style.top = `0px`;
    this.querySelector(this.controlsSelector).style.width =
      "calc(100vw - var(--jelly-party-sidebar-width) - 30px)";
  }
}
