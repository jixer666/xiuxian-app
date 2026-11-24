<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '@/store/game'
import HeroRosterScene from './HeroRosterScene.vue'
import HeroScene from './HeroScene.vue'

defineOptions({ name: 'HeroModuleScene' })

const game = useGameStore()
const view = ref<'roster' | 'detail'>('roster')

function openDetail(id: string): void {
  game.selectedHero = id
  view.value = 'detail'
}

function showRoster(): void {
  view.value = 'roster'
}
</script>

<template>
  <HeroRosterScene v-if="view === 'roster'" @detail="openDetail" />
  <HeroScene v-else @back="showRoster" />
</template>
