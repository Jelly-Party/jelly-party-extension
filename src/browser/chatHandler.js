import Vue from "vue";
import Chat from "@/components/Chat.vue";
import BeautifulChat from "vue-beautiful-chat";
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
          this.resetChatTo("15vh", "20vh");
          try {
            document
              .querySelector(".sizing-wrapper")
              .append(document.querySelector("#jellyPartyChatDiv"));
          } catch {
            console.log("Jelly-Party: Problem resetting chat..");
          }
        };
        this.resetChat();
        break;
      case "www.youtube.com":
        this.resetChat = () => {
          this.resetChatTo("10vh", "15vh");
          try {
            document.querySelector("yt-hotkey-manager").remove();
          } catch {
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
          this.resetChatTo("25px", "100px");
        };
        this.resetChat();
    }
  }

  insertChatContainer() {
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
      render: (h) => h(Chat),
    }).$mount("#jellyPartyChatApp");
    this.chatComponent = this.app.$children[0];
  }

  connectWebSocket(ws) {
    this.ws = ws;
    this.chatComponent.ws = ws;
  }

  resetChatTo(bottomFab, bottomChat) {
    console.log("Jelly-Party: Resetting chat");
    document.querySelector(".sc-launcher").style.bottom = bottomFab;
    document.querySelector(".sc-open-icon").style.bottom = bottomFab;
    document.querySelector(".sc-chat-window").style.bottom = bottomChat;
  }
}
