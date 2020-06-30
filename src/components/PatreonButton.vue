<template>
  <a href="https://patreon.com/jellyparty" target="_blank">
    <div
      id="patreon-button"
      class="d-flex align-items-center justify-content-center"
    >
      <svg
        viewBox="0 0 569 546"
        xmlns="http://www.w3.org/2000/svg"
        width="18px"
        height="18px"
        fill="white"
        class="mr-2"
      >
        <g>
          <circle
            id="Oval"
            cx="362.589996"
            cy="204.589996"
            data-fill="1"
            r="204.589996"
          ></circle>
          <rect
            id="Rectangle"
            fill="#002b49"
            data-fill="2"
            height="545.799988"
            width="100"
            x="0"
            y="0"
          ></rect>
        </g>
      </svg>
      Support Jelly-Party on Patreon
    </div>
  </a>
</template>

<script>
export default {};
</script>

<style lang="scss">
#patreon-button {
  height: 40px;
  border-radius: 20px;
  background-color: #f86753;
  color: white;
  font-family: sans-serif;
  font-size: 14px;
  overflow: hidden;
  padding: 0 20px 0 10px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 100ms ease;
  border: 2px solid transparent;
  font-weight: bold;
  margin: 1em;
}

#patreon-button:hover {
  border: 2px solid white;
}
</style>
