<script setup lang="ts">
import { useGameStore } from '@/store/game'

const game = useGameStore()
// CarbonSkin.contentGrp: 750 × 1084, verticalCenter -125.
const entrances = [
  { id: 'ascend', name: '登仙台', x: 92, bottom: 844 },
  { id: 'relic', name: '远古遗迹', x: 461, bottom: 800 },
  { id: 'wander', name: '云游', x: 647, bottom: 718 },
  { id: 'arena', name: '夺天之争', x: 71, bottom: 564 },
  { id: 'trial', name: '神魔试炼', x: 323, bottom: 592 },
  { id: 'invasion', name: '魔神降临', x: 545, bottom: 470 },
  { id: 'boss', name: '魔王来袭', x: 689, bottom: 348 },
  { id: 'material', name: '日常副本', x: 117, bottom: 344 },
  { id: 'holy', name: '圣兽境地', x: 307, bottom: 274 },
  { id: 'veins', name: '经脉谷', x: 65, bottom: 30 },
  { id: 'tower', name: '镇妖塔', x: 573, bottom: 56 },
]
</script>

<template>
  <view class="reference-experience-map">
    <view class="reference-carbon-content">
      <button
        v-for="entry in entrances"
        :key="entry.id"
        class="ink-map-label"
        :style="{ left: `${entry.x - 23}px`, bottom: `${entry.bottom}px` }"
        @click="game.open('activity', entry.id)"
      >
        {{ entry.name }}
      </button>
    </view>
  </view>
</template>
