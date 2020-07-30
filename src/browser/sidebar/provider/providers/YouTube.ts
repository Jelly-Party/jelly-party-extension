import { debounce as _debounce } from "lodash-es";
import { Provider } from "../Provider";

export class YouTube extends Provider {
  public contracted = false;

  private iFrameIdentifier = "ytd-app";
  private playerIdentifier = "#ytd-player";
  private videoIdentifier = "video";
  private controlsIdentifier = ".ytp-chrome-bottom";

  public iFrameTarget: HTMLElement | null;
  public playerTarget: HTMLElement | null;
  public videoTarget: HTMLVideoElement | null;
  public controlsTarget: HTMLElement | null;

  constructor() {
    super("www.youtube.com");

    // Targets
    this.iFrameTarget = document.querySelector(this.iFrameIdentifier);
    this.playerTarget = document.querySelector(this.playerIdentifier);
    this.videoTarget = document.querySelector(this.videoIdentifier);
    this.controlsTarget = document.querySelector(this.controlsIdentifier);

    // Listeners
    window.addEventListener("fullscreenchange", this.adjustView);
    window.addEventListener(
      "resize",
      _debounce(() => {
        console.log("Jelly-Party: Handling YouTube resize event.");
        this.adjustView;
      }, 1000).bind(this)
    );

    // Styles
    if (this.iFrameTarget) {
      this.iFrameTarget.style.overflow = "hidden";
    } else {
      console.log(
        `Jelly-Party: YouTube Provider -> Constructor -> Missing IFrame target.`
      );
    }

    // Update view
    setTimeout(() => {
      this.adjustView;
    }, 3000);
  }

  public adjustView() {
    console.log("Jelly-Party: Adjusting website Display");
    if (!this.contracted && document.fullscreenElement) {
      // Sidebar OFF & Fullscreen ON
      this.contractView();
      this.enterFullScreen();
    } else if (!this.contracted && !document.fullscreenElement) {
      // Sidebar OFF & Fullscreen OFF
      this.contractView();
      this.exitFullScreen();
    } else if (this.contracted && document.fullscreenElement) {
      // Sidebar ON & Fullscreen ON
      this.expandView();
      this.enterFullScreen();
    } else if (this.contracted && !document.fullscreenElement) {
      // Sidebar ON & Fullscreen OFF
      this.expandView();
      this.exitFullScreen();
    }
  }

  public enterFullScreen() {
    if (this.iFrameTarget) {
      this.iFrameTarget.style.width = "100%";
    } else {
      console.log(
        "Jelly-Party: YouTube Provider -> enterFullScreen() -> No iFrameTarget found!"
      );
    }
    if (this.videoTarget) {
      this.videoTarget.style.width = "100vw";
      this.videoTarget.style.height = "100vh";
      this.videoTarget.style.top = `0px`;
    } else {
      console.log(
        "Jelly-Party: YouTube Provider -> enterFullScreen() -> No videoTarget found!"
      );
    }
    if (this.controlsTarget) {
      this.controlsTarget.style.width = "calc(100vw - 30px)";
    } else {
      console.log(
        "Jelly-Party: YouTube Provider -> enterFullScreen() -> No controlsTarget found!"
      );
    }
  }

  public exitFullScreen() {
    if (this.iFrameTarget) {
      this.iFrameTarget.style.width = "100%";
    } else {
      console.log(
        "Jelly-Party: YouTube Provider -> exitFullScreen() -> No iFrameTarget found!"
      );
    }
    if (this.videoTarget) {
      if (this.playerTarget) {
        this.videoTarget.style.width = `${this.playerTarget.offsetWidth}px`;
        this.videoTarget.style.height = `${this.playerTarget.offsetHeight}px`;
      } else {
        console.log(
          "Jelly-Party: YouTube Provider -> exitFullScreen() -> No playerTarget found!"
        );
      }
    } else {
      console.log(
        "Jelly-Party: YouTube Provider -> exitFullScreen() -> No videoTarget found!"
      );
    }
    if (this.controlsTarget) {
      if (this.playerTarget) {
        this.controlsTarget.style.width = `${this.playerTarget.offsetWidth -
          30}px`;
      } else {
        console.log(
          "Jelly-Party: YouTube Provider -> exitFullScreen() -> No playerTarget found!"
        );
      }
    } else {
      console.log(
        "Jelly-Party: YouTube Provider -> exitFullScreen() -> No controlsTarget found!"
      );
    }
  }

  public contractView() {
    if (this.iFrameTarget) {
      this.contracted = true;
      this.iFrameTarget.style.width =
        "calc(100vw - var(--jelly-party-sidebar-width))";
    } else {
      console.log(
        "Jelly-Party: YouTube Provider -> contractView() -> No iFrameTarget found!"
      );
    }
  }

  public expandView() {
    if (this.iFrameTarget) {
      this.contracted = false;
      this.iFrameTarget.style.width = "100%";
    } else {
      console.log(
        "Jelly-Party: YouTube Provider -> expandView() -> No iFrameTarget found!"
      );
    }
  }
}
