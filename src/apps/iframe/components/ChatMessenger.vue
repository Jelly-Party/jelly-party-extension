<template>
  <div id="chatMessengerDiv" class="d-flex flex-column">
    <!-- All Chat Messenges -->
    <div v-show="showChat" id="chatMessagesContainer" style="overflow: auto;">
      <GreetingChatMessage />
      <ChatMessage
        v-for="(chatMessage, index) in chatMessages"
        :key="index"
        style="flex-grow: 1;"
        :chat-message="chatMessage"
      />
    </div>
    <!-- Text input -->
    <ChatInput v-show="showChat" />
    <!-- Jitsi Meet -->
    <div v-show="!showChat" id="meet" class="h-100"></div>
  </div>
</template>

<script>
import ChatMessage from "./ChatMessage.vue";
import ChatInput from "./ChatInput.vue";
import GreetingChatMessage from "./GreetingChatMessage.vue";
import { appState } from "../IFrame";

export default {
  components: {
    ChatMessage,
    GreetingChatMessage,
    ChatInput,
  },
  computed: {
    // When using nested data structures, the string
    // after the last dot (e.g. `firstName`) is used
    // for defining the name of the computed property.
    chatMessages() {
      return appState.PartyState.chatMessages;
    },
    showChat() {
      return appState.PartyState.showChat;
    },
  },
};
</script>

<style lang="scss">
#chatMessengerDiv {
  flex-grow: 1;
  justify-content: space-between;
  height: calc(
    100vh - var(--jelly-party-controls-height) -
      var(--jelly-party-header-height)
  );
}
</style>
