import { closeButton } from "@/sidebar/DOMComponents/jellyPartyFab.js";

export class CloseButton {
  public closeButtonElement!: HTMLDivElement;

  constructor() {
    this.closeButtonElement = document.createElement("div");
    this.closeButtonElement.id = "closeButtonElement";
    this.closeButtonElement.innerHTML = closeButton;
    this.closeButtonElement.style.color = "#FFF";
    this.closeButtonElement.style.position = "absolute";
    this.closeButtonElement.style.right = "16px";
    this.closeButtonElement.style.top = "10px";
    this.closeButtonElement.style.height = "20px";
    this.closeButtonElement.style.width = "20px";
    this.closeButtonElement.style.maxHeight = "20px";
    this.closeButtonElement.style.maxWidth = "20px";
    this.closeButtonElement.style.minHeight = "20px";
    this.closeButtonElement.style.minWidth = "20px";
    this.closeButtonElement.style.zIndex = "99999";
    this.closeButtonElement.style.cursor = "pointer";
  }
}
