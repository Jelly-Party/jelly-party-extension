import {
  jellyFishWithoutNotification,
  jellyFishWithNotification,
} from "@/sidebar/DOMComponents/jellyPartyFab";
import { sharedState } from "../Sidebar";

export class Fab {
  public fabElement: HTMLDivElement;
  private fabTimer!: NodeJS.Timeout;

  constructor() {
    this.fabElement = document.createElement("div");
    this.fabElement.id = "jellyPartyFab";
    this.fabElement.innerHTML = jellyFishWithoutNotification;
    this.fabElement.style.position = "absolute";
    this.fabElement.style.bottom = "20vh";
    this.fabElement.style.right = "400px";
    this.fabElement.style.zIndex = "99999";
    this.fabElement.style.visibility = "hidden";
    this.fabElement.style.opacity = "0";
    this.fabElement.style.transition = "visibility 0.2s 0s, opacity 0.2s 0s";
    document.addEventListener("mousemove", this.onMouseMove);
  }

  // Show Fab
  public showFab() {
    if (this.fabElement) {
      this.fabElement.style.opacity = "1";
      this.fabElement.style.visibility = "visible";
    } else {
      console.log(`Jelly-Party: Error. #jellyPartyFab not found.`);
    }
  }

  // Hide Fab
  public hideFab() {
    if (this.fabElement) {
      this.fabElement.style.opacity = "0";
      this.fabElement.style.visibility = "hidden";
    } else {
      console.log(`Jelly-Party: Error. #jellyPartyFab not found.`);
    }
  }

  // Autohide
  private onMouseMove = (event: MouseEvent) => {
    if (!sharedState.sidebarVisible) {
      clearTimeout(this.fabTimer);
      this.showFab();
      this.fabTimer = setTimeout(() => {
        this.hideFab();
      }, 500);
    }
  };

  public showUnreadNotificationIfMinimized = () => {
    if (this.fabElement && !sharedState.sidebarVisible) {
      this.fabElement.innerHTML = jellyFishWithNotification;
      this.showFab();
    }
  };
}
