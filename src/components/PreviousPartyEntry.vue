<template>
  <div class="previous-party-wrapper">
    <p class="mb-0 font-weight-bold">drunken-sailors-ship-bananas</p>
    <p class="jelly-party-party-timestamp mb-0">8 Jul 2020 — 22:39</p>
    <p class="mb-1">lisa, mark & you.</p>
    <JellyPartyPrimaryButton>Rejoin party</JellyPartyPrimaryButton>
  </div>
</template>

<script>
import JellyPartyPrimaryButton from "@/components/JellyPartyPrimaryButton.vue";
export default {
  components: {
    JellyPartyPrimaryButton,
  },
};
</script>

<style lang="scss">
.jelly-party-party-timestamp {
  font-size: 12px;
}
.previous-party-wrapper {
  border-radius: 3em;
  background-color: $jellyPartyOrange;
  padding: 1.5em;
  margin: 1em;
  color: white;
}
</style>
