<template>
  <b-container>
    <div class="jelly-party-infobox" style="overflow: hidden;">
      <div class="jelly-party-minibox text-white">
        <p class="m-0" style="white-space: nowrap">{{ heading }}</p>
      </div>
      <span id="magicLinkSpan">{{
        showSuccessText ? `${heading} copied.` : text
      }}</span>
      <div class="p-1">
        <svg
          :data-clipboard-text="text"
          width="16"
          height="16"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          focusable="false"
          data-prefix="far"
          data-icon="copy"
          class="copy-button"
          role="img"
          viewBox="0 0 448 512"
          @click="showConfirmation"
        >
          <path
            fill="currentColor"
            d="M433.941 65.941l-51.882-51.882A48 48 0 0 0 348.118 0H176c-26.51 0-48 21.49-48 48v48H48c-26.51 0-48 21.49-48 48v320c0 26.51 21.49 48 48 48h224c26.51 0 48-21.49 48-48v-48h80c26.51 0 48-21.49 48-48V99.882a48 48 0 0 0-14.059-33.941zM266 464H54a6 6 0 0 1-6-6V150a6 6 0 0 1 6-6h74v224c0 26.51 21.49 48 48 48h96v42a6 6 0 0 1-6 6zm128-96H182a6 6 0 0 1-6-6V54a6 6 0 0 1 6-6h106v88c0 13.255 10.745 24 24 24h88v202a6 6 0 0 1-6 6zm6-256h-64V48h9.632c1.591 0 3.117.632 4.243 1.757l48.368 48.368a6 6 0 0 1 1.757 4.243V112z"
          />
        </svg>
      </div>
      <div class="p-1">
        <b-icon v-b-tooltip.hover icon="question-circle-fill" :title="tooltip">
        </b-icon>
      </div>
    </div>
  </b-container>
</template>

<script>
export default {
  props: {
    heading: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    tooltip: {
      type: String,
      required: true,
    },
  },
  data: function() {
    return {
      showSuccessText: false,
    };
  },
  methods: {
    showConfirmation() {
      this.showSuccessText = true;
      setTimeout(() => {
        this.showSuccessText = false;
      }, 1000);
    },
  },
};
</script>

<style lang="scss">
.copy-button {
  cursor: pointer;
  transition: all 0.5s ease;
  &:hover {
    color: darken(white, 10%);
  }
}
.jelly-party-minibox {
  background-color: $primaryButtonColor;
  padding: 0.3em 0.6em;
  height: 100%;
  border-radius: 1em;
  white-space: nowrap;
}
.jelly-party-infobox {
  border-radius: 1em;
  height: 2.5em;
  background-color: $jellyPartyOrange;
  width: 100%;
  padding: 0.3em 0.6em;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

#magicLinkSpan {
  white-space: nowrap;
  overflow-x: scroll;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  width: 150px;
  margin: 0em 0.5em;
  height: 70px;
  position: relative;
  top: 25px;
}
</style>
