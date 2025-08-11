<script setup lang="ts">
import { useRoute } from "vue-router";

const route = useRoute();

function isActive(to: any) {
  return route.name === to.name;
}
</script>

<template>
      <div class="w-full py-6">
        This is the text that follows up the header
      </div>
</template>
