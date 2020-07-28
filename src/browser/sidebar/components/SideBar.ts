import { browser } from "webextension-polyfill-ts";
import { primeHosts as potentialPrimeHosts } from "@/helpers/TLDs";
import { Fab } from "./Fab";
import { Wrapper } from "./Wrapper";
import { RootIFrame } from "./RootIFrame";
import { Provider } from '../provider/Provider';
import { ProviderHandler } from '../provider/ProviderHandler';
import { Netflix } from '../provider/providers/Netflix';
import { YouTube } from '../provider/providers/YouTube';
import { DisneyPlus } from '../provider/providers/DisneyPlus';
import { Amazon } from '../provider/providers/Amazon';
import { Vimeo } from '../provider/providers/Vimeo';
import { Default } from '../provider/providers/Default';

export class Sidebar {
  private host: string;
  private fab: Fab;
  private wrapper: Wrapper;
  private rootIframe: RootIFrame;
  private provider: Provider;
  private sideBarVisible: boolean;

  constructor(host: string) {
    console.log("Jelly-Party: Sidebar constructor called");

    this.fab = new Fab();
    this.rootIframe = new RootIFrame();
    this.wrapper = new Wrapper(this.rootIframe, this.fab);

    // Set host
    this.host = host;

    // Normalize all amazon country TLDs to www.amazon.com
    if (potentialPrimeHosts.includes(this.host)) {
      this.host = "www.amazon.com";
    }

    // Configure provider
    switch (host) {
      case "www.netflix.com":
        this.provider = new Netflix();
        break;
      case "www.youtube.com": {
        this.provider = new YouTube();
        break;
      }
      case "www.disneyplus.com": {
        this.provider = new DisneyPlus();
        break;
      }
      case "www.amazon.com": {
        this.provider = new Amazon();
        break;
      }
      case "vimeo.com": {
        this.provider = new Vimeo();
        break;
      }
      default:
        this.provider = new Default();
    }

    this.provider = new ProviderHandler(host).provider;

    this.sideBarVisible = true;

    if (this.provider.iFrameTarget) {
      this.provider.iFrameTarget.appendChild(this.wrapper.wrapperElement);
      this.initFullscreenHandler();
      this.insertStyles();
      this.setupSideBarToggle();
    } else {
      console.error(
        `Jelly-Party: Error attaching IFrame. provider iFrameTarget not found.`
      );
    }

  }
  private setupSideBarToggle() {
    console.log("Jelly-Party: Sidebar setupSideBarToggle called");
    this.fab.fabElement.addEventListener("click", () => {
      console.log("Jelly-Party: Fab clicked");
      this.toggleSideBar();
    });
  }

  public showSidebar() {
    this.sideBarVisible = true;
  }

  public hideSidebar() {
    this.sideBarVisible = false;
  }



  // Toggle Sidebar
  private toggleSideBar() {
    console.log("Jelly-Party: Sidebar toggleSideBar called");
    if (!this.wrapper) {
      console.log(`Jelly-Party: Cannot find #jellyPartyWrapper.`);
    } else {
      if (this.sideBarVisible) {
        // Switch to hiding sidebar
        this.sideBarVisible = false;
        // this.fixWebsiteDisplay();
        this.provider.adjustView();
        // Remove notification
        // const fab = document.querySelector("#jellyPartyFab");
        // if (fab) {
        //   // fab.innerHTML = jellyFishWithoutNotification;
        // }
        this.wrapper.wrapperElement.classList.add("sideBarMinimized");
        this.fab.showFab();
      } else {
        // Switch to showing sidebar
        this.sideBarVisible = true;
        // this.fixWebsiteDisplay();
        this.provider.adjustView();
        this.wrapper.wrapperElement.classList.remove("sideBarMinimized");
        this.fab.hideFab();
      }
    }
  }

  insertStyles() {
    const RootHead = document.head;
    const styleScript = document.createElement("script");
    styleScript.type = "text/javascript";
    styleScript.charset = "utf-8";
    styleScript.src = browser.runtime.getURL("js/RootStyles.js");
    RootHead.appendChild(styleScript);
  }

  initFullscreenHandler() {
    const fullscreenHandler = function() {
      const fullscreenElement = document.fullscreenElement;
      if (!fullscreenElement) {
        console.log(
          `Jelly-Party: Error. fullscreenHandler called, but not fullscreenElement present.`
        );
      } else {
        const notyfContainer = document.querySelector(".notyf");
        if (notyfContainer) {
          fullscreenElement.appendChild(notyfContainer);
        } else {
          console.log(
            `Jelly-Party: Error. Could not find notyf Container to move to fullscreen Element.`
          );
        }
        // Unfortunately, we cannot move an IFrame within the DOM without losing its state, see
        // https://stackoverflow.com/questions/8318264/how-to-move-an-iframe-in-the-dom-without-losing-its-state
        // Therefore we cannot dynamically move the IFrame around — otherwise we could do
        // fullscreenElement.appendChild(document.querySelector("#jellyPartyRoot"));
        document.removeEventListener("fullscreenchange", fullscreenHandler);
      }
    };
    document.addEventListener("fullscreenchange", fullscreenHandler);
  }
}