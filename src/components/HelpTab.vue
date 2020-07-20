<template>
  <div>
    <b-container>
      <h3 class="text-white text-center">Q &amp; A</h3>
      <QA id="start-party-question">
        <template v-slot:question>How do I start a party?</template>
        <template v-slot:answer
          >Simply head to the "Party" tab and press "Start a new party".
        </template>
      </QA>
      <QA id="start-party-question">
        <template v-slot:question>How do I enable fullscreen?</template>
        <template v-slot:answer
          >Some websites have a very obtrusive full-screen handler. In this
          case, try toggling on fullscreen using the F11-key or the browser
          menu.
        </template>
      </QA>
      <QA id="join-party-magic-link-question">
        <template v-slot:question>How do I join using a magic link?</template>
        <template v-slot:answer
          >Simply open the magic link in a browser with Jelly-Party installed
          and you will automatically join the party. Note that Jelly-Party may
          ask you for additional permissions.
        </template>
      </QA>
      <QA id="join-party-manually-question">
        <template v-slot:question>How do I manually join a party?</template>
        <template v-slot:answer
          >Head to the video you want to watch and open Jelly-Party. Now type in
          the common Party-Id (you can either generate one by clicking on "Start
          a new party" or make one up yourself) and press "Join party manually
          by Id".
        </template>
      </QA>
      <QA id="when-join-party-manually-question">
        <template v-slot:question>When should I join manually?</template>
        <template v-slot:answer
          >Currently, there're two use-cases for joining a party manually:<br /><br />
          1. The website you're using Jelly-Party on doesn't support magic
          links:<br /><br />
          Some websites don't support magic links, and there's little that
          Jelly-Party can do about this. You'll have to rely on Jelly-Party's
          manual join feature here.<br /><br />
          2. You want to sync videos from different video streaming services:<br /><br />
          E.g. if one of you has a Netflix account and the other one a Prime
          account, you can still sync up videos using Jelly-Party's manual join
          feature.
        </template>
      </QA>
    </b-container>
    <b-container class="mt-3">
      <h3 class="text-white text-center">Support Jelly-Party</h3>
      <p class="text-justify">
        If you want to show your support, you can back me on Patreon. This will
        help cover the server costs and allow me to spend more time on improving
        Jelly-Party.
      </p>
      <PatreonButton />
    </b-container>
    <b-container class="mt-3">
      <h3 class="text-white text-center">More help</h3>
      <p class="text-justify">
        Join our
        <a target="_blank" href="https://discord.gg/H3dExqc">Discord channel</a>
        to get more help and browse our
        <a target="_blank" href="https://www.jelly-party.com/">website</a> to
        learn more about Jelly-Party.
      </p>
    </b-container>
    <b-container class="mt-3">
      <h3 class="text-white text-center">Open source software</h3>
      <p class="text-justify">
        Jelly-Party is powered by amazing open source software, notably
        <a target="_blank" href="https://nodejs.org/en/">nodejs</a>,
        <a target="_blank" href="https://vuejs.org/">vuejs</a>,
        <a target="_blank" href="https://bootstrap-vue.org/">Bootstrap</a>,
        <a target="_blank" href="https://fontawesome.com/">FontAwesome</a>,
        <a target="_blank" href="https://github.com/joaoeudes7/V-Emoji-Picker"
          >v-emoji-picker</a
        >,
        <a target="_blank" href="https://github.com/orgordin/vuejs-avataaars"
          >vuejs-avataaars</a
        >
        and much more!
      </p>
    </b-container>
  </div>
</template>

<script>
import QA from "@/components/QA.vue";
import PatreonButton from "@/components/PatreonButton.vue";
export default {
  components: {
    QA,
    PatreonButton,
  },
};
</script>

<style></style>
