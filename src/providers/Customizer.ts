import { debounce as _debounce } from "lodash-es";
import { hostState } from "@/apps/host/hostState";

export abstract class Customizer {
  constructor() {
    const debouncedAdjustView = _debounce(() => {
      this.adjustView();
    }).bind(this);
    // Add event listeners for fullscreenchange and resize
    window.addEventListener("fullscreenchange", debouncedAdjustView);
    window.addEventListener("resize", debouncedAdjustView);
    this.initNotyfFullscreenHandler();
    this.adjustForNoFullscreenAndSidebar();
  }

  adjustView = () => {
    if (document.fullscreenElement && hostState.sidebarVisible) {
      // Fullscreen && sidebar showing
      console.log("Jelly-Party: Adjusting for fullscreen && sidebar showing");
      this.adjustForFullscreenAndSidebar();
    } else if (document.fullscreenElement && !hostState.sidebarVisible) {
      // Fullscreen and sidebar hidden
      console.log("Jelly-Party: Adjusting for fullscreen && sidebar hidden");
      this.adjustForFullscreenAndNoSidebar();
    } else if (!document.fullscreenElement && hostState.sidebarVisible) {
      // Non-fullscreen and sidebar showing
      console.log(
        "Jelly-Party: Adjusting for no fullscreen && sidebar showing",
      );
      this.adjustForNoFullscreenAndSidebar();
    } else {
      // Non-fullscreen and sidebar hidden
      console.log("Jelly-Party: Adjusting for no fullscreen && sidebar hidden");
      this.adjustForNoFullscreenAndNoSidebar();
    }
  };

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
