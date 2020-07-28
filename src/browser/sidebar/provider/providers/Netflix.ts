
import { debounce as _debounce, throttle as _throttle } from "lodash-es";
import { Provider } from '../Provider';

export class Netflix extends Provider {
  public contracted: boolean = false;

  private iFrameIdentifier: string = ".sizing-wrapper";
  public iFrameTarget: HTMLElement | null;

  constructor() {
    super("www.netflix.com");

    // Targets
    this.iFrameTarget = document.querySelector(this.iFrameIdentifier);

    // Listeners
    window.addEventListener("fullscreenchange", this.adjustView);
    window.addEventListener("resize", _debounce(() => {
      console.log("Jelly-Party: Handling Netflix resize event.");
      this.adjustView;
    }, 1000).bind(this));

    // Styles

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
      console.log("Jelly-Party: Netflix Provider -> enterFullScreen() -> No iFrameTarget found!");
    }
  }

  public exitFullScreen() {
    if (this.iFrameTarget) {
      this.iFrameTarget.style.width = "100%";
    } else {
      console.log("Jelly-Party: Netflix Provider -> exitFullScreen() -> No iFrameTarget found!");
    }
  }

  public contractView() {
    if (this.iFrameTarget) {
      this.contracted = true;
      this.iFrameTarget.style.width =
            "calc(100vw - var(--jelly-party-sidebar-width))";
    } else {
      console.log("Jelly-Party: Netflix Provider -> contractView() -> No iFrameTarget found!");
    }
  }

  public expandView() {
    if (this.iFrameTarget) {
      this.contracted = false;
      this.iFrameTarget.style.width = "100%";
    } else {
      console.log("Jelly-Party: Netflix Provider -> expandView() -> No iFrameTarget found!");
    }
  }
}