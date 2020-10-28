import {
  jellyFishWithoutNotification,
  jellyFishWithNotification,
} from "@/helpers/svgs.ts";
import { hostState } from "../hostState";

export class Fab {
  public fabElement: HTMLDivElement;
  private fabTimer!: number;
  public showingNotification: boolean;

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
    this.showingNotification = false;
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
    if (!hostState.sidebarVisible) {
      clearTimeout(this.fabTimer);
      this.showFab();
      this.fabTimer = setTimeout(() => {
        this.hideFab();
      }, 500);
    }
  };

  public resetFabNotification() {
    if (this.fabElement && this.showingNotification) {
      this.fabElement.innerHTML = jellyFishWithoutNotification;
    }
  }

  public showUnreadNotificationIfMinimized = () => {
    if (this.fabElement && !hostState.sidebarVisible) {
      this.fabElement.innerHTML = jellyFishWithNotification;
      this.showingNotification = true;
      this.showFab();
    }
  };
}
