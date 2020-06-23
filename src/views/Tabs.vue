<template>
  <div>
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

<style></style>
