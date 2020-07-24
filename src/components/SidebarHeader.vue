<template>
  <div id="jelly-party-header">
    <div class="d-flex justify-content-center align-items-center">
      <h3 id="jelly-party-heading-text" class="mr-2">Jelly-Party</h3>
      <img
        src="@/assets/logo-blue.png"
        width="32px"
        height="32px"
        class="d-inline-block"
      />
    </div>
    <div id="statusIcon">
      <span style="font-size: 0.7em">
        <b-icon-circle-fill
          v-if="this.connectingToServer"
          style="fill: yellow"
          animation="throb"
          v-b-tooltip.hover
          :title="connectionString"
        ></b-icon-circle-fill>
        <b-icon-circle-fill
          v-else
          :style="this.connectedToServer ? 'fill: green;' : 'fill: red;'"
          v-b-tooltip.hover
          :title="connectionString"
        ></b-icon-circle-fill>
      </span>
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";

export default {
  name: "SidebarHeader",
  data: function() {
    return {};
  },
  computed: {
    connectionString() {
      if (this.connectingToServer) {
        return "Connecting to server";
      } else if (this.connectedToServer) {
        return "Connected to server";
      } else {
        return "Disconnected";
      }
    },
    ...mapState([
      "sideBarMinimized",
      "connectedToServer",
      "connectingToServer",
    ]),
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
  right: 10px;
  top: 5px;
}
</style>
