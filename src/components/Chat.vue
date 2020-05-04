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
              message.me
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
          🎥🎉🍿
          {{
            participants
              .filter((m) => m.name !== "Jelly" && !m.left)
              .map((m) => m.name)
              .join(" & ")
          }}
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
import { difference as _difference, throttle as _throttle } from "lodash-es";

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
      participants: [
        { id: "jellyPartySupportBot", name: "Jelly", left: false },
      ], // the list of all the participant of the conversation. `name` is the user name, `id` is used to establish the author of a message, `imageUrl` is supposed to be the user avatar.
      titleImageUrl: OpenIcon,
      messageList: [
        {
          author: "jellyPartySupportBot",
          type: "system",
          data: {
            text:
              'You can use this chat to talk to people in your party. Type "#helpme" to open our FAQ in a new tab.',
            timestamp: Date.now(),
          },
        },
      ], // the list of the messages to show, can be paginated and adjusted dynamically
      newMessagesCount: 0,
      isChatOpen: false, // to determine whether the chat window should be open or closed
      showTypingIndicator: "", // when set to a value matching the participant.id it shows the typing indicator for the specific user
      colors: {
        header: {
          bg:
            "linear-gradient(to right bottom, rgb(141, 207, 243) 0px, rgb(145, 100, 255)",
          text: "#ffffff",
        },
        launcher: {
          bg:
            "linear-gradient(to right bottom, rgb(141, 207, 243) 0px, rgb(145, 100, 255)",
        },
        messageList: {
          bg: "#dee2e6",
        },
        sentMessage: {
          bg:
            "linear-gradient(to right bottom, rgb(141, 207, 243) 0px, rgb(145, 100, 255)",
          text: "#ffffff",
        },
        receivedMessage: {
          bg:
            "linear-gradient(to right bottom, rgb(255, 148, 148) 0%, rgb(238, 100, 246) 100%)",
          text: "#ffffff",
        },
        userInput: {
          bg: "#f4f7f9",
          text: "#565867",
        },
      }, // specifies the color scheme for the component
      alwaysScrollToBottom: true, // when set to true always scrolls the chat to the bottom when new events are in (new message, user starts typing...)
      messageStyling: true, // enables *bold* /emph/ _underline_ and such (more info at github.com/mattezza/msgdown)
    };
  },
  methods: {
    onMessageWasSent(message) {
      // called when the user sends a message
      if (message.data.text === "#helpme") {
        window.open("https://www.jelly-party.com/#gettingStarted", "_blank");
      } else if (this.ws) {
        message.data.timestamp = Date.now();
        message.author = this.ws.uuid;
        message.me = true;
        this.messageList = [...this.messageList, message];
        // send message to server
        let serverCommand = {
          type: "forward",
          data: {
            commandToForward: {
              type: "chatMessage",
              data: {
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
        if (message.data.text === "#helpme") {
          window.open("https://www.jelly-party.com/#gettingStarted", "_blank");
        } else {
          this.messageList = [
            ...this.messageList,
            {
              author: "jellyPartySupportBot",
              type: "system",
              data: {
                text:
                  'You must be inside a party to chat. Need more information? Type "#helpme" to open our FAQ in a new tab.',
                timestamp: Date.now(),
              },
            },
          ];
        }
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
      console.log("Receiving update")
      console.log(newPartyState)
      let newUUIDs = newPartyState.peers.map((peer) => peer.uuid);
      let previousUUIDs = this.participants
        .filter((p) => p.id !== "jellyPartySupportBot")
        .map((participant) => participant.id);
      let addUUIDs = _difference(newUUIDs, previousUUIDs);
      let markLeftUUIDs = _difference(previousUUIDs, newUUIDs);
      for (const addUUID of addUUIDs) {
        this.participants.push(
          newPartyState.peers
            .filter((peer) => peer.uuid === addUUID)
            .map((peer) => {
              return {
                id: peer.uuid,
                name: peer.clientName,
                avatarState: peer.avatarState,
                left: false,
              };
            })[0]
        );
      }
      // Mark everybody who's left, since we must keep participants list
      // (some state is maintained in this.participants)
      for (const markLeftUUID of markLeftUUIDs) {
        let participant = this.participants.find(
          (participant) => participant.id === markLeftUUID
        );
        participant.left = true;
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
      window.removeEventListener("mousemove", throttled, true);
    }

    function mouseDown(e) {
      e.preventDefault();
      window.addEventListener("mousemove", throttled, true);
    }

    const throttled = _throttle(
      function(e) {
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
          chatStyle.left = ((e.clientX - 225) / window.innerWidth) * 100 + "vw";
        }
      }.bind(this),
      30
    );
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
  user-select: text !important;
}

.sc-message--content {
  align-items: center !important;
}

.user-element {
  color: black !important;
}
</style>
