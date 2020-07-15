<template>
  <div id="chatMessengerDiv" class="d-flex flex-column">
    <!-- All Chat Messenges -->
    <div id="chatMessagesContainer" style="overflow: auto;">
      <ChatMessage
        style="flex-grow: 1;"
        v-for="(chatMessage, index) in chatMessages"
        :key="index"
        :chatMessage="chatMessage"
      />
    </div>
    <!-- Text input -->
    <ChatInput />
  </div>
</template>

<script>
import ChatMessage from "@/components/ChatMessage.vue";
import ChatInput from "@/components/ChatInput.vue";
import { mapFields } from "vuex-map-fields";

export default {
  components: {
    ChatMessage,
    ChatInput,
  },
  computed: {
    // When using nested data structures, the string
    // after the last dot (e.g. `firstName`) is used
    // for defining the name of the computed property.
    ...mapFields("party", ["chatMessages"]),
  },
};
</script>

<style lang="scss">
#chatMessengerDiv {
  flex-grow: 1;
  justify-content: space-between;
}
</style>
