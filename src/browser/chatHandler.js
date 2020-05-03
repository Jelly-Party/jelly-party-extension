import Vue from "vue";
import Chat from "@/components/Chat.vue";
import BeautifulChat from "./vue-beautiful-chat/src/index.js";
Vue.use(BeautifulChat);

export default class ChatHandler {
  constructor(host) {
    this.host = host;
    this.insertChatContainer();
    this.mountChatApp();
    this.customize(host);
  }

  customize(host) {
    switch (host) {
      case "www.netflix.com":
        this.resetChat = () => {
          if (!document.querySelector(".sc-launcher")) {
            // Netflix has removed our chat
            this.insertChatContainer();
            this.mountChatApp();
          }
          this.positionChat("15vh", "20vh");
          try {
            document
              .querySelector(".sizing-wrapper")
              .append(document.querySelector("#jellyPartyChatDiv"));
          } catch (e) {
            console.log(
              "Jelly-Party: Problem attaching chat to video wrapper. Probably not on video page right now."
            );
          }
        };
        this.resetChat();
        break;
      case "www.youtube.com":
        this.resetChat = () => {
          this.positionChat("10vh", "15vh");
          try {
            document.querySelector("yt-hotkey-manager").remove();
          } catch (e) {
            console.log("Jelly-Party: Problem resetting chat..");
          }
        };
        this.resetChat();
        // Workaround due to complicated event flow I simply don't understand
        // If we leave hotkeys enabled, anything character typed into the chat
        // will be interpreted as a hotkey...
        break;
      default:
        this.resetChat = () => {
          this.positionChat("25px", "100px");
        };
        this.resetChat();
    }
  }

  insertChatContainer() {
    try {
      document.querySelector("#jellyPartyChatDiv").remove();
    } catch (e) {
      () => {};
    }
    var chatDiv = document.createElement("div");
    chatDiv.id = "jellyPartyChatDiv";
    var app = document.createElement("jellyPartyChatApp");
    app.id = "jellyPartyChatApp";
    chatDiv.appendChild(app);
    document.body.insertAdjacentElement("beforeend", chatDiv);
    document
      .querySelector("#jellyPartyChatDiv")
      .setAttribute(
        "style",
        "position: fixed; right: 0; top: 0; z-index: 9999"
      );
  }

  mountChatApp() {
    this.app = new Vue({
      render: h => h(Chat)
    }).$mount("#jellyPartyChatApp");
    this.chatComponent = this.app.$children[0];
  }

  connectWebSocket(ws) {
    this.ws = ws;
    this.chatComponent.ws = ws;
  }

  positionChat(bottomFab, bottomChat) {
    console.log("Jelly-Party: Resetting chat");
    [".sc-launcher", ".sc-open-icon", ".sc-closed-icon"].forEach(elem => {
      let style = document.querySelector(elem)?.style;
      if (style) {
        style.bottom = bottomFab;
      }
    });
    let chatStyle = document.querySelector(".sc-chat-window")?.style;
    if (chatStyle) {
      chatStyle.bottom = bottomChat;
    }
  }
}
