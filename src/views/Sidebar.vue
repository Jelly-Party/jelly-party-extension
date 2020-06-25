<template>
  <div id="wrapper" :class="{ darkMode: darkMode }">
    <SidebarHeader />
    <Tabs />
  </div>
</template>

<script>
import SidebarHeader from "@/components/SidebarHeader.vue";
import Tabs from "@/views/Tabs.vue";
import { mapState } from "vuex";

export default {
  name: "SideBar",
  components: {
    SidebarHeader,
    Tabs,
  },
  computed: mapState("options", ["darkMode"]),
  mounted: function() {
    this.$store.dispatch("options/populateOptionsStateFromChromeLocalStorage");
  },
};
</script>

<style></style>
