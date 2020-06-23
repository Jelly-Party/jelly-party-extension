<template>
  <div id="wrapper" :class="{ darkMode: options.darkMode }">
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
  computed: mapState(["options"]),
  mounted: function() {
    this.$store.dispatch("populateOptionsStateFromChromeLocalStorage");
  },
};
</script>

<style></style>
