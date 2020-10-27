<template>
  <b-container class="qa-collapse text-center">
    <b-button v-b-toggle="id" class="m-1"
      ><slot name="question">Question</slot></b-button
    >

    <!-- Element to collapse -->
    <b-collapse :id="id">
      <b-card><slot name="answer">Answer</slot></b-card>
    </b-collapse>
  </b-container>
</template>

<script>
export default {
  props: { id: { type: String, default: "No question defined.." } },
};
</script>

<style lang="scss">
.qa-collapse {
  color: black;
  text-align: justify;
}
</style>
