<template>
  <div class="d-flex flex-column">
    <!-- All Chat Messenges -->
    <div style="margin-bottom: 180px;">
      <ChatMessage
        style="flex-grow: 1;"
        v-for="chatMessage in chatMessages"
        :key="chatMessage.data.data.timestamp"
        :chatMessage="chatMessage"
      />
      <!-- Text input -->
      <ChatInput style="position: absolute; bottom: 1em;" />
    </div>
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

<style></style>
