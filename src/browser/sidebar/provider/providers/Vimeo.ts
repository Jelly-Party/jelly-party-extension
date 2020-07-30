import { debounce as _debounce } from "lodash-es"
import { Provider } from "../Provider"

export class Vimeo extends Provider {
  public contracted = false

  private iFrameIdentifier = "#main"

  public iFrameTarget: HTMLElement | null

  constructor() {
    super("www.vimeo.com")

    // Targets
    this.iFrameTarget = document.querySelector(this.iFrameIdentifier)

    // Listeners
    window.addEventListener("fullscreenchange", this.adjustView)
    window.addEventListener(
      "resize",
      _debounce(() => {
        console.log("Jelly-Party: Handling Vimeo resize event.")
        this.adjustView
      }, 1000).bind(this),
    )

    // Styles

    // Update view
    setTimeout(() => {
      this.adjustView
    }, 3000)
  }

  public adjustView() {
    console.log("Jelly-Party: Adjusting website Display")
    if (!this.contracted && document.fullscreenElement) {
      // Sidebar OFF & Fullscreen ON
      this.contractView()
      this.enterFullScreen()
    } else if (!this.contracted && !document.fullscreenElement) {
      // Sidebar OFF & Fullscreen OFF
      this.contractView()
      this.exitFullScreen()
    } else if (this.contracted && document.fullscreenElement) {
      // Sidebar ON & Fullscreen ON
      this.expandView()
      this.enterFullScreen()
    } else if (this.contracted && !document.fullscreenElement) {
      // Sidebar ON & Fullscreen OFF
      this.expandView()
      this.exitFullScreen()
    }
  }

  public enterFullScreen() {
    if (this.iFrameTarget) {
      this.iFrameTarget.style.width = "100%"
    } else {
      console.log(
        "Jelly-Party: Vimeo Provider -> enterFullScreen() -> No iFrameTarget found!",
      )
    }
  }

  public exitFullScreen() {
    if (this.iFrameTarget) {
      this.iFrameTarget.style.width = "100%"
    } else {
      console.log(
        "Jelly-Party: Vimeo Provider -> exitFullScreen() -> No iFrameTarget found!",
      )
    }
  }

  public contractView() {
    if (this.iFrameTarget) {
      this.contracted = true
      this.iFrameTarget.style.width =
        "calc(100vw - var(--jelly-party-sidebar-width))"
    } else {
      console.log(
        "Jelly-Party: Vimeo Provider -> contractView() -> No iFrameTarget found!",
      )
    }
  }

  public expandView() {
    if (this.iFrameTarget) {
      this.contracted = false
      this.iFrameTarget.style.width = "100%"
    } else {
      console.log(
        "Jelly-Party: Vimeo Provider -> expandView() -> No iFrameTarget found!",
      )
    }
  }
}
