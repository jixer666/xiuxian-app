<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { MODULES } from '@/game/data'
import { useGameStore } from '@/store/game'
import { useHorizontalDragScroll } from '@/hooks/useHorizontalDragScroll'
import GameIcon from '@/components/game/GameIcon.vue'
import EntryScene from '@/components/game/EntryScene.vue'
import BattleScene from '@/components/game/BattleScene.vue'
import HeroModuleScene from '@/components/game/HeroModuleScene.vue'
import BagScene from '@/components/game/BagScene.vue'
import AbodeScene from '@/components/game/AbodeScene.vue'
import ExperienceScene from '@/components/game/ExperienceScene.vue'
import UnionScene from '@/components/game/UnionScene.vue'
import WelfareScene from '@/components/game/WelfareScene.vue'
import CityScene from '@/components/game/CityScene.vue'
import GamePanels from '@/components/game/GamePanels.vue'

definePage({
  type: 'home',
  style: { navigationStyle: 'custom', navigationBarTitleText: '封天神魔' },
})

const game = useGameStore()
useHorizontalDragScroll()
const scale = ref(0.5)
const stageHeight = ref(1334)
let clockTimer: ReturnType<typeof setInterval>
let battleTimer: ReturnType<typeof setInterval>
let elapsed = 0
const shellStyle = computed(() => ({
  width: `${750 * scale.value}px`,
  height: `${stageHeight.value * scale.value}px`,
}))
const stageStyle = computed(() => ({
  'height': `${stageHeight.value}px`,
  'transform': `scale(${scale.value})`,
  '--reference-gap': `${(stageHeight.value - 1310) / 4}px`,
}))
const chatText = computed(() => game.save.chats.at(-1))
function resize(): void {
  const info = uni.getWindowInfo()
  let viewportWidth = info.windowWidth
  let viewportHeight = info.windowHeight
  // #ifdef H5
  viewportWidth = document.documentElement.clientWidth
  viewportHeight = document.documentElement.clientHeight
  // #endif
  const width = Math.min(viewportWidth, (viewportHeight * 750) / 1334, 750)
  scale.value = width / 750
  stageHeight.value = viewportHeight / scale.value
}
onMounted(() => {
  resize()
  game.restore()
  uni.onWindowResize(resize)
  // #ifdef H5
  window.addEventListener('resize', resize)
  // #endif
  clockTimer = setInterval(() => game.tick(), 1000)
  battleTimer = setInterval(() => {
    elapsed += 100
    if (elapsed >= 760 / game.speed) {
      elapsed = 0
      game.step()
    }
  }, 100)
})
onUnmounted(() => {
  clearInterval(clockTimer)
  clearInterval(battleTimer)
  uni.offWindowResize(resize)
  // #ifdef H5
  window.removeEventListener('resize', resize)
  // #endif
})
function compact(n: number): string {
  return n >= 1000000 ? `${(n / 10000).toFixed(1)}万` : n.toLocaleString()
}
</script>

<template>
  <view class="desktop-backdrop">
    <view class="game-shell" :style="shellStyle">
      <view class="game-stage landscape" :style="stageStyle">
        <EntryScene v-if="game.screen !== 'game'" />
        <template v-else>
          <view class="top-bar">
            <button class="player-block" @click="game.open('settings')">
              <view>{{ game.save.name }}</view><text>{{ game.realm }}</text>
            </button>
            <view
              v-for="r in [
                { id: 'exp', label: '修为', icon: 'lotus' },
                { id: 'coin', label: '铜贝', icon: 'coin' },
                { id: 'jade', label: '仙玉', icon: 'jade' },
              ] as const"
              :key="r.id"
              class="top-resource"
            >
              <GameIcon :name="r.icon" :size="32" /><view>
                <text>{{ compact(game.save.wallet[r.id]) }}</text><text class="top-resource-label">{{ r.label }}</text>
              </view>
            </view>
          </view>
          <view class="scene-container">
            <BattleScene v-if="game.module === 'battle'" />
            <HeroModuleScene v-else-if="game.module === 'hero'" />
            <BagScene v-else-if="game.module === 'bag'" />
            <AbodeScene v-else-if="game.module === 'abode'" />
            <ExperienceScene v-else-if="game.module === 'experience'" />
            <UnionScene v-else-if="game.module === 'union'" />
            <WelfareScene v-else-if="game.module === 'welfare'" />
            <CityScene v-else />
          </view>
          <button class="chat-ticker" @click="game.open('chat')">
            <GameIcon name="chat" :size="29" /><text class="chat-channel">
              [{{ chatText?.channel || '世界' }}]
            </text><text class="ticker-message">{{ chatText?.name }}：{{ chatText?.text }}</text><text class="chat-expand">›</text>
          </button>
          <view class="bottom-nav">
            <button
              v-for="m in MODULES"
              :key="m.id"
              class="nav-item"
              :class="[{ 'selected': game.module === m.id || (m.id === 'city' && game.module === 'union'), 'nav-featured': m.featured }]"
              @click="game.changeModule(m.id)"
            >
              <view class="nav-icon">
                <GameIcon :name="m.icon" :size="49" />
              </view><text>{{ m.label }}</text><view v-if="m.id === 'welfare' && !game.claimed('login-1')" class="red-dot" />
            </button>
          </view>
          <view class="bottom-exp">
            <view
              :style="{
                width: `${Math.min(100, (game.save.heroes[0].level / (20 + game.save.realm * 20)) * 100)}%`,
              }"
            />
          </view>
        </template>
        <GamePanels />
        <view v-if="game.toast" class="toast-message" role="status">
          {{ game.toast }}
        </view>
      </view>
    </view>
  </view>
</template>
