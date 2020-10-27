<template>
  <div id="jelly-party-header">
    <div class="d-flex justify-content-center align-items-center">
      <h3 id="jelly-party-heading-text" class="mr-2">
        {{ appName }}
      </h3>
      <img
        src="@/assets/images/logo-blue.png"
        width="32px"
        height="32px"
        class="d-inline-block"
      />
    </div>
    <div id="statusIcon">
      <span style="font-size: 0.7em">
        <b-icon-circle-fill
          v-if="optionsState.connectingToServer"
          v-b-tooltip.hover
          style="fill: yellow"
          animation="throb"
          :title="connectionString"
        ></b-icon-circle-fill>
        <b-icon-circle-fill
          v-else
          v-b-tooltip.hover
          :style="
            optionsState.connectedToServer ? 'fill: green;' : 'fill: red;'
          "
          :title="connectionString"
        ></b-icon-circle-fill>
      </span>
    </div>
  </div>
</template>

<script>
import { appState } from "../IFrame";

export default {
  name: "SidebarHeader",
  computed: {
    connectionString() {
      if (appState.RootState.connectingToServer) {
        return "Connecting to server";
      } else if (appState.RootState.connectedToServer) {
        return "Connected to server";
      } else {
        return "Disconnected";
      }
    },
    appName() {
      return process.env.VUE_APP_TITLE;
    },
    optionsState() {
      return appState.optionsState;
    },
  },
};
</script>

<style lang="scss">
#jelly-party-header {
  height: var(--jelly-party-header-height);
}
#jelly-party-heading-text {
  text-align: center;
  padding-top: 10px;
  color: white;
  display: "inline-block";
}
#statusIcon {
  position: absolute;
  left: 16px;
  top: 10px;
}
</style>
