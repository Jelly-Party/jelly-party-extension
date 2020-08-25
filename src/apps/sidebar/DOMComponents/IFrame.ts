import { browser } from "webextension-polyfill-ts";

export class IFrame {
  public frameElement: HTMLIFrameElement;

  constructor() {
    this.frameElement = document.createElement("iframe");
    this.frameElement.id = "jellyPartyRoot";
    this.frameElement.frameBorder = "0";
    this.frameElement.style.zIndex = "99999";
    this.frameElement.style.height = "100vh";
    this.frameElement.style.width = "var(--jelly-party-sidebar-width)";
    this.frameElement.allow = "camera *;microphone *";
    this.frameElement.src = browser.runtime.getURL("iframe.html");
  }
}
