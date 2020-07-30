import { debounce as _debounce } from "lodash-es";
import {
  jellyFishWithNotification,
  jellyFishWithoutNotification,
  closeButton,
} from "./jellyPartyFab.js";
import { browser } from "webextension-polyfill-ts";
import { MainFrameMessenger } from "@/browser/Messenger";
import VideoHandler from "@/browser/videoHandler";
import Notyf from "./libs/js/notyf.min.js";
import "./libs/css/notyf.min.css";
import { JoinPartyCommandFrame } from "@/browser/Messenger";
import { sleep } from "@/helpers/sleep";
import { primeHosts as potentialPrimeHosts } from "@/helpers/TLDs";

export class MainFrame {
  host: string;

  sideBarVisible: boolean;
  fabVisible: boolean;

  private fabTimer: number | undefined;
  closeButton!: HTMLDivElement;
  jellyPartyFab!: HTMLElement;
  jellyPartyWrapper!: HTMLDivElement;
  jellyPartyRoot!: HTMLIFrameElement;

  IFrameTarget!: HTMLElement | null;
  IFrameIdentifier!: string;

  mainFrameMessenger: MainFrameMessenger;

  videoHandler: VideoHandler;

  notyf: any;
  magicLinkUsed: boolean;
  partyIdFromURL: string | null;

  getVideo!: () => HTMLVideoElement | null;
  getControls!: () => HTMLElement | null;
  fixWebsiteDisplay!: () => void;
  showNotification: (arg0: string) => void;

  constructor(host: string) {
    (window as any).jellyPartyLoaded = true;
    this.host = host;
    this.sideBarVisible = true;
    this.fabVisible = true;
    this.notyf = new (Notyf())({
      duration: 3000,
      position: { x: "center", y: "top" },
      types: [
        {
          type: "success",
          background:
            "linear-gradient(to bottom right, #ff9494 0%, #ee64f6 100%)",
          icon: {
            className: "jelly-party-icon",
          },
        },
      ],
    });
    this.magicLinkUsed = false;
    this.partyIdFromURL = new URLSearchParams(window.location.search).get(
      "jellyPartyId",
    );
    this.showNotification = (msg: string) => this.notyf.success(msg);
    this.mainFrameMessenger = new MainFrameMessenger(
      this.showNotification,
      this,
    );
    this.videoHandler = new VideoHandler(
      window.location.host,
      this.mainFrameMessenger,
    );
    this.mainFrameMessenger.videoHandler = this.videoHandler;
    this.customizeStyling(host);
  }

  private createCloseButton() {
    console.log("Jelly-Party: Creating CloseFab Button");
    this.closeButton = document.createElement("div");
    this.closeButton.id = "closeButton";
    this.closeButton.innerHTML = closeButton;
    this.closeButton.style.color = "#FFF";
    this.closeButton.style.position = "absolute";
    this.closeButton.style.right = "16px";
    this.closeButton.style.top = "10px";
    this.closeButton.style.height = "20px";
    this.closeButton.style.width = "20px";
    this.closeButton.style.maxHeight = "20px";
    this.closeButton.style.maxWidth = "20px";
    this.closeButton.style.minHeight = "20px";
    this.closeButton.style.minWidth = "20px";
    this.closeButton.style.zIndex = "99999";
  }

  private createFab() {
    console.log("Jelly-Party: Fab createFab called");
    this.jellyPartyFab = document.createElement("div");
    this.jellyPartyFab.id = "jellyPartyFab";
    this.jellyPartyFab.innerHTML = jellyFishWithoutNotification;
    this.jellyPartyFab.style.position = "absolute";
    this.jellyPartyFab.style.bottom = "100px";
    this.jellyPartyFab.style.right = "400px";
    this.jellyPartyFab.style.zIndex = "99999";
    this.jellyPartyFab.style.visibility = "hidden";
    this.jellyPartyFab.style.opacity = "0";
  }

  private createWrapper() {
    console.log("Jelly-Party: Sidebar createWrapper called");
    this.jellyPartyWrapper = document.createElement("div");
    this.jellyPartyWrapper.id = "jellyPartyWrapper";
    this.jellyPartyWrapper.style.position = "fixed";
    this.jellyPartyWrapper.style.top = "0";
    this.jellyPartyWrapper.style.right = "0";
    this.jellyPartyWrapper.style.bottom = "0";
    this.jellyPartyWrapper.style.margin = "0px";
    this.jellyPartyWrapper.style.height = "100vh";
    this.jellyPartyWrapper.style.width = "var(--jelly-party-sidebar-width)";
    this.jellyPartyWrapper.style.transition = "all 0.2s ease";
    this.jellyPartyWrapper.style.zIndex = "999999";
  }

  private createRootIframe() {
    console.log("Jelly-Party: Sidebar createRootIframe called");
    this.jellyPartyRoot = document.createElement("iframe");
    this.jellyPartyRoot.id = "jellyPartyRoot";
    this.jellyPartyRoot.frameBorder = "0";
    this.jellyPartyRoot.style.zIndex = "99999";
    this.jellyPartyRoot.style.height = "100vh";
    this.jellyPartyRoot.style.width = "var(--jelly-party-sidebar-width)";
    this.jellyPartyRoot.src = browser.runtime.getURL("iframe.html");
  }

  insertSideBar() {
    this.createCloseButton();
    this.createFab();
    this.createWrapper();
    this.createRootIframe();
    this.jellyPartyWrapper.appendChild(this.jellyPartyRoot);
    if (this.IFrameTarget) {
      this.IFrameTarget.appendChild(this.jellyPartyWrapper);
      this.initFullscreenHandler();
      this.insertStyles();
      this.setupSideBarToggle();
    } else {
      console.error(
        `Jelly-Party: Error attaching IFrame. this.IFrameTarget not found.`,
      );
    }
  }

  setupSideBarToggle() {
    this.jellyPartyWrapper.appendChild(this.jellyPartyFab);
    this.jellyPartyFab.addEventListener("click", () => {
      console.log("Jelly-Party: Fab clicked");
      this.toggleSideBar();
    });
    this.jellyPartyWrapper.appendChild(this.closeButton);
    this.closeButton.addEventListener("click", () => {
      console.log("Jelly-Party: close button clicked");
      this.toggleSideBar();
    });
    this.fixWebsiteDisplay();
    document.addEventListener("mousemove", this.onMouseMove);
  }

  showSideBar() {
    if (!this.jellyPartyWrapper) {
      console.log(`Jelly-Party: Cannot find #jellyPartyWrapper.`);
    } else {
      // Show SideBar
      this.sideBarVisible = true;
      this.fixWebsiteDisplay();
      // Remove notification
      this.jellyPartyFab.innerHTML = jellyFishWithoutNotification;
      this.jellyPartyWrapper.classList.remove("sideBarMinimized");
      // Hide Fab
      this.hideFab();
    }
  }

  hideSideBar() {
    if (!this.jellyPartyWrapper) {
      console.log(`Jelly-Party: Cannot find #jellyPartyWrapper.`);
    } else {
      // Hide SideBar
      this.sideBarVisible = false;
      this.fixWebsiteDisplay();
      this.jellyPartyWrapper.classList.add("sideBarMinimized");
      // Show Fab
      this.showFab();
    }
  }

  toggleSideBar() {
    if (!this.jellyPartyWrapper) {
      console.log(`Jelly-Party: Cannot find #jellyPartyWrapper.`);
    } else {
      if (this.sideBarVisible) {
        this.hideSideBar();
      } else {
        this.showSideBar();
      }
    }
  }

  showFab() {
    if (!this.jellyPartyFab) {
      console.log(`Jelly-Party: Error. #jellyPartyFab not found.`);
    } else {
      this.fabVisible = true;
      this.jellyPartyFab.style.opacity = "1";
      this.jellyPartyFab.style.visibility = "visible";
      this.jellyPartyFab.style.transition =
        "visibility 0.2s 0s, opacity 0.2s 0s";
    }
  }

  hideFab() {
    if (!this.jellyPartyFab) {
      console.log(`Jelly-Party: Error. #jellyPartyFab not found.`);
    } else {
      this.fabVisible = false;
      this.jellyPartyFab.style.opacity = "0";
      this.jellyPartyFab.style.visibility = "hidden";
      this.jellyPartyFab.style.transition =
        "visibility 0.2s 0s, opacity 0.2s 0s";
    }
  }

  private onMouseMove = (event: MouseEvent) => {
    if (!this.sideBarVisible) {
      clearTimeout(this.fabTimer);
      this.showFab();
      this.fabTimer = setTimeout(() => {
        this.hideFab();
      }, 500);
    }
  };

  initNetflix() {
    this.IFrameIdentifier = ".sizing-wrapper";
    this.IFrameTarget = document.querySelector(this.IFrameIdentifier);
  }

  initYouTube() {
    this.IFrameIdentifier = "ytd-app";
    this.IFrameTarget = document.querySelector(this.IFrameIdentifier);
    if (!this.IFrameTarget) {
      console.log(`Jelly-Party: Missing IFrame target.`);
    } else {
      this.IFrameTarget.style.overflow = "hidden";
      this.getVideo = () => {
        return document.querySelector("video");
      };
      this.getControls = () => {
        return document.querySelector(".ytp-chrome-bottom");
      };
      this.fixWebsiteDisplay = function() {
        console.log("Jelly-Party: Fixing website Display");
        const video = this.getVideo();
        const controls = this.getControls();
        if (!(video && controls && this.IFrameTarget)) {
          console.log(
            `Jelly-Party: Missing video: ${Boolean(
              video,
            )}. Missing controls: ${Boolean(controls)}.
            Missing video: ${Boolean(this.IFrameTarget)}.`,
          );
          return;
        }
        if (!this.sideBarVisible && document.fullscreenElement) {
          // Sidebar is hidden & we're in fullscreen mode
          this.IFrameTarget.style.width = "100%";
          video.style.width = "100vw";
          video.style.height = "100vh";
          video.style.top = `0px`;
          controls.style.width = "calc(100vw - 30px)";
        } else if (!this.sideBarVisible && !document.fullscreenElement) {
          // Sidebar is hidden & we're NOT in fullscreen
          this.IFrameTarget.style.width = "100%";
          const player: HTMLElement | null = document.querySelector(
            "#ytd-player",
          );
          if (!player) {
            console.log(`Jelly-Party: Missing youtube player: #ytd-player.`);
            return;
          }
          const playerWidth = player.offsetWidth;
          const playerHeight = player.offsetHeight;
          video.style.width = `${playerWidth}px`;
          video.style.height = `${playerHeight}px`;
          controls.style.width = `${playerWidth - 30}px`;
        } else if (this.sideBarVisible && document.fullscreenElement) {
          // Sidebar is showing & we're in fullscreen mode
          this.IFrameTarget.style.width =
            "calc(100vw - var(--jelly-party-sidebar-width))";
          video.style.width = "calc(100vw - var(--jelly-party-sidebar-width))";
          video.style.height = `100vh`;
          video.style.top = `0px`;
          controls.style.width =
            "calc(100vw - var(--jelly-party-sidebar-width) - 30px)";
        } else if (this.sideBarVisible && !document.fullscreenElement) {
          // Sidebar is showing & we're NOT in fullscreen mode
          this.IFrameTarget.style.width =
            "calc(100vw - var(--jelly-party-sidebar-width))";
          const player: HTMLElement | null = document.querySelector(
            "#ytd-player",
          );
          if (!player) {
            console.log(`Jelly-Party: Missing youtube player: #ytd-player.`);
            return;
          }
          const playerWidth = player.offsetWidth;
          const playerHeight = player.offsetHeight;
          video.style.width = `${playerWidth}px`;
          video.style.height = `${playerHeight}px`;
          controls.style.width = `${playerWidth - 30}px`;
        }
      };
      window.addEventListener("fullscreenchange", () => {
        console.log("Jelly-Party: Handling Youtube Fullscreen-change.");
        this.fixWebsiteDisplay();
      });
      window.addEventListener(
        "resize",
        _debounce(() => {
          console.log("Jelly-Party: Handling Youtube resize event.");
          this.fixWebsiteDisplay();
        }, 1000).bind(this),
      );
      setTimeout(() => {
        this.fixWebsiteDisplay();
      }, 3000);
    }
  }

  initDisneyPlus() {
    this.IFrameIdentifier = "#app_body_content";
    this.IFrameTarget = document.querySelector(this.IFrameIdentifier);
    this.fixWebsiteDisplay = () => {
      const hudsonWrapper: HTMLElement | null = document.querySelector(
        "#hudson-wrapper",
      );
      if (hudsonWrapper) {
        if (!this.sideBarVisible) {
          hudsonWrapper.style.left = "";
          hudsonWrapper.style.width = "100%";
        } else {
          hudsonWrapper.style.left = "0px";
          hudsonWrapper.style.width =
            "calc(100vw - var(--jelly-party-sidebar-width))";
        }
      }
    };
  }

  initAmazon() {
    this.IFrameTarget = document.body;
    const amazonRoot: HTMLElement | null = document.querySelector(
      "#dv-web-player",
    );
    if (amazonRoot) {
      amazonRoot.style.transition = "all 0.2s ease";
    }
    this.fixWebsiteDisplay = () => {
      const amazonRoot: HTMLElement | null = document.querySelector(
        "#dv-web-player",
      );
      if (amazonRoot) {
        if (!this.sideBarVisible) {
          amazonRoot.style.width = "100%";
        } else {
          amazonRoot.style.width =
            "calc(100vw - var(--jelly-party-sidebar-width))";
        }
      }
    };
  }

  initVimeo() {
    this.IFrameIdentifier = "#main";
    this.IFrameTarget = document.querySelector(this.IFrameIdentifier);
  }

  initDefault(host: string) {
    console.log(`Jelly-Party: No customization intended for ${host}`);
    this.IFrameTarget = document.body;
  }

  customizeStyling(this: MainFrame, host: string) {
    if (potentialPrimeHosts.includes(host)) {
      // Normalize all amazon country TLDs to www.amazon.com
      host = "www.amazon.com";
    }
    switch (host) {
      case "www.netflix.com":
        this.initNetflix();
        break;
      case "www.youtube.com": {
        this.initYouTube();
        break;
      }
      case "www.disneyplus.com": {
        this.initDisneyPlus();
        break;
      }
      case "www.amazon.com": {
        this.initAmazon();
        break;
      }
      case "vimeo.com": {
        this.initVimeo();
        break;
      }
      default:
        this.initDefault(host);
    }
    (async () => {
      while (!this.IFrameTarget) {
        console.log(`Jelly-Party: Uh-oh. No IFrameTarget found.. Retrying..`);
        this.IFrameTarget = document.querySelector(this.IFrameIdentifier);
        await sleep(250);
      }
      this.IFrameTarget.style.transition = "all 0.2s ease";
      if (!this.fixWebsiteDisplay) {
        this.fixWebsiteDisplay = function() {
          // Define generic fixWebsiteDisplay handler
          if (!this.sideBarVisible && this.IFrameTarget) {
            this.IFrameTarget.style.width = "100%";
          } else if (this.IFrameTarget) {
            this.IFrameTarget.style.width =
              "calc(100vw - var(--jelly-party-sidebar-width))";
          } else {
            console.error("Jelly-Party: Missing IFrameTarget.");
          }
        };
      }
      this.insertSideBar();
    })();
  }

  autojoin() {
    if (this.partyIdFromURL && !this.magicLinkUsed) {
      console.log("Jelly-Party: Joining party once via magic link.");
      this.magicLinkUsed = true;
      const msg: JoinPartyCommandFrame = {
        type: "joinPartyCommand",
        payload: {
          partyId: this.partyIdFromURL,
        },
        context: "JellyParty",
      };
      this.mainFrameMessenger.sendData(msg);
    }
  }

  getBaseLink() {
    const baseLink: URL = new URL(window.location.href);
    baseLink.searchParams.delete("jellyPartyId");
    return baseLink.toString();
  }

  showChatNotificationIfMinimized = () => {
    const fab = document.querySelector("#jellyPartyFab");
    if (fab && !this.sideBarVisible) {
      fab.innerHTML = jellyFishWithNotification;
      this.showFab();
    }
  };

  observeElement(elementToObserve: HTMLElement | null) {
    if (!elementToObserve) {
      console.error(`Jelly-Party: Cannot observe ${elementToObserve}`);
    } else {
      const observer = new MutationObserver(function(mutationsList, observer) {
        console.log("Jelly-Party: Noticed a mutation.");
        console.log(mutationsList);
      });
      observer.observe(elementToObserve, { childList: true });
    }
  }

  initFullscreenHandler() {
    const fullscreenHandler = function() {
      const fullscreenElement = document.fullscreenElement;
      if (!fullscreenElement) {
        console.log(
          `Jelly-Party: Error. fullscreenHandler called, but not fullscreenElement present.`,
        );
      } else {
        const notyfContainer = document.querySelector(".notyf");
        if (notyfContainer) {
          fullscreenElement.appendChild(notyfContainer);
        } else {
          console.log(
            `Jelly-Party: Error. Could not find notyf Container to move to fullscreen Element.`,
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

  insertStyles() {
    const RootHead = document.head;
    const styleScript = document.createElement("script");
    styleScript.type = "text/javascript";
    styleScript.charset = "utf-8";
    styleScript.src = browser.runtime.getURL("js/RootStyles.js");
    RootHead.appendChild(styleScript);
  }
}

function waitForHTMLElement(cssSelector: string, callback: () => any) {
  if (document.querySelector(cssSelector) === null) {
    console.log(`Jelly-Party: Waiting for ${cssSelector}`);
    setTimeout(function() {
      waitForHTMLElement(cssSelector, callback);
    }, 250);
  } else {
    callback();
  }
}

if (window.location.host === "join.jelly-party.com") {
  // Redirect to options page that has full access to browser APIs
  const joinURL = new URL(browser.runtime.getURL("join.html"));
  joinURL.search = window.location.search;
  window.location.href = joinURL.toString();
} else if (!document.querySelector("#jellyPartyRoot")) {
  console.log(`Jelly-Party: Initializing MainFrame!`);
  console.log(`Jelly-Party: Mode is ${process.env.NODE_ENV}`);
  switch (window.location.host) {
    case "www.disneyplus.com": {
      waitForHTMLElement("#app_index", () => {
        (window as any).MainFrame = new MainFrame(window.location.host);
      });
      break;
    }
    default: {
      setTimeout(() => {
        (window as any).MainFrame = new MainFrame(window.location.host);
      }, 250);
    }
  }
} else {
  console.log(`Jelly-Party: Already loaded. Skipping loading.`);
}
