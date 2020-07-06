import { debounce as _debounce, throttle as _throttle } from "lodash-es";
import {
  baseSVG,
  jellyFishToArrow,
  arrowToJellyFish,
} from "./jellyPartyFab.js";
import { browser } from "webextension-polyfill-ts";
import { MainFrameMessenger } from "@/browser/Messenger";
import VideoHandler from "@/browser/videoHandler";
import Notyf from "./libs/js/notyf.min.js";
import "./libs/css/notyf.min.css";
import { JoinPartyCommandFrame } from "@/browser/Messenger";

console.log(`Jelly-Party: Mode is ${process.env.NODE_ENV}`);

export class MainFrame {
  host: string;
  sideBarHidden: boolean;
  IFrameTarget!: HTMLElement | null;
  jellyPartyFabTimer!: number;
  videoHandler: VideoHandler;
  mainFrameMessenger: MainFrameMessenger;
  notyf: any;
  magicLinkUsed: boolean;
  partyIdFromURL: string | null;
  getVideo!: () => HTMLVideoElement | null;
  getControls!: () => HTMLElement | null;
  fixWebsiteDisplay!: () => void;
  showNotification: (arg0: string) => void;

  constructor(host: string) {
    this.host = host;
    this.sideBarHidden = false;
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
      "jellyPartyId"
    );
    this.showNotification = (msg: string) => this.notyf.success(msg);
    this.mainFrameMessenger = new MainFrameMessenger(
      this.showNotification,
      this
    );
    this.videoHandler = new VideoHandler(
      window.location.host,
      this.mainFrameMessenger
    );
    this.mainFrameMessenger.videoHandler = this.videoHandler;
    this.customizeStyling(host);
    this.insertSideBar();
  }

  customizeStyling(this: MainFrame, host: string) {
    switch (host) {
      case "www.netflix.com":
        this.IFrameTarget = document.querySelector(".AkiraPlayer");
        break;
      case "www.youtube.com": {
        this.IFrameTarget = document.querySelector("ytd-app");
        if (!this.IFrameTarget) {
          console.log(`Jelly-Party: Missing IFrame target.`);
          break;
        }
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
                video
              )}. Missing controls: ${Boolean(controls)}.
              Missing video: ${Boolean(this.IFrameTarget)}.`
            );
            return;
          }
          if (this.sideBarHidden && document.fullscreenElement) {
            // Sidebar is hidden & we're in fullscreen mode
            this.IFrameTarget.style.width = "100%";
            video.style.width = "100vw";
            video.style.height = "100vh";
            video.style.top = `0px`;
            controls.style.width = "calc(100vw - 30px)";
          } else if (this.sideBarHidden && !document.fullscreenElement) {
            // Sidebar is hidden & we're NOT in fullscreen
            this.IFrameTarget.style.width = "100%";
            const player: HTMLElement | null = document.querySelector(
              "#ytd-player"
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
          } else if (!this.sideBarHidden && document.fullscreenElement) {
            // Sidebar is showing & we're in fullscreen mode
            this.IFrameTarget.style.width =
              "calc(100vw - var(--jelly-party-sidebar-width))";
            video.style.width =
              "calc(100vw - var(--jelly-party-sidebar-width))";
            video.style.height = `100vh`;
            video.style.top = `0px`;
            controls.style.width =
              "calc(100vw - var(--jelly-party-sidebar-width) - 30px)";
          } else if (!this.sideBarHidden && !document.fullscreenElement) {
            // Sidebar is showing & we're NOT in fullscreen mode
            this.IFrameTarget.style.width =
              "calc(100vw - var(--jelly-party-sidebar-width))";
            const player: HTMLElement | null = document.querySelector(
              "#ytd-player"
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
          }, 1000).bind(this)
        );
        setTimeout(() => {
          this.fixWebsiteDisplay();
        }, 3000);
        break;
      }
      case "www.disneyplus.com":
        break;
      default:
        console.log(`Jelly-Party: No customization intended for ${host}`);
        this.IFrameTarget = document.body;
    }
    if (!this.IFrameTarget) {
      console.log(`Jelly-Party: Uh-oh. No IFrameTarget found..`);
    }
    if (!this.fixWebsiteDisplay) {
      if (this.IFrameTarget) {
        this.IFrameTarget.style.transition = "all 1s";
        this.fixWebsiteDisplay = function() {
          // Define generic fixWebsiteDisplay handler
          if (!this.IFrameTarget) {
            console.log(
              `Jelly-Party: Cannot define fixWebsiteDisplay. Missing IFrameTarget.`
            );
          } else {
            if (this.sideBarHidden) {
              this.IFrameTarget.style.width = "100%";
            } else {
              this.IFrameTarget.style.width =
                "calc(100vw - var(--jelly-party-sidebar-width))";
            }
          }
        };
      } else {
        console.log(`Jelly-Party: Missing IFrameTarget.`);
      }
    }
  }

  insertSideBar() {
    const jellyPartyWrapper = document.createElement("div");
    jellyPartyWrapper.setAttribute(
      "style",
      "position: fixed; right: 0; top: 0; bottom: 0; width: var(--jelly-party-sidebar-width); transition: all 1s ease; margin: 0px;height: 100vh;"
    );
    jellyPartyWrapper.id = "jellyPartyWrapper";
    const jellyPartyRoot = document.createElement("iframe");
    jellyPartyRoot.id = "jellyPartyRoot";
    jellyPartyRoot.frameBorder = "0";
    jellyPartyRoot.style.zIndex = "99999";
    jellyPartyRoot.style.height = "100vh";
    jellyPartyRoot.style.width = "var(--jelly-party-sidebar-width)";
    jellyPartyRoot.src = browser.runtime.getURL("iframe.html");
    jellyPartyWrapper.appendChild(jellyPartyRoot);
    if (this.IFrameTarget) {
      this.IFrameTarget.appendChild(jellyPartyWrapper);
      this.initFullscreenHandler();
      this.insertStyles();
      this.setupSideBarToggle();
      (window as any).jellyPartyLoaded = true;
    } else {
      console.error(
        `Jelly-Party: Error attaching IFrame. this.IFrameTarget not found.`
      );
    }
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

  insertStyles() {
    const RootHead = document.head;
    const styleScript = document.createElement("script");
    styleScript.type = "text/javascript";
    styleScript.charset = "utf-8";
    styleScript.src = browser.runtime.getURL("js/RootStyles.js");
    RootHead.appendChild(styleScript);
  }

  showJellyPartyFab() {
    const jellyPartyFab: HTMLElement | null = document.querySelector(
      "#jellyPartyFab"
    );
    if (!jellyPartyFab) {
      console.log(`Jelly-Party: Error. #jellyPartyFab not found.`);
    } else {
      jellyPartyFab.style.display = "";
      jellyPartyFab.style.opacity = "1";
    }
  }

  hideJellyPartyFab() {
    const jellyPartyFab: HTMLElement | null = document.querySelector(
      "#jellyPartyFab"
    );
    if (!jellyPartyFab) {
      console.log(`Jelly-Party: Error. #jellyPartyFab not found.`);
    } else {
      jellyPartyFab.style.opacity = "0";
      setTimeout(() => {
        jellyPartyFab.style.display = "none";
      }, 600);
    }
  }

  setupSideBarToggle() {
    const jellyPartyFab = document.createElement("div");
    jellyPartyFab.id = "jellyPartyFab";
    jellyPartyFab.innerHTML = baseSVG;
    jellyPartyFab.setAttribute(
      "style",
      "position: absolute; left: 5px; top: 10px; z-index: 99999"
    );
    const wrapper = document.querySelector("#jellyPartyWrapper");
    if (!wrapper) {
      console.error(`Jelly-Party: Cannot find #jellyPartyWrapper`);
      return;
    }
    wrapper.appendChild(jellyPartyFab);
    const fab = document.querySelector("#jellyPartyFab");
    if (!fab) {
      console.error(`Jelly-Party: Cannot find #jellyPartyFab.`);
      return;
    }
    fab.addEventListener("click", () => {
      console.log("Jelly-Party: Fab clicked");
      this.toggleSideBar();
    });
    this.fixWebsiteDisplay();
    // Next, ensure that we hide the fab after X seconds
    this.jellyPartyFabTimer = 0;
    document.addEventListener(
      "mousemove",
      _throttle(() => {
        if (this.sideBarHidden) {
          this.showJellyPartyFab();
          this.jellyPartyFabTimer = Date.now();
        }
      }, 300).bind(this)
    );
    window.setInterval(() => {
      if (this.sideBarHidden) {
        if (Date.now() - this.jellyPartyFabTimer > 5000) {
          this.hideJellyPartyFab();
        }
      }
    }, 1000);
  }

  toggleSideBar() {
    const jellyPartyWrapper = document.querySelector("#jellyPartyWrapper");
    if (!jellyPartyWrapper) {
      console.log(`Jelly-Party: Cannot find #jellyPartyWrapper.`);
    } else {
      if (this.sideBarHidden) {
        // Switch to showing sidebar
        this.sideBarHidden = false;
        this.fixWebsiteDisplay();
        jellyPartyWrapper.classList.remove("sideBarMinimized");
        jellyFishToArrow();
      } else {
        // Switch to hiding sidebar
        this.sideBarHidden = true;
        this.fixWebsiteDisplay();
        jellyPartyWrapper.classList.add("sideBarMinimized");
        arrowToJellyFish();
      }
    }
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
      };
      this.mainFrameMessenger.sendData(msg);
    }
  }
}

if (window.location.host === "join.jelly-party.com") {
  // Request background script to redirect & then inject content script
} else if (!(window as any).jellyPartyLoaded) {
  new MainFrame(window.location.host);
}
