<template>
  <div id="app">
    <Navbar />
    <div class="p-3">
      <router-view />
    </div>
  </div>
</template>

<script>
import Navbar from "./components/Navbar.vue";
import { getState } from "@/messaging.js";

export default {
  components: {
    Navbar,
  },
};
try {
  // Initially poll the state once and navigate accordingly
  // This will work if the content script is already injected,
  // otherwise it won't find a messaging port
  getState();
} catch {}
// Execute the content script. Nothing will happen, if we
// execute it again.
chrome.tabs.executeScript({
  file: "js/contentScript.js",
});

// Periodically poll the content script for the new state
window.setInterval(() => {
  console.log("Querying party state");
  getState();
}, 1000);
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  width: 350px;
  min-height: 427px;
  margin: 0 auto;
  background: linear-gradient(
    to bottom right,
    rgba(145, 100, 255, 0.2) 0%,
    rgba(139, 255, 244, 0.2) 100%
  );
}

.fullheight {
  height: 100vh;
  display: flex;
  align-items: center;
}

#nav {
  padding: 30px;
}

#nav a {
  font-weight: bold;
  color: #2c3e50;
}

#nav a.router-link-exact-active {
  color: #42b983;
}
</style>
