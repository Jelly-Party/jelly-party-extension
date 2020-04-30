<template>
  <div>
    <beautiful-chat
      :participants="participants"
      :titleImageUrl="titleImageUrl"
      :onMessageWasSent="onMessageWasSent"
      :messageList="messageList"
      :newMessagesCount="newMessagesCount"
      :isOpen="isChatOpen"
      :close="closeChat"
      :icons="icons"
      :open="openChat"
      :showEmoji="true"
      :showFile="false"
      :showTypingIndicator="showTypingIndicator"
      :colors="colors"
      :alwaysScrollToBottom="alwaysScrollToBottom"
      :messageStyling="messageStyling"
      @onType="handleOnType"
      @edit="editMessage"
    >
      <template v-slot:text-message-body="{ message }">
        <p style="margin-top: 10px">{{ message.data.text }}</p>
        <p style="margin: 10px 10px 10px 0px;">
          <small v-if="message.author">
            ―
            {{
              message.author === "me"
                ? "me"
                : participants.filter(
                    (participant) => participant.id === message.author
                  )[0].name
            }}
            [{{ timeStampToDateString(message.data.timestamp) }}]</small
          >
        </p>
      </template>
      <template v-slot:header>
        <p style="font-size: 16px">
          🎥🎉🍿 {{ participants.map((m) => m.name).join(" & ") }}
        </p>
      </template>
    </beautiful-chat>
  </div>
</template>

<script>
import CloseIcon from "vue-beautiful-chat/src/assets/close-icon.png";
import OpenIcon from "../../public/images/logo/64x64.png";
import FileIcon from "vue-beautiful-chat/src/assets/file.svg";
import CloseIconSvg from "vue-beautiful-chat/src/assets/close.svg";
import Boy from "../../public/images/boy.png";
// import Girl from "../../public/images/girl.png";
import { difference as _difference, once as _once } from "lodash-es";

export default {
  name: "app",
  data() {
    return {
      icons: {
        open: {
          img: OpenIcon,
          name: "default",
        },
        close: {
          img: CloseIcon,
          name: "default",
        },
        file: {
          img: FileIcon,
          name: "default",
        },
        closeSvg: {
          img: CloseIconSvg,
          name: "default",
        },
      },
      participants: [], // the list of all the participant of the conversation. `name` is the user name, `id` is used to establish the author of a message, `imageUrl` is supposed to be the user avatar.
      titleImageUrl: OpenIcon,
      messageList: [], // the list of the messages to show, can be paginated and adjusted dynamically
      newMessagesCount: 0,
      isChatOpen: false, // to determine whether the chat window should be open or closed
      showTypingIndicator: "", // when set to a value matching the participant.id it shows the typing indicator for the specific user
      colors: {
        header: {
          bg: "#4e8cff",
          text: "#ffffff",
        },
        launcher: {
          bg: "#4e8cff",
        },
        messageList: {
          bg: "#ffffff",
        },
        sentMessage: {
          bg: "#4e8cff",
          text: "#ffffff",
        },
        receivedMessage: {
          bg: "#eaeaea",
          text: "#222222",
        },
        userInput: {
          bg: "#f4f7f9",
          text: "#565867",
        },
      }, // specifies the color scheme for the component
      alwaysScrollToBottom: false, // when set to true always scrolls the chat to the bottom when new events are in (new message, user starts typing...)
      messageStyling: true, // enables *bold* /emph/ _underline_ and such (more info at github.com/mattezza/msgdown)
    };
  },
  methods: {
    onMessageWasSent(message) {
      // called when the user sends a message
      if (this.ws) {
        message.data.timestamp = Date.now();
        // message.author = this.ws.uuid;
        // message.name = "me"
        this.messageList = [...this.messageList, message];
        // send message to server
        let serverCommand = {
          type: "forward",
          data: {
            commandToForward: {
              type: "chatMessage",
              data: {
                author: message.author,
                type: message.type,
                data: message.data,
              },
            },
          },
        };
        this.ws.send(JSON.stringify(serverCommand));
      } else {
        console.log(
          "Jelly-Party: Not connected to websocket. Cannot send chat message."
        );
      }
    },
    openChat() {
      // called when the user clicks on the fab button to open the chat
      this.isChatOpen = true;
      this.newMessagesCount = 0;
    },
    closeChat() {
      // called when the user clicks on the botton to close the chat
      this.isChatOpen = false;
    },
    handleScrollToTop() {
      // called when the user scrolls message list to top
      // leverage pagination for loading another page of messages
    },
    handleOnType() {},
    editMessage(message) {
      const m = this.messageList.find((m) => m.id === message.id);
      m.isEdited = true;
      m.data.text = message.data.text;
    },
    receiveChatMessage(chatMessage) {
      this.newMessagesCount = this.isChatOpen
        ? this.newMessagesCount
        : this.newMessagesCount + 1;
      this.messageList = [
        ...this.messageList,
        {
          type: chatMessage.data.type,
          author: chatMessage.peer.uuid,
          data: chatMessage.data.data,
        },
      ];
    },
    receivePartyStateUpdate(newPartyState) {
      // Let's add any new clients. We must remember old clients so that chat messages
      // show correctly even after a client has left the party.
      let newUUIDs = newPartyState.peers.map((peer) => peer.uuid);
      let previousUUIDs = this.participants.map(
        (participant) => participant.id
      );
      let addUUIDs = _difference(newUUIDs, previousUUIDs);
      for (const addUUID of addUUIDs) {
        this.participants.push(
          newPartyState.peers
            .filter((peer) => peer.uuid === addUUID)
            .map((peer) => {
              return { id: peer.uuid, name: peer.clientName, imageUrl: Boy };
            })[0]
        );
      }
    },
    timeStampToDateString(ts) {
      var date = new Date(ts);
      var hours = date.getHours();
      var minutes = "0" + date.getMinutes();
      return `${hours}:${minutes.substr(-2)}`;
    },
    repositionChat() {
      [
        ".sc-launcher",
        ".sc-open-icon",
        ".sc-closed-icon",
        ".sc-chat-window",
      ].forEach((elem) => {
        let style = document.querySelector(elem)?.style;
        if (style) {
          style.top = "";
          style.left = "";
        }
      });
    },
  },
  mounted: function() {
    const addListeners = function() {
      document
        .querySelector(".sc-launcher")
        .addEventListener("mousedown", mouseDown, false);
      window.addEventListener("mouseup", mouseUp, false);
    }.bind(this);

    function mouseUp() {
      window.removeEventListener("mousemove", divMove, true);
    }

    function mouseDown(e) {
      e.preventDefault();
      window.addEventListener("mousemove", divMove, true);
    }

    const divMove = function(e) {
      [".sc-launcher", ".sc-open-icon", ".sc-closed-icon"].forEach((elem) => {
        let style = document.querySelector(elem)?.style;
        if (style) {
          style.top = ((e.clientY - 30) / window.innerHeight) * 100 + "vh";
          style.left = ((e.clientX - 30) / window.innerWidth) * 100 + "vw";
        }
      });
      let chatStyle = document.querySelector(".sc-chat-window")?.style;
      if (chatStyle) {
        chatStyle.top = ((e.clientY - 640) / window.innerHeight) * 100 + "vh";
        chatStyle.left = ((e.clientX - 345) / window.innerWidth) * 100 + "vw";
      }
    }.bind(this);
    addListeners();
  },
};
</script>

<style>
.sc-launcher .sc-open-icon {
  padding: 10px !important;
}

.sc-header--img {
  width: 32px !important;
  height: 32px !important;
  padding: 0 !important;
}

.sc-message--text {
  user-select: all !important;
}

.sc-message--content {
  align-items: center !important;
}

.user-element {
  color: black !important;
}
</style>
