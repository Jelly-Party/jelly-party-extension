<template>
  <div>
    <div style="height: 81px"></div>
    <div class="brand-header w-100">
      <span
        id="close-button"
        class="font-weight-bold btn text-white p-0"
        style="font-size:1.3em; position: absolute; top: 6px; right: 6px"
        v-on:click="close"
        ><b-icon-x></b-icon-x
      ></span>
      <h3 class="text-white mt-0 mb-0 p-4 text-center font-weight-bold">
        {{ title }}
      </h3>
    </div>
  </div>
</template>

<style scoped>
.brand-header {
  background: linear-gradient(to bottom right, #ff9494 0%, #ee64f6 100%);
}
#close-button {
  transition: transform 0.2s ease-in-out;
}
#close-button:hover {
  transform: rotate(360deg);
}
</style>
<script>
export default {
  data: function() {
    return { title: process.env.VUE_APP_TITLE };
  },
  methods: {
    close: function() {
      window.close();
    }
  }
};
</script>

<style scoped>
.brand-header {
  position: fixed;
  top: 0;
}
</style>
