import devtools from "@vue/devtools";
import Vue from "vue";
import Sidebar from "@/views/Sidebar.vue";
import { debounce as _debounce, throttle as _throttle } from "lodash-es";
import { BootstrapVue, IconsPlugin } from "bootstrap-vue";
import store from "@/store.js";
import JellyParty from "./contentScript.js";
import {
  baseSVG,
  jellyFishToArrow,
  arrowToJellyFish,
} from "./jellyPartyFab.js";
import { browser } from "webextension-polyfill-ts";

if (process.env.NODE_ENV === "development") {
  console.log("Jelly-Party: Connecting to devtools");
  devtools.connect(/* host, port */);
}

// Install BootstrapVue & BootstrapVue icon components
Vue.use(BootstrapVue);
Vue.use(IconsPlugin);
Vue.config.devtools = process.env.NODE_ENV === "development";
console.log(`Jelly-Party: Mode is ${process.env.NODE_ENV}`);

class SideBar {
  constructor(host) {
    this.host = host;
    this.sideBarHidden = false;
    this.customizeStyling(host);
    this.insertSideBar();
  }

  customizeStyling(host) {
    switch (host) {
      case "www.netflix.com":
        this.IFrameTarget = document.querySelector(".AkiraPlayer");
        break;
      case "www.youtube.com": {
        this.IFrameTarget = document.querySelector("ytd-app");
        this.IFrameTarget.style.overflow = "hidden";
        this.getVideo = () => {
          return document.querySelector("video");
        };
        this.getControls = () => {
          return document.querySelector(".ytp-chrome-bottom");
        };
        this.fixWebsiteDisplay = function() {
          console.log("Jelly-Party: Fixing website Display");
          console.log(
            `Jelly-Party: this.sideBarHidden is ${
              this.sideBarHidden
            }; document.fullscreenElement is ${Boolean(
              document.fullscreenElement
            )}`
          );
          const video = this.getVideo();
          const controls = this.getControls();
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
            const playerWidth = document.querySelector("#ytd-player")
              .offsetWidth;
            const playerHeight = document.querySelector("#ytd-player")
              .offsetHeight;
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
            const playerWidth = document.querySelector("#ytd-player")
              .offsetWidth;
            const playerHeight = document.querySelector("#ytd-player")
              .offsetHeight;
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
    if (!this.fixWebsiteDisplay) {
      this.IFrameTarget.style.transition = "all 1s";
      this.fixWebsiteDisplay = function() {
        // Define generic fixWebsiteDisplay handler
        if (this.sideBarHidden) {
          this.IFrameTarget.style.width = "100%";
        } else {
          this.IFrameTarget.style.width =
            "calc(100vw - var(--jelly-party-sidebar-width))";
        }
      };
    }
  }

  insertSideBar() {
    let jellyPartyWrapper = document.createElement("div");
    jellyPartyWrapper.setAttribute(
      "style",
      "position: fixed; right: 0; top: 0; bottom: 0; width: var(--jelly-party-sidebar-width); transition: right 300ms ease; margin: 0px;height: 100vh;"
    );
    jellyPartyWrapper.id = "jellyPartyWrapper";
    let jellyPartyRoot = document.createElement("iframe");
    jellyPartyRoot.id = "jellyPartyRoot";
    jellyPartyRoot.frameBorder = 0;
    jellyPartyRoot.style.zIndex = "99999";
    let jellyPartyApp = document.createElement("div");
    jellyPartyApp.id = "jellyPartyApp";
    jellyPartyWrapper.appendChild(jellyPartyRoot);
    this.IFrameTarget.appendChild(jellyPartyWrapper);
    jellyPartyRoot.contentDocument.body.appendChild(jellyPartyApp);
    jellyPartyRoot.style.margin = "0";
    jellyPartyRoot.style.height = "100vh";
    let root = document
      .querySelector("#jellyPartyRoot")
      .contentDocument.body.querySelector("#jellyPartyApp");
    this.app = new Vue({
      store,
      render: (h) => h(Sidebar),
    }).$mount(root);
    // Check if vue-devtools should be enabled or not
    // if (["staging", "development"].includes(store.state.appMode)) {
    //   console.log("Jelly-Party: Enabling devtools.");
    //   let devToolsScript = document.createElement("script");
    //   devToolsScript.type = "text/javascript";
    //   devToolsScript.charset = "utf-8";
    //   devToolsScript.src = "http://localhost:8098";
    //   jellyPartyRoot.contentWindow.document.head.appendChild(devToolsScript);
    // }
    this.initFullscreenHandler();
    this.insertStyles();
    this.setupSideBarToggle();
  }

  initFullscreenHandler() {
    let fullscreenHandler = function() {
      let fullscreenElement = document.fullscreenElement;
      fullscreenElement.appendChild(document.querySelector(".notyf"));
      // Unfortunately, we cannot move an IFrame in the DOM without losing its state, see
      // https://stackoverflow.com/questions/8318264/how-to-move-an-iframe-in-the-dom-without-losing-its-state
      // Therefore we cannot dynamically move the IFrame around like this (otherwise this might allow for
      // removing the need to manually have to specify this.IFrameTarget)
      // fullscreenElement.appendChild(document.querySelector("#jellyPartyRoot"));
      document.removeEventListener("fullscreenchange", fullscreenHandler);
    };
    document.addEventListener("fullscreenchange", fullscreenHandler);
  }

  insertStyles() {
    let RootHead = document.head;
    let IFrameHead = document.querySelector("#jellyPartyRoot").contentWindow
      .document.head;
    [
      { head: RootHead, styles: browser.runtime.getURL("js/RootStyles.js") },
      {
        head: IFrameHead,
        styles: browser.runtime.getURL("js/IFrameStyles.js"),
      },
    ].forEach((elem) => {
      let styleScript = document.createElement("script");
      styleScript.type = "text/javascript";
      styleScript.charset = "utf-8";
      styleScript.src = elem.styles;
      elem.head.appendChild(styleScript);
    });
  }

  attachParty(party) {
    this.app.$party = party;
  }

  setupSideBarToggle() {
    let jellyPartyFab = document.createElement("div");
    jellyPartyFab.id = "jellyPartyFab";
    jellyPartyFab.innerHTML = baseSVG;
    jellyPartyFab.setAttribute(
      "style",
      "position: absolute; left: 5px; top: 10px;"
    );
    document.querySelector("#jellyPartyWrapper").appendChild(jellyPartyFab);
    document.querySelector("#jellyPartyFab").addEventListener("click", () => {
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
          showJellyPartyFab();
          this.jellyPartyFabTimer = Date.now();
        }
      }, 300).bind(this)
    );
    window.setInterval(() => {
      if (this.sideBarHidden) {
        if (Date.now() - this.jellyPartyFabTimer > 5000) {
          hideJellyPartyFab();
        }
      }
    }, 1000);

    function showJellyPartyFab() {
      let jellyPartyFab = document.querySelector("#jellyPartyFab");
      jellyPartyFab.style.display = "";
      jellyPartyFab.style.opacity = 1;
    }

    function hideJellyPartyFab() {
      let jellyPartyFab = document.querySelector("#jellyPartyFab");
      jellyPartyFab.style.opacity = 0;
      setTimeout(() => {
        jellyPartyFab.style.display = "none";
      }, 600);
    }
  }

  toggleSideBar() {
    let jellyPartyRoot = document.querySelector("#jellyPartyRoot");
    if (this.sideBarHidden) {
      // Switch to showing sidebar
      this.sideBarHidden = false;
      this.fixWebsiteDisplay();
      jellyPartyRoot.classList.remove("sideBarMinimized");
      jellyFishToArrow();
    } else {
      // Switch to hiding sidebar
      this.sideBarHidden = true;
      this.fixWebsiteDisplay();
      jellyPartyRoot.classList.add("sideBarMinimized");
      arrowToJellyFish();
    }
  }
}

let jellyPartySideBar = new SideBar(window.location.host);
console.log(jellyPartySideBar);
let party = new JellyParty("somebody");
jellyPartySideBar.attachParty(party);
