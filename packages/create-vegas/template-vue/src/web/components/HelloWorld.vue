<script setup lang="ts">
import { ref } from "vue";

const count = ref(0);
</script>

<template>
  <section>
    <div>Get started</div>
    <p>Edit <code>src/App.vue</code> and save to test the blazing fast <code>FBR</code></p>
    <button @click="count++">Count is {{ count }}</button>
  </section>
</template>
