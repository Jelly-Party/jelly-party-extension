<template>
  <div id="chatMessengerDiv" class="d-flex flex-column">
    <!-- All Chat Messenges -->
    <div v-show="showChat" id="chatMessagesContainer" style="overflow: auto;">
      <GreetingChatMessage />
      <ChatMessage
        style="flex-grow: 1;"
        v-for="(chatMessage, index) in chatMessages"
        :key="index"
        :chatMessage="chatMessage"
      />
    </div>
    <!-- Text input -->
    <ChatInput v-show="showChat" />
    <!-- Jitsi Meet -->
    <div v-show="!showChat" id="meet" class="h-100"></div>
  </div>
</template>

<script>
import ChatMessage from "@/components/ChatMessage.vue";
import ChatInput from "@/components/ChatInput.vue";
import GreetingChatMessage from "@/helpers/greetingChatMessage";
import { mapFields } from "vuex-map-fields";

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
    ...mapFields("party", ["chatMessages", "showChat"]),
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
