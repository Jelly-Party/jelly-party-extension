import { Customizer } from "../Customizer";

export class YouTubeCustomizer extends Customizer {
  public containerTargetSelector = "ytd-app";
  public containerTarget: HTMLElement | null;
  public playerSelector = "#ytd-player";
  public videoSelector = "video";
  public controlsSelector = ".ytp-chrome-bottom";
  public historySelector = ".ytp-chapter-hover-container";

  constructor() {
    super();
    this.containerTarget = document.querySelector(this.containerTargetSelector);
    if (this.containerTarget) {
      this.containerTarget.style.overflow = "hidden";
    } else {
      console.log(
        `Jelly-Party: YouTube Provider -> Constructor -> Missing IFrame target.`,
      );
    }
  }

  centerVideoHorizontallyAndVertically() {
    const playerRect = this.querySelector(
      this.playerSelector,
    ).getBoundingClientRect();
    const videoRect = this.querySelector(
      this.videoSelector,
    ).getBoundingClientRect();
    this.querySelector(this.videoSelector).style.left = `${(playerRect.width -
      videoRect.width) /
      2}px`;
    this.querySelector(this.videoSelector).style.top = `${(playerRect.height -
      videoRect.height) /
      2}px`;
  }

  adjustForFullscreenAndNoSidebar() {
    this.querySelector(this.containerTargetSelector).style.width = "100%";
    this.querySelector(this.videoSelector).style.width = `100vw`;
    this.querySelector(this.videoSelector).style.height = `100vh`;
    [this.controlsSelector, this.historySelector].forEach(selector => {
      this.querySelector(selector).style.width = "calc(100vw - 30px)";
    });
    this.centerVideoHorizontallyAndVertically();
  }

  adjustForNoFullscreenAndSidebar() {
    this.querySelector(this.containerTargetSelector).style.width =
      "calc(100vw - var(--jelly-party-sidebar-width))";
    [this.controlsSelector, this.historySelector].forEach(selector => {
      this.querySelector(selector).style.width = `${this.querySelector(
        this.playerSelector,
      ).offsetWidth - 30}px`;
    });
    this.centerVideoHorizontallyAndVertically();
  }

  adjustForNoFullscreenAndNoSidebar() {
    this.querySelector(this.containerTargetSelector).style.width = "100%";
    [this.controlsSelector, this.historySelector].forEach(selector => {
      this.querySelector(selector).style.width = `${this.querySelector(
        this.playerSelector,
      ).offsetWidth - 30}px`;
    });
    this.centerVideoHorizontallyAndVertically();
  }

  adjustForFullscreenAndSidebar() {
    this.querySelector(this.containerTargetSelector).style.width =
      "calc(100vw - var(--jelly-party-sidebar-width))";
    this.querySelector(this.videoSelector).style.width =
      "calc(100vw - var(--jelly-party-sidebar-width))";
    this.querySelector(this.videoSelector).style.height = `100vh`;
    [this.controlsSelector, this.historySelector].forEach(selector => {
      this.querySelector(selector).style.width =
        "calc(100vw - var(--jelly-party-sidebar-width) - 30px)";
    });
    this.centerVideoHorizontallyAndVertically();
  }
}
