<template>
  <div>
    <button class="jelly-party-primary-button"><slot></slot></button>
  </div>
</template>

<script>
export default {};
</script>

<style lang="scss">
.jelly-party-primary-button {
  width: 100%;
  height: 40px;
  outline: none !important;
  border-radius: 50rem !important;
  border-width: 0px !important;
  color: white;
  background-color: $primaryButtonColor;
  transition: background-color 0.3s ease-out;
  &:hover {
    background-color: darken($primaryButtonColor, 10%);
  }
}
</style>
