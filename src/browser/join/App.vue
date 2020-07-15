<template>
  <div id="app" style="height: 100vh">
    <div
      id="permissions-request-wrapper"
      class="d-flex align-items-center justify-content-center"
    >
      <div v-if="!urlError" class="p-3 wrapper">
        <h1>Grant permissions</h1>
        <p>
          Jelly-Party requires permissions to work on
          <span id="request-url" class="font-weight-bold">
            {{ simplifiedURL }}</span
          >. Click the below button to grant Jelly-Party permissions.
        </p>
        <p>
          You will have to do this <b>once</b> for every website you want to use
          Jelly-Party on.
        </p>
        <b-button
          block
          size="lg"
          class="mt-2"
          @click="askForPermissionsThenRedirect()"
          >Grant permissions now</b-button
        >
        <p class="mt-3">
          If you don't yet have Jelly Party installed, make sure to
          <b
            ><a
              href="https://chrome.google.com/webstore/detail/jelly-party/aiecbkandfgpphpdilbaaagnampmdgpd"
              >get it for free here</a
            >.</b
          >
        </p>
      </div>
      <div v-else class="p-3 wrapper">
        <h1>Uh-Oh</h1>
        <p>
          It looks like the link you received is broken. Sorry about this! If
          this problem persists, please contact us
          <a href="mailto:hi@jelly-party.com">via email</a> or let us know on
          our <a href="https://discord.gg/H3dExqc">Discord channel.</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { browser } from "webextension-polyfill-ts";

export default {
  name: "Join-App",
  data: function() {
    return {
      simplifiedURL: "this website",
      redirectURL: "",
      urlError: false,
      permissionScheme: "",
    };
  },
  mounted: function() {
    const jellyPartyId = decodeURIComponent(
      new URLSearchParams(window.location.search).get("jellyPartyId") ?? ""
    );
    const redirectURL = new URL(
      decodeURIComponent(
        new URLSearchParams(window.location.search).get("redirectURL") ?? ""
      )
    );
    redirectURL.searchParams.append("jellyPartyId", jellyPartyId);
    this.redirectURL = redirectURL.toString();
    this.simplifiedURL = redirectURL.host;
    this.permissionScheme = `${redirectURL.origin}/`;
    browser.permissions
      .contains({
        origins: [this.permissionScheme],
      })
      .then((hasPermission) => {
        if (hasPermission) {
          this.redirectToParty(this.redirectURL);
        } else {
          console.log("Jelly-Party: Must ask for permissions first");
        }
      });
  },
  methods: {
    askForPermissionsThenRedirect() {
      browser.permissions
        .request({
          origins: [this.permissionScheme],
        })
        .then((granted) => {
          if (granted) {
            this.redirectToParty(this.redirectURL);
            console.log("Jelly-Party: Permissions granted successfully");
          } else {
            console.log("Jelly-Party: Permissions not granted.");
          }
        })
        .catch((err) => {
          console.log(err);
        });
    },
    redirectToParty() {
      // We must ask the background script to redirect us to the party.
      const redirectFrame = {
        type: "redirectToParty",
        payload: {
          redirectURL: this.redirectURL,
        },
      };
      browser.runtime.sendMessage(JSON.stringify(redirectFrame));
    },
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin: 0 auto;
  background: linear-gradient(
    to bottom right,
    rgba(145, 100, 255, 0.2) 0%,
    rgba(139, 255, 244, 0.2) 100%
  );
}

#permissions-request-wrapper {
  height: 100%;
}

.wrapper {
  max-width: 30em;
}
</style>
