<template>
  <div>
    <b-container>
      <h3 class="text-white text-center">Q &amp; A</h3>
      <QA id="start-party-question">
        <template v-slot:question>How do I start a party?</template>
        <template v-slot:answer
          >Simply to the "Party" tab and press "Start a new party".
        </template>
      </QA>
      <QA id="join-party-magic-link-question">
        <template v-slot:question>How do I join using a magic link?</template>
        <template v-slot:answer
          >Simply open the magic link in a browser with Jelly-Party installed
          and you will automatically join the party.
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
      <p>
        If you want to show your support, you can back me on Patreon. This will
        help cover the server costs and allow me to spend more time on improving
        Jelly-Party.
      </p>
      <PatreonButton />
    </b-container>
    <b-container class="mt-3">
      <h3 class="text-white text-center">About Jelly-Party</h3>
      <p class="text-justify">
        Jelly-Party syncs video playback between a group of people. If you want
        to watch Netflix, Disney+, Youtube and many
        <a href="https://www.jelly-party.com/">other sites</a> <b>together</b>,
        Jelly-Party is for you.<br /><br />
        You click pause, and the video pauses for everybody. Somebody clicks
        play, and the video plays for everybody. Leave the cumbersome "3—2—1—GO"
        behind!
      </p>
    </b-container>
    <b-container class="mt-3 pb-3">
      <h3 class="text-white text-center">More help</h3>
      <p>
        Join our <a href="https://discord.gg/H3dExqc">Discord channel</a> to get
        more help and browse our
        <a href="https://www.jelly-party.com/">website</a> to learn more about
        Jelly-Party.
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
