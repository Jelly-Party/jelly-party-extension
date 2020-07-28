import { jellyFishWithoutNotification } from "../styles/jellyPartySVG.js";

export class Fab {
  public fabElement: HTMLDivElement;

  constructor() {
    console.log("Jelly-Party: Fab constructor called");
    this.fabElement = document.createElement("div");
    this.fabElement.id = "jellyPartyFab";
    this.fabElement.innerHTML = jellyFishWithoutNotification;
    this.fabElement.style.position = "absolute";
    this.fabElement.style.bottom = "100px";
    this.fabElement.style.right = "400px";
    this.fabElement.style.zIndex = "99999";
    this.fabElement.style.visibility = "hidden";
    this.fabElement.style.opacity = "0";
    this.fabElement.style.transition = "visibility 0.2s 0s, opacity 0.2s 0s";
  }

  // Show FAB
  public showFab() {
    if (this.fabElement) {
      this.fabElement.style.opacity = "1";
      this.fabElement.style.visibility = "visible";
    } else {
      console.log(`Jelly-Party: Error. #jellyPartyFab not found.`);
    }
  }

  // Hide FAB
  public hideFab() {
    if (this.fabElement) {
      this.fabElement.style.opacity = "0";
      this.fabElement.style.visibility = "hidden";
    } else {
      console.log(`Jelly-Party: Error. #jellyPartyFab not found.`);
    }
  }
}