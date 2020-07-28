import { debounce as _debounce, throttle as _throttle } from "lodash-es";
import { Provider } from '../Provider';

export class Default extends Provider {
  public contracted: boolean = false;

  private iFrameIdentifier: string = "iFrame";

  public iFrameTarget: HTMLElement | null;

  constructor() {
    super("www.domain.com");

    this.iFrameTarget = document.body;
    console.log(`Jelly-Party: Default Provider -> Constructor -> No customization intended for this host`);

    // Listeners
    window.addEventListener("fullscreenchange", this.adjustView);
    window.addEventListener("resize", _debounce(() => {
      console.log("Jelly-Party: Handling Default resize event.");
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
      console.log("Jelly-Party: Default Provider -> enterFullScreen() -> No iFrameTarget found!");
    }
  }

  public exitFullScreen() {
    if (this.iFrameTarget) {
      this.iFrameTarget.style.width = "100%";
    } else {
      console.log("Jelly-Party: Default Provider -> exitFullScreen() -> No iFrameTarget found!");
    }
  }

  public contractView() {
    if (this.iFrameTarget) {
      this.contracted = true;
      this.iFrameTarget.style.width =
            "calc(100vw - var(--jelly-party-sidebar-width))";
    } else {
      console.log("Jelly-Party: Default Provider -> contractView() -> No iFrameTarget found!");
    }
  }

  public expandView() {
    if (this.iFrameTarget) {
      this.contracted = false;
      this.iFrameTarget.style.width = "100%";
    } else {
      console.log("Jelly-Party: Default Provider -> expandView() -> No iFrameTarget found!");
    }
  }
}