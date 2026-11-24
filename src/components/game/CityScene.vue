<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '@/store/game'

const game = useGameStore()
const pan = ref(-350)
const touchStart = ref(0)
const touchPan = ref(-350)
// CityMap1Skin is a 1500 × 1750 map, shown through the 750px H5 viewport.
const places = [
  { id: 'arena', name: '仙斗榜', x: 520, y: 330 },
  { id: 'cross', name: '仙灵争霸', x: 240, y: 330 },
  { id: 'ancient', name: '上古战场', x: 240, y: 540 },
  { id: 'friends', name: '结义', x: 240, y: 850 },
  { id: 'guide', name: '攻略', x: 520, y: 1110 },
  { id: 'shop', name: '坊市', x: 520, y: 820 },
  { id: 'rank', name: '排行', x: 790, y: 650 },
  { id: 'mail', name: '邮件', x: 790, y: 850 },
  { id: 'stone', name: '灵脉争夺', x: 1000, y: 330 },
  { id: 'union', name: '仙盟', x: 1000, y: 500 },
  { id: 'tianji', name: '天机阁', x: 1320, y: 760 },
  { id: 'codex', name: '图鉴', x: 1320, y: 980 },
]
function open(id: string): void {
  if (id === 'union') {
    game.changeModule('union')
    return
  }
  if (['stone', 'cross', 'ancient', 'tianji', 'arena'].includes(id))
    game.open('city-activity', id)
  else game.open(id)
}
function start(event: TouchEvent): void {
  touchStart.value = event.touches[0].clientX
  touchPan.value = pan.value
}
function move(event: TouchEvent): void {
  pan.value = Math.max(
    -750,
    Math.min(
      0,
      touchPan.value
      + ((event.touches[0].clientX - touchStart.value) * 750) / uni.getWindowInfo().windowWidth,
    ),
  )
}
</script>

<template>
  <view class="reference-city-scene" @touchstart="start" @touchmove.stop.prevent="move">
    <view class="reference-city-map" :style="{ left: `${pan}px` }">
      <button
        v-for="place in places"
        :key="place.id"
        class="ink-map-label"
        :style="{ left: `${place.x}px`, top: `${place.y}px` }"
        @click="open(place.id)"
      >
        {{ place.name }}
      </button>
    </view><button class="city-pan city-pan-left" @click="pan = Math.min(0, pan + 300)">
      ◀
    </button><button class="city-pan city-pan-right" @click="pan = Math.max(-750, pan - 300)">
      ▶
    </button>
  </view>
</template>
