<script setup lang="ts">
import { useGameStore } from '@/store/game'
import GameIcon from './GameIcon.vue'

const game = useGameStore()
function enterBuilding(id: string): void {
  game.open('building-page', id)
}
const anchors = [
  { id: 'library', x: 64, y: 70, width: 150, height: 154 },
  { id: 'spirit', x: 285, y: 10, width: 150, height: 154 },
  { id: 'field', x: 510, y: 70, width: 150, height: 154 },
  { id: 'alchemy', x: 14, y: 330, width: 150, height: 154 },
  { id: 'forge', x: 560, y: 330, width: 150, height: 154 },
  { id: 'adventure', x: 285, y: 550, width: 150, height: 154 },
]
</script>

<template>
  <view class="reference-abode-map">
    <view class="reference-abode-content">
      <view class="reference-abode-info">
        <text>仙龄:十八</text><text>灵气 {{ game.save.wallet.energy }}</text><text>灵液 {{ game.save.wallet.liquid }}</text><button @click="game.open('abode-help')">
          ？
        </button>
      </view><view class="reference-house-group">
        <button
          v-for="a in anchors"
          :key="a.id"
          class="reference-house"
          :style="{
            left: `${a.x}px`,
            top: `${a.y}px`,
            width: `${a.width}px`,
            height: `${a.height}px`,
          }"
          @click="enterBuilding(a.id)"
        >
          <GameIcon
            :name="game.save.buildings.find((b) => b.id === a.id)!.icon"
            :size="65"
          /><text>{{ game.save.buildings.find((b) => b.id === a.id)!.name }}</text><text class="reference-house-level">
            {{ game.save.buildings.find((b) => b.id === a.id)!.level }}级
          </text>
        </button>
      </view>
    </view>
  </view>
</template>
