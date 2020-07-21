<template>
  <div id="jellyPartyTabsContainer">
    <b-tabs
      nav-wrapper-class="no-border"
      class="mt-3"
      content-class="mt-3"
      justified
    >
      <b-tab title="Party" active><PartyTab /></b-tab>
      <b-tab title="Help"><HelpTab /></b-tab>
      <b-tab title="Customize"><SettingsTab /></b-tab>
    </b-tabs>
  </div>
</template>

<script>
import PartyTab from "@/components/PartyTab.vue";
import HelpTab from "@/components/HelpTab.vue";
import SettingsTab from "@/components/SettingsTab.vue";
export default {
  components: {
    PartyTab,
    HelpTab,
    SettingsTab,
  },
};
</script>

<style lang="scss">
#jellyPartyTabsContainer {
  flex-grow: 1;
  overflow: auto;
}
.tabs {
  height: calc(100% - 1em);
}

.nav.nav-tabs.nav-justified {
  height: 42px;
}

.tab-content {
  height: calc(100% - 42px - 1em);
}

.tab-pane.active {
  height: 100%;
}
</style>
