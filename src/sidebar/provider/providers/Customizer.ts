import { debounce as _debounce } from "lodash-es";
import { sharedState } from "@/sidebar/Sidebar";
import {
  deepQuerySelectorAll,
  querySelector,
  getReferenceToLargestVideo,
} from "@/helpers/querySelectors";

export abstract class Customizer {
  public observer: MutationObserver;
  constructor() {
    // Set a mutation observer to the video
    const mutationObserverInit = {
      attributes: true,
    };
    const debouncedAdjustView = _debounce(() => {
      this.observer.disconnect();
      this.adjustView();
      this.observer.observe(getReferenceToLargestVideo(), mutationObserverInit);
    }).bind(this);
    this.observer = new MutationObserver((mutationsList, observer) => {
      console.log(
        "Jelly-Party: Observed a video style change. Recomputing styles.",
      );
      debouncedAdjustView();
    });
    const maybeStartObservation = () => {
      try {
        this.observer.observe(
          getReferenceToLargestVideo(),
          mutationObserverInit,
        );
      } catch {
        console.log(
          "Jelly-Party: Cannot initialize observer. Will try again in 500ms.",
        );
        setTimeout(maybeStartObservation, 500);
      }
    };
    maybeStartObservation();
    // Add event listeners for fullscreenchange and resize
    window.addEventListener("fullscreenchange", debouncedAdjustView);
    window.addEventListener("resize", debouncedAdjustView);
    this.initNotyfFullscreenHandler();
    this.adjustForNoFullscreenAndSidebar();
  }

  deepQuerySelectorAll = deepQuerySelectorAll;

  querySelector = querySelector;

  adjustView = () => {
    if (document.fullscreen && sharedState.sidebarVisible) {
      // Fullscreen && sidebar showing
      console.log("Jelly-Party: Adjusting for fullscreen && sidebar showing");
      this.adjustForFullscreenAndSidebar();
    } else if (document.fullscreen && !sharedState.sidebarVisible) {
      // Fullscreen and sidebar hidden
      console.log("Jelly-Party: Adjusting for fullscreen && sidebar hideen");
      this.adjustForFullscreenAndNoSidebar();
    } else if (!document.fullscreen && sharedState.sidebarVisible) {
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
