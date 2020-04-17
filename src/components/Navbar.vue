<template>
  <h3 class="text-white mt-0 p-4 text-center font-weight-bold brand-header">
    {{ title }}
  </h3>
</template>

<style scoped>
.brand-header {
  background: linear-gradient(to bottom right, #ff9494 0%, #ee64f6 100%);
}
</style>
<script>
export default {
  data: function() {
    return { title: process.env.VUE_APP_TITLE };
  }
};
</script>
