<template>
  <div id="app">
    <h1>
      Jelly-Party
      <img
        src="@/assets/logo-blue.png"
        width="32px"
        height="32px"
        class="d-inline-block"
      />
    </h1>
    <p>
      Jelly-Party will load in a Sidebar. For more information about
      Jelly-Party, please visit our
      <a target="_blank" href="https://www.jelly-party.com/"> website</a>.
    </p>
  </div>
</template>

<script>
export default {}
</script>

<style lang="scss">
$primaryButtonColor: #9164ff;
$jellyPartyOrange: #ff9494;
body {
  margin: 0;
  font-size: 16px;
}

h1 {
  padding: 0;
  margin: 0 0 0.5em 0;
}

p {
  margin: 0;
  text-align: justify;
}

a {
  text-decoration: none;
  color: $primaryButtonColor;
  &:visited {
    color: $primaryButtonColor;
  }
  &:hover {
    color: $primaryButtonColor;
  }
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: white;
  width: 250px;
  margin: 0 auto;
  padding: 2em;
  background: black;
}
</style>
