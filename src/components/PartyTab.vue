<template>
  <div class="h-100">
    <div
      v-if="!store.state.connectingToServer && !store.state.connectedToServer"
    >
      <b-container>
        <h3 class="text-white text-center">Getting started</h3>
        <p class="text-justify">
          To begin with, please make sure that all your friends have
          <a target="_blank" href="https://www.jelly-party.com/">Jelly-Party</a>
          installed. Then follow these simple steps:
        </p>
        <ol>
          <li>Customize your avatar and name yourself.</li>
          <li>Press <b>"Start a new party"</b> below.</li>
          <li>Share your magic link.</li>
        </ol>
        <p>
          For more help and to learn about joining manually, please visit the
          help tab above.
        </p>
      </b-container>
      <hr style="background-color: white;" class="my-4" />
      <StarNewPartyComponent />
      <hr style="background-color: white;" class="my-4" />
      <JoinPartyByIdComponent />
    </div>
  </div>
</template>

<script>
import store from "@/store/store";
import JoinPartyByIdComponent from "@/components/JoinPartyByIdComponent.vue";
import StarNewPartyComponent from "@/components/StartNewPartyComponent.vue";

export default {
  components: {
    StarNewPartyComponent,
    JoinPartyByIdComponent,
  },
  data: function() {
    return {
      store,
    };
  },
};
</script>

<style lang="scss">
.nav-tabs .nav-link:hover,
.nav-tabs .nav-link:focus {
  border: none;
}
</style>
