import { Fab } from "./Fab";
import { IFrame } from "./IFrame";
import { CloseButton } from "./CloseButton";
import { hostState } from "../hostState";
import { querySelector } from "@/helpers/querySelectors";

export class Wrapper {
  public wrapperElement!: HTMLDivElement;
  public fab: Fab;
  public iframe: IFrame;
  public closeButton: CloseButton;
  public iFrameTarget: HTMLElement;

  constructor(public iFrameTargetSelector: string) {
    this.iFrameTarget = querySelector(this.iFrameTargetSelector);
    this.wrapperElement = document.createElement("div");
    this.wrapperElement.id = "jellyPartyWrapper";
    this.wrapperElement.style.position = "fixed";
    this.wrapperElement.style.top = "0";
    this.wrapperElement.style.right = "0";
    this.wrapperElement.style.bottom = "0";
    this.wrapperElement.style.margin = "0px";
    this.wrapperElement.style.height = "100vh";
    this.wrapperElement.style.width = "var(--jelly-party-sidebar-width)";
    this.wrapperElement.style.transition = "all 0.2s ease";
    this.wrapperElement.style.zIndex = "999999";
    this.fab = new Fab();
    this.iframe = new IFrame();
    this.closeButton = new CloseButton();
    this.wrapperElement.appendChild(this.fab.fabElement);
    this.wrapperElement.appendChild(this.iframe.frameElement);
    this.wrapperElement.appendChild(this.closeButton.closeButtonElement);
    this.setupSideBarToggle();
  }
  private setupSideBarToggle = () => {
    this.iFrameTarget.appendChild(this.wrapperElement);
    this.fab.fabElement.addEventListener("click", () => {
      this.toggleSideBar();
    });
    this.closeButton.closeButtonElement.addEventListener("click", () => {
      this.toggleSideBar();
    });
  };

  // Toggle Sidebar
  public toggleSideBar = () => {
    if (hostState.sidebarVisible) {
      // Hide sidebar
      hostState.sidebarVisible = false;
      this.wrapperElement.classList.add("sideBarMinimized");
      // this.provider.customizer.adjustView();
      this.fab.showFab();
      this.fab.resetFabNotification();
    } else {
      // Switch to showing sidebar
      hostState.sidebarVisible = true;
      this.wrapperElement.classList.remove("sideBarMinimized");
      // this.provider.customizer.adjustView();
      this.fab.hideFab();
    }
  };
}
