<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '@/store/game'
import type { IItem } from '@/game/types'

const game = useGameStore()
const tab = ref('道具')
const selected = ref('')
const selectedItem = computed(() =>
  game.save.items.find(i => i.id === selected.value && i.count > 0),
)
function select(item: IItem): void {
  selected.value = item.id
  if (item.kind !== '道具')
    game.open('item', item.id)
}
const tabs = ['道具', '装备', '道友', '法宝', '仙器', '神兵', '圣兽', '仙魂', '碎片']
const items = computed(() =>
  game.save.items.filter(i => i.count > 0 && (tab.value === '全部' || i.kind === tab.value)),
)
</script>

<template>
  <view class="module-page bag-scene">
    <view class="tab-strip bag-tabs">
      <button
        v-for="name in tabs"
        :key="name"
        :class="{ selected: tab === name }"
        @click="tab = name"
      >
        {{ name }}
      </button>
    </view>
    <view class="module-scroll bag-content">
      <view class="bag-caption">
        <text /><text>{{ tab === '道友' ? game.save.heroes.length : items.length }} / 200</text>
      </view>
      <view v-if="tab !== '道友'" class="bag-grid">
        <button
          v-for="item in items"
          :key="item.id"
          class="bag-item"
          :class="[`q${item.quality}`, { selected: selected === item.id }]"
          :aria-pressed="selected === item.id"
          @click="select(item)"
        >
          <view class="bag-item-cell">
            <text class="item-name">{{ item.name }}</text>
            <text class="item-count">×{{ item.count }}</text>
          </view>
        </button><view v-for="n in Math.max(0, 30 - items.length)" :key="`empty-${n}`" class="bag-empty">
          <view />
        </view>
      </view>
      <view v-else class="hero-bag-grid">
        <button
          v-for="h in game.save.heroes"
          :key="h.id"
          class="hero-chip"
          :class="[`q${h.quality}`]"
          @click="
            () => {
              game.selectedHero = h.id
              game.open('hero-detail', h.id)
            }
          "
        >
          {{ h.name
          }}<text>
            {{ game.save.formation.includes(h.id) ? '已上阵' : '未上阵' }} · {{ h.level }}级
          </text><text>碎片 {{ h.fragments }}</text>
        </button>
      </view>
      <view v-if="!items.length && tab !== '道友'" class="empty-state">
        包裹空空，前往探索寻觅机缘吧
      </view>
    </view>
    <view class="bag-footer source-bag-footer">
      <text class="source-bag-desc">{{ selectedItem?.description || '道具描述' }}</text><text v-if="selectedItem" class="source-bag-count">数量:{{ selectedItem.count }}</text><button
        v-if="selectedItem"
        class="source-bag-sell small-button"
        @click="game.operateItem(selectedItem!.id, 'sell')"
      >
        出售
      </button><button
        v-if="selectedItem"
        class="source-bag-use small-button"
        @click="game.operateItem(selectedItem!.id, 'use')"
      >
        使用
      </button><button
        v-if="tab === '装备'"
        class="source-bag-use small-button"
        @click="game.open('smelt')"
      >
        熔炼
      </button>
    </view>
  </view>
</template>
