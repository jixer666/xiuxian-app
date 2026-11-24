<script setup lang="ts">
defineProps<{ name: string, size?: number }>()
</script>

<template>
  <image
    class="game-icon"
    :src="`/static/game/${name}.svg`"
    :style="size ? { width: `${size}px`, height: `${size}px` } : {}"
    mode="aspectFit"
  />
</template>
