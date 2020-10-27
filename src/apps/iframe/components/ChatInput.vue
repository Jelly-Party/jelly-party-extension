<template>
  <b-container style="position: relative" class="pb-2 pt-2">
    <b-form-textarea
      id="textarea"
      v-model="text"
      placeholder="Enter something..."
      rows="4"
      max-rows="4"
      style="resize: none; padding: 0.375rem 3rem 0.375rem 0.75rem;"
      @keyup.enter="sendChatMessage"
    ></b-form-textarea>
    <div id="sendMessageButton" @click="sendChatMessage">
      <svg
        height="2em"
        width="2em"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        data-prefix="fas"
        data-icon="paper-plane"
        class="svg-inline--fa fa-paper-plane fa-w-16"
        role="img"
        viewBox="0 0 512 512"
      >
        <path
          fill="currentColor"
          d="M476 3.2L12.5 270.6c-18.1 10.4-15.8 35.6 2.2 43.2L121 358.4l287.3-253.2c5.5-4.9 13.3 2.6 8.6 8.3L176 407v80.5c0 23.6 28.5 32.9 42.5 15.8L282 426l124.6 52.2c14.2 6 30.4-2.9 33-18.2l72-432C515 7.8 493.3-6.8 476 3.2z"
        />
      </svg>
    </div>
    <div id="toggleEmojiPicker" @click="toggleEmojiPicker">
      <svg
        height="2em"
        width="2em"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        data-prefix="fas"
        data-icon="smile-beam"
        class="svg-inline--fa fa-smile-beam fa-w-16"
        role="img"
        viewBox="0 0 496 512"
      >
        <path
          fill="currentColor"
          d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zM112 223.4c3.3-42.1 32.2-71.4 56-71.4s52.7 29.3 56 71.4c.7 8.6-10.8 11.9-14.9 4.5l-9.5-17c-7.7-13.7-19.2-21.6-31.5-21.6s-23.8 7.9-31.5 21.6l-9.5 17c-4.3 7.4-15.8 4-15.1-4.5zm250.8 122.8C334.3 380.4 292.5 400 248 400s-86.3-19.6-114.8-53.8c-13.5-16.3 11-36.7 24.6-20.5 22.4 26.9 55.2 42.2 90.2 42.2s67.8-15.4 90.2-42.2c13.6-16.2 38.1 4.3 24.6 20.5zm6.2-118.3l-9.5-17c-7.7-13.7-19.2-21.6-31.5-21.6s-23.8 7.9-31.5 21.6l-9.5 17c-4.1 7.3-15.6 4-14.9-4.5 3.3-42.1 32.2-71.4 56-71.4s52.7 29.3 56 71.4c.6 8.6-11 11.9-15.1 4.5z"
        />
      </svg>
    </div>
    <VEmojiPicker
      style="position: absolute; top: -27em; right: 0.7em; display: none;"
      @select="selectEmoji"
    />
  </b-container>
</template>

<script>
import VEmojiPicker from "v-emoji-picker";
import ClipboardJS from "clipboard";
import { debounce as _debounce } from "lodash-es";
import { appState } from "../IFrame";

export default {
  components: {
    VEmojiPicker,
  },
  data: function() {
    return {
      text: "",
      attached: true,
    };
  },
  computed: {
    messages: function() {
      return appState.PartyState.chatMessages;
    },
  },
  watch: {
    messages: function() {
      if (this.attached) {
        this.scrollToBottom();
      }
    },
  },
  mounted: function() {
    new ClipboardJS(".copy-button");
    const el = document.querySelector("#chatMessagesContainer");
    el.addEventListener(
      "scroll",
      _debounce(() => {
        const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 1;
        this.attached = isAtBottom;
      }, 100),
    );
  },
  created: function() {
    // Create non-reactive references.
    // this.skipNext is required to skip the callback for
    // the next click on #toggleEmojiPicker, which
    // otherwise opens & immediately closes the Picker
    this.skipNext = true;
    this.customEventListener = e => {
      if (this.skipNext) {
        this.skipNext = false;
        return;
      }
      const path = e.path || e.composedPath();
      const clickContainsEmojiPicker = path.some((elem, index) => {
        if (elem?.id === "EmojiPicker") {
          return true;
        }
        return false;
      });
      if (!clickContainsEmojiPicker) {
        this.toggleEmojiPicker();
      }
    };
  },
  methods: {
    selectEmoji(emoji) {
      this.text += emoji.data;
    },
    toggleEmojiPicker() {
      const picker = document.querySelector("#EmojiPicker");
      const openPicker = picker.style.display === "none";
      if (openPicker) {
        // Show the picker
        picker.style.display = "block";
        // Add a new event listener
        this.skipNext = true;
        document.addEventListener("click", this.customEventListener);
      } else {
        // Close the picker
        picker.style.display = "none";
        // Remove the event listener
        document.removeEventListener("click", this.customEventListener);
      }
    },
    sendChatMessage() {
      // Only send text messages that contain, well, text
      // (1 is for the enter key)
      if (this.text.length > 1) {
        this.$root.$iframe.sendChatMessage(this.text);
        this.text = "";
      } else {
        // reset so that return keys don't add up..
        this.text = "";
      }
    },
    scrollToBottom() {
      const div = document.getElementById("chatMessagesContainer");
      div.scrollTop = div.scrollHeight;
    },
  },
};
</script>

<style lang="scss">
@mixin positionButton($bottomDistance) {
  position: absolute;
  right: 2em;
  bottom: $bottomDistance;
  cursor: pointer;
  color: $jellyPartyPurple;
  transition: all 0.3s ease;
  &:hover {
    color: $jellyPartyOrange;
  }
}
#sendMessageButton {
  @include positionButton(1.5em);
}

#toggleEmojiPicker {
  @include positionButton(4.5em);
}
</style>
