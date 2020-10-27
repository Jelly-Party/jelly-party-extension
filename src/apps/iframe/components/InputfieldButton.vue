<template>
  <b-input-group class="mt-3">
    <b-form-input size="lg" :placeholder="inputPlaceholder"></b-form-input>
    <b-input-group-append>
      <b-button size="lg" variant="secondary">{{ buttonText }}</b-button>
    </b-input-group-append>
  </b-input-group>
</template>

<script>
export default {
  name: "InputfieldButton",
  props: {
    buttonText: { type: String, default: "Button Text" },
    inputPlaceholder: { type: String, default: "Input Place Holder" },
  },
};
</script>
