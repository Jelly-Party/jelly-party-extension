import { debounce as _debounce } from "lodash-es";
import { sharedState } from "@/sidebar/Sidebar";

export abstract class Customizer {
  constructor() {
    window.addEventListener("fullscreenchange", this.adjustView);
    window.addEventListener(
      "resize",
      _debounce(() => {
        console.log("Jelly-Party: Handling resize event.");
        this.adjustView;
      }, 200).bind(this),
    );
    this.initNotyfFullscreenHandler();
    // Update view shortly after initialization
    setTimeout(() => {
      this.adjustView;
    }, 3000);
  }

  adjustView() {
    if (document.fullscreen && !sharedState.sidebarVisible) {
      // Fullscreen && sidebar showing
      this.adjustForFullscreenAndSidebar();
    } else if (document.fullscreen && sharedState.sidebarVisible) {
      // Fullscreen and sidebar hidden
      this.adjustForFullscreenAndNoSidebar();
    } else if (!document.fullscreen && !sharedState.sidebarVisible) {
      // Non-fullscreen and sidebar showing
      this.adjustForNoFullscreenAndSidebar();
    } else {
      // Non-fullscreen and sidebar hidden
      this.adjustForNoFullscreenAndNoSidebar();
    }
  }

  // Unfortunately, we cannot move an IFrame within the DOM without losing its state, see
  // https://stackoverflow.com/questions/8318264/how-to-move-an-iframe-in-the-dom-without-losing-its-state
  // Therefore we cannot dynamically move the IFrame around
  initNotyfFullscreenHandler() {
    // Dynamically move around notyf, to enable notifications in fullscreen
    const fullscreenHandler = function() {
      const fullscreenElement = document.fullscreenElement;
      const notyfContainer = document.querySelector(".notyf");
      if (!notyfContainer) {
        console.log(
          `Jelly-Party: Error. Could not find notyf Container to move to fullscreen Element.`,
        );
        return;
      }
      if (!fullscreenElement) {
        document.body.appendChild(notyfContainer);
      } else {
        fullscreenElement.appendChild(notyfContainer);
      }
    };
    document.addEventListener("fullscreenchange", fullscreenHandler);
  }

  abstract adjustForFullscreenAndSidebar(): void;
  abstract adjustForFullscreenAndNoSidebar(): void;
  abstract adjustForNoFullscreenAndSidebar(): void;
  abstract adjustForNoFullscreenAndNoSidebar(): void;
}
