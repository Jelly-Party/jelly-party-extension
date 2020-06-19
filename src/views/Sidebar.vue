<template>
  <div id="wrapper">
    <SidebarHeader />
    <Tabs />
  </div>
</template>

<script>
import SidebarHeader from "@/components/SidebarHeader.vue";
import Tabs from "@/views/Tabs.vue";

export default {
  name: "SideBar",
  components: {
    SidebarHeader,
    Tabs,
  },
};
</script>

<style></style>
