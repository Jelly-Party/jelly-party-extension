import Vue from "vue";
import { debounce as _debounce } from "lodash-es";

export default class ChatHandler {
  constructor(host) {
    this.host = host;
    this.insertSideBar();
    //this.mountSideBar();
    this.customize(host);
    //this.resetChat();
  }

  customize(host) {
    switch (host) {
      case "www.netflix.com":
        break;
      case "www.youtube.com": {
        const video = document.querySelector("video");
        const controls = document.querySelector(".ytp-chrome-bottom");
        this.fixDisplayNonFullscreen = function() {
          const playerWidth = document.querySelector("#ytd-player").offsetWidth;
          const playerHeight = document.querySelector("#ytd-player")
            .offsetHeight;
          // Fix video display size
          video.style.width = `${playerWidth}px`;
          video.style.height = `${playerHeight}px`;
          // Fix control bar display size
          controls.style.width = `${playerWidth - 30}px`;
        };
        this.fixDisplayFullscreen = function() {
          video.style.width = `85vw`;
          video.style.height = `100vh`;
          video.style.top = `0px`;
          controls.style.width = `calc(85vw - 30px)`;
        };
        this.fixDisplay = function() {
          if (document.fullscreenElement) {
            // In fullscreen
            this.fixDisplayFullscreen();
          } else {
            // Not in fullscreen
            this.fixDisplayNonFullscreen();
          }
        };
        window.addEventListener("fullscreenchange", () => {
          console.log("Jelly-Party: Handling Youtube Fullscreen-change.");
          this.fixDisplay();
        });
        window.addEventListener(
          "resize",
          _debounce(() => {
            console.log("Jelly-Party: Handling Youtube resize event.");
            this.fixDisplay();
          }, 1000).bind(this)
        );
        this.fixDisplayNonFullscreen();
        break;
      }
      case "www.disneyplus.com":
        break;
      default:
        console.log(`Jelly-Party: No customization intended for ${host}`);
    }
  }

  insertSideBar() {
    var jellyPartySideBar = document.createElement("div");
    jellyPartySideBar.id = "jellyPartySideBar";
    var app = document.createElement("iframe");
    app.id = "jellyPartyApp";
    jellyPartySideBar.appendChild(app);
    document.body.insertAdjacentElement("afterend", jellyPartySideBar);
    document.body.setAttribute(
      "style",
      "transform: translate(0, 0); width: min(85vw, calc(100vw - 200px)); height: 100vh; transition: width 300ms ease;"
    );
    document
      .querySelector("#jellyPartySideBar")
      .setAttribute(
        "style",
        "position: fixed; right: 0; top: 0; bottom: 0; width: 15vw;  min-width: calc(200px - 15px);  background-color: black; transition: right 300ms ease;"
      );
  }

  mountSideBar() {
    this.app = new Vue({
      render: (h) => h(Chat),
    }).$mount("#jellyPartySideBar");
    this.chatComponent = this.app.$children[0];
  }

  connectWebSocket(ws) {
    this.ws = ws;
    this.chatComponent.ws = ws;
  }
}
