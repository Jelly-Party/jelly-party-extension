import { browser } from "webextension-polyfill-ts";
import { Sidebar } from "./Sidebar";
import { ProviderFactory } from "./provider/ProviderFactory";
import { Provider } from "./provider/Provider";
import { hostMessenger } from "@/messaging/HostMessenger";

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
  }

  waitForHTMLElementThenInit() {
    if (document.querySelector(this.provider.awaitCSSSelector) === null) {
      console.log(`Jelly-Party: Waiting for ${this.provider.awaitCSSSelector}`);
      setTimeout(() => {
        // Check again in 1 second if we can find the required DOM element
        this.waitForHTMLElementThenInit();
      }, 1000);
    } else {
      // Wait for 1 second, then attach sidebar
      setTimeout(() => {
        this.sidebar.attachSidebarToDOM();
      }, 1000);
    }
  }

  insertHostStyles = () => {
    const RootHead = document.head;
    const styleScript = document.createElement("script");
    styleScript.type = "text/javascript";
    styleScript.charset = "utf-8";
    styleScript.src = browser.runtime.getURL("js/RootStyles.js");
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
