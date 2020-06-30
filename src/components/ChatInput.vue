<template>
  <b-container>
    <!-- <input type="text" style="height: 200px; width: 100%; border-radius: 1em" /> -->
    <b-form-textarea
      id="textarea"
      v-model="text"
      placeholder="Enter something..."
      rows="6"
      max-rows="6"
      style="resize: none; padding: 0.375rem 3rem 0.375rem 0.75rem;"
    ></b-form-textarea>
    <VEmojiPicker
      @select="selectEmoji"
      style="position: absolute; top:1em; right: 1em"
    />
  </b-container>
</template>

<script>
import VEmojiPicker from "v-emoji-picker";

export default {
  components: {
    VEmojiPicker,
  },
  data: function() {
    return {
      text: "",
    };
  },
  methods: {
    selectEmoji(emoji) {
      console.log(emoji);
    },
  },
};
</script>

<style></style>
