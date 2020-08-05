import { Provider } from "./provider/Provider";
import { notyf } from "./notyf/notyf";
import { Fab } from "./Fab";
import { Wrapper } from "./DOMComponents/Wrapper";
import { IFrame } from "./DOMComponents/IFrame";
import { CloseButton } from "./DOMComponents/CloseButton";

// Export an empty object, but with a pointer that ensures that all
// imports reference the same object.
// Once we create the sidebar, we point it to this object.
export let sidebar: any = {};

interface SharedState {
  sidebarVisible: boolean;
  magicLinkUsed: boolean;
  partyIdFromURL: string;
}

export const sharedState: SharedState = {
  sidebarVisible: false,
  magicLinkUsed: false,
  partyIdFromURL: "",
};

export class Sidebar {
  public notyf: any;
  public provider: Provider;
  public fab: Fab;
  public wrapper: Wrapper;
  public iFrame: IFrame;
  public closeButton: CloseButton;

  constructor(provider: Provider) {
    sidebar = this;
    sharedState.sidebarVisible = true;
    this.provider = provider;
    this.notyf = notyf;
    this.fab = new Fab();
    this.iFrame = new IFrame();
    this.closeButton = new CloseButton();
    this.wrapper = new Wrapper(this.fab, this.iFrame, this.closeButton);
  }

  public attachSidebarToDOM() {
    // Attach the iFrame to the DOM
    if (this.provider.iFrameTarget) {
      this.provider.iFrameTarget.appendChild(this.wrapper.wrapperElement);
      this.setupSideBarToggle();
    } else {
      console.error(
        `Jelly-Party: Error attaching IFrame. provider.iFrameTarget not found.`,
      );
    }
    // Lastly, adjust the screen after initialization
    this.provider.customizer.adjustView();
  }

  public showNotification = (msg: string) => {
    this.notyf.success(msg);
  };

  private setupSideBarToggle = () => {
    this.fab.fabElement.addEventListener("click", () => {
      this.toggleSideBar();
    });
    this.closeButton.closeButtonElement.addEventListener("click", () => {
      this.toggleSideBar();
    });
  };

  // Toggle Sidebar
  public toggleSideBar = () => {
    if (!this.wrapper) {
      console.log(`Jelly-Party: Cannot find #jellyPartyWrapper.`);
    } else {
      if (sharedState.sidebarVisible) {
        // Hide sidebar
        sharedState.sidebarVisible = false;
        this.wrapper.wrapperElement.classList.add("sideBarMinimized");
        this.provider.customizer.adjustView();
        this.fab.showFab();
      } else {
        // Switch to showing sidebar
        sharedState.sidebarVisible = true;
        this.wrapper.wrapperElement.classList.remove("sideBarMinimized");
        this.provider.customizer.adjustView();
        this.fab.hideFab();
      }
    }
  };
}
