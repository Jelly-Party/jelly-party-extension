import { debounce as _debounce, throttle as _throttle } from "lodash-es";
import { Provider } from '../Provider';

export class Amazon extends Provider {
  public contracted: boolean;

  private rootIdentifier: string = "#dv-web-player"

  public iFrameTarget: HTMLElement | null;
  public rootTarget: HTMLElement | null;

  constructor() {
    super(document.querySelector(this.rootIdentifier))
    this.contracted = false;

    // Targets
    this.iFrameTarget = document.body;
    this.rootTarget = document.querySelector(this.rootIdentifier);

    // Listeners
    window.addEventListener("fullscreenchange", this.adjustView);
    window.addEventListener("resize", _debounce(() => {
      console.log("Jelly-Party: Handling Amazon resize event.");
      this.adjustView;
    }, 1000).bind(this));

    // Styles
    if (this.rootTarget) {
      this.rootTarget.style.transition = "all 0.2s ease";
    } else {
      console.log("Jelly-Party: Amazon Provider -> Constructor -> No rootTarget found!");
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
      console.log("Jelly-Party: Amazon Provider -> enterFullScreen() -> No iFrameTarget found!");
    }
  }

  public exitFullScreen() {
    if (this.iFrameTarget) {
      this.iFrameTarget.style.width = "100%";
    } else {
      console.log("Jelly-Party: Amazon Provider -> exitFullScreen() -> No iFrameTarget found!");
    }
  }

  public contractView() {
    if (this.rootTarget) {
      this.contracted = true;
      this.rootTarget.style.width = "calc(100vw - var(--jelly-party-sidebar-width))";
    } else {
      console.log("Jelly-Party: Amazon Provider -> contractView() ->  No rootTarget found!");
    }
  }

  public expandView() {
    if (this.rootTarget) {
      this.contracted = false;
      this.rootTarget.style.width = "100%";
    } else {
      console.log("Jelly-Party: Amazon Provider -> expandView() ->  No rootTarget found!");
    }
  }
}
