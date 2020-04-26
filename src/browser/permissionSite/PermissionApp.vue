<template>
  <div id="app" style="height: 100vh">
    <div
      id="permissions-request-wrapper"
      class="d-flex align-items-center justify-content-center"
    >
      <div class="p-3" style="max-width:30em">
        <h1>Grant permissions</h1>
        <p>
          Jelly-Party requires permissions to work on
          <span id="request-url" class="font-weight-bold">this website</span>.
          Click the below button to grant Jelly-Party permissions.
        </p>
        <p>
          You will have to do this <b>once</b> for every website you want to use
          Jelly-Party on.
        </p>
        <b-button block size="lg" class="mt-2" @click="grantPermissions"
          >Grant permissions now</b-button
        >
      </div>
    </div>
  </div>
</template>

<script>
var url, permissionURL, simplifiedURL;
export default {
  name: "PermissionsApp",
  mounted: function() {
    url = window.location.href.match(/\?jellyPartyUrl=(.+)/)[1];
    permissionURL = url.match(/https?:\/\/.+\//)[0];
    simplifiedURL = permissionURL.match(/https?:\/\/(.+)\//)[1];
    document.getElementById("request-url").innerText = simplifiedURL;
  },
  methods: {
    grantPermissions: function() {
      chrome.permissions.request(
        {
          origins: [permissionURL],
        },
        function(granted) {
          if (granted) {
            console.log(
              "Jelly-Party: Permission granted. Redirecting. Content script will now be inserted automatically, since permissions have been granted."
            );
            window.location.href = url;
          } else {
            console.log("Jelly-Party: Permission not granted.");
          }
        }
      );
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
</style>
