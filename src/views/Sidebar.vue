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

<style lang="scss">
@import url("https://fonts.googleapis.com/css2?family=Roboto&display=swap");

:root {
  --jelly-party-sidebar-width: 350px;
}
html {
  --scrollbarBG: #cfd8dc;
  --thumbBG: #90a4ae;
}
body::-webkit-scrollbar {
  width: 11px;
}
body {
  color: white !important;
  margin: 0;
  scrollbar-width: thin;
  scrollbar-color: var(--thumbBG) var(--scrollbarBG);
  font-family: "Roboto", sans-serif;
  text-align: justify;
  box-sizing: border-box !important;
}
body::-webkit-scrollbar-track {
  background: var(--scrollbarBG);
}
body::-webkit-scrollbar-thumb {
  background-color: var(--thumbBG);
  border-radius: 6px;
  border: 3px solid var(--scrollbarBG);
}

#wrapper {
  background: linear-gradient(
    to right bottom,
    rgb(255, 148, 148) 0%,
    rgb(238, 100, 246) 100%
  );
  min-height: 100vh;
  transition: background-color 300ms ease;
  display: flex;
  flex-direction: column;
  margin-left: auto; // for displaying chrome-extension://...
}

.darkMode {
  background: black !important;
}

a {
  text-decoration: none !important;
}

:focus {
  outline: none !important;
}

.nav-tabs .nav-link {
  border: none;
  color: white;
}
</style>
