<template>
  <div id="back-button" @click="goBack">
    <b-icon-arrow-left-short></b-icon-arrow-left-short>
  </div>
</template>

<script>
export default {
  props: {
    goto: {
      type: String,
      default: "/"
    }
  },
  methods: {
    goBack: function() {
      this.$router.replace({ path: this.goto });
    }
  }
};
</script>

<style>
#back-button {
  position: fixed;
  z-index: 3;
  top: 6px;
  left: 6px;
  font-size: 3em;
  color: white;
  cursor: pointer;
}
</style>
