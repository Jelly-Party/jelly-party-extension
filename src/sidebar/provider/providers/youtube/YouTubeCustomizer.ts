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
    if (this.containerTarget && this.videoTarget && this.controlsTarget) {
      this.containerTarget.style.width = "100%";
      this.videoTarget.style.width = "100vw";
      this.videoTarget.style.height = "100vh";
      this.videoTarget.style.top = `0px`;
      this.controlsTarget.style.width = "calc(100vw - 30px)";
    }
  }

  adjustForNoFullscreenAndSidebar() {
    setTimeout(() => {
      if (
        this.containerTarget &&
        this.videoTarget &&
        this.controlsTarget &&
        this.playerTarget
      ) {
        this.containerTarget.style.width =
          "calc(100vw - var(--jelly-party-sidebar-width))";
        const playerWidth = this.playerTarget.offsetWidth;
        const playerHeight = this.playerTarget.offsetHeight;
        this.videoTarget.style.width = `${playerWidth}px`;
        this.videoTarget.style.height = `${playerHeight}px`;
        this.controlsTarget.style.width = `${playerWidth - 30}px`;
      }
    }, 1000);
  }

  adjustForNoFullscreenAndNoSidebar() {
    if (
      this.containerTarget &&
      this.videoTarget &&
      this.controlsTarget &&
      this.playerTarget
    ) {
      this.containerTarget.style.width = "100%";
      const player: HTMLElement | null = document.querySelector("#ytd-player");
      if (!player) {
        console.log(`Jelly-Party: Missing youtube player: #ytd-player.`);
        return;
      }
      const playerWidth = player.offsetWidth;
      const playerHeight = player.offsetHeight;
      this.videoTarget.style.width = `${playerWidth}px`;
      this.videoTarget.style.height = `${playerHeight}px`;
      this.controlsTarget.style.width = `${playerWidth - 30}px`;
    }
  }

  adjustForFullscreenAndSidebar() {
    if (
      this.containerTarget &&
      this.videoTarget &&
      this.controlsTarget &&
      this.playerTarget
    ) {
      this.containerTarget.style.width =
        "calc(100vw - var(--jelly-party-sidebar-width))";
      this.videoTarget.style.width =
        "calc(100vw - var(--jelly-party-sidebar-width))";
      this.videoTarget.style.height = `100vh`;
      this.videoTarget.style.top = `0px`;
      this.controlsTarget.style.width =
        "calc(100vw - var(--jelly-party-sidebar-width) - 30px)";
    }
  }
}
