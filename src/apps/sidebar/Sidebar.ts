import { browser } from "webextension-polyfill-ts";
import { ProviderFactory } from "@/services/provider/ProviderFactory";
import { hostMessenger } from "@/services/messaging/HostMessenger";
import { primeHosts as potentialPrimeHosts } from "@/helpers/domains/TLDs";
import { Provider } from "@/services/provider/Provider";
import { notyf } from "@/services/notyf/notyf";
import { Fab } from "./DOMComponents/Fab";
import { Wrapper } from "./DOMComponents/Wrapper";
import { IFrame } from "./DOMComponents/IFrame";
import { CloseButton } from "./DOMComponents/CloseButton";

interface SharedState {
  sidebarVisible: boolean;
  partyIdFromURL: string;
}

export const sharedState: SharedState = {
  sidebarVisible: false,
  partyIdFromURL:
    new URLSearchParams(window.location.search).get("jellyPartyId") ?? "",
};

class Sidebar {
  public notyf: any;
  public provider: Provider;
  public fab: Fab;
  public wrapper: Wrapper;
  public iFrame: IFrame;
  public closeButton: CloseButton;

  constructor(provider: Provider) {
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
        this.fab.resetFabNotification();
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

export class JellyPartyController {
  public provider: Provider;
  public sidebar!: Sidebar;

  constructor() {
    // Instantitate provider for current page
    this.provider = new ProviderFactory(window.location.host).provider;
    this.sidebar = new Sidebar(this.provider);
    (window as any).JellyPartySidebar = this.sidebar;
    hostMessenger.attachJellyPartyControllerAndStartListening(this);
    this.insertHostStyles();
    if (potentialPrimeHosts.includes(window.location.host)) {
      this.sidebar.showNotification(
        "Please navigate to a video for the sidebar to show.",
      );
    }
  }

  async waitForHTMLElementThenInit() {
    console.log("Awaiting provider specific promise");
    await this.provider.awaitPromise;
    console.log("Done awaiting provider specific promise");
    this.sidebar.attachSidebarToDOM();
  }

  insertHostStyles = () => {
    const RootHead = document.head;
    const styleScript = document.createElement("script");
    styleScript.type = "text/javascript";
    styleScript.charset = "utf-8";
    styleScript.src = browser.runtime.getURL("js/rootStyles.js");
    RootHead.appendChild(styleScript);
  };
}
if (window.location.host === "join.jelly-party.com") {
  // Redirect to options page that has full access to browser APIs
  const joinURL = new URL(browser.runtime.getURL("join.html"));
  joinURL.search = window.location.search;
  window.location.href = joinURL.toString();
} else if (!(window as any).JellyPartyLoaded) {
  // Jelly Party hasn't been loaded previously, let's initialize it
  (window as any).JellyPartyLoaded = true;
  const jellyPartyController = new JellyPartyController();
  console.log(
    `Jelly-Party: Initializing Jelly Party! Mode is ${process.env.NODE_ENV}.`,
  );
  jellyPartyController.waitForHTMLElementThenInit();
} else {
  console.log(`Jelly-Party: Already loaded. Skipping loading.`);
}
