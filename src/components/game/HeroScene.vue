<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/store/game'
import { heroStats } from '@/game/engine'
import GameIcon from './GameIcon.vue'

const emit = defineEmits<{ back: [] }>()
const game = useGameStore()
const stats = computed(() => heroStats(game.hero, game.save))
const slots = ['武器', '衣服', '饰品', '鞋子']
function equipment(slot: string) {
  return game.save.items.find(i => i.slot === slot && i.equipped === game.hero.id)
}
</script>

<template>
  <view class="reference-hero-scene">
    <view class="reference-hero-tabs hero-detail-bar">
      <button class="hero-detail-back" aria-label="返回道友列表" @click="emit('back')">
        ‹ 道友列表
      </button>
      <view class="hero-detail-title">
        <text>{{ game.hero.name }}</text>
      </view>
    </view>
    <view class="reference-hero-scroll">
      <view class="reference-attributes reference-box">
        <view class="reference-section-title">
          角色属性
        </view>
        <button class="source-small detail-button" @click="game.open('hero-detail', game.hero.id)">
          人物详情
        </button>
        <button class="source-small more-button" @click="game.open('more-attrs')">
          更多属性
        </button>
        <view class="source-attribute-text">
          <text>攻击：{{ stats.attack }}</text><text>生命：{{ stats.hp }}</text><text>物防：{{ stats.defense }}</text><text>法防：{{ stats.defense }}</text>
        </view>
        <text class="source-upgrade-cost">
          消耗修为:{{ game.hero.level * 60 }}/{{ game.save.wallet.exp }}
        </text>
        <text class="source-success">成功率:100%</text><text class="source-loss">失败损失:0%</text>
        <button class="source-level-button" @click="game.levelHero(game.hero.id)">
          <view class="level-ink" /><text>渡劫</text>
        </button>
        <button class="source-pill-button" @click="game.open('breakthrough')">
          使用渡劫丹
        </button>
        <text class="source-pill-count">
          拥有渡劫丹:{{ game.save.items.find((i) => i.name === '渡劫丹')?.count || 0 }}
        </text>
      </view>
      <view class="reference-equipment reference-box">
        <view class="reference-section-title">
          装备配置
        </view><view class="source-equipment-row">
          <button
            v-for="slot in slots"
            :key="slot"
            @click="
              equipment(slot)
                ? game.open('item', equipment(slot)!.id)
                : game.open('equip-select', slot)
            "
          >
            <view class="source-item-circle">
              <GameIcon :name="equipment(slot)?.icon || 'sword'" :size="57" />
            </view><text :class="equipment(slot) ? `q${equipment(slot)?.quality}` : ''">
              {{ equipment(slot)?.name || '未装备' }}
            </text>
          </button>
        </view>
      </view>
      <view class="reference-magic reference-box">
        <view class="reference-section-title">
          法宝配置
        </view><view class="source-equipment-row">
          <button
            v-for="i in 4"
            :key="i"
            @click="
              i === 1 && equipment('法宝')
                ? game.open('item', equipment('法宝')!.id)
                : game.open('equip-select', '法宝')
            "
          >
            <text class="source-level-label">法宝1</text><view class="source-item-circle">
              <GameIcon
                :name="i === 1 ? equipment('法宝')?.icon || 'mirror' : 'mirror'"
                :size="57"
              />
            </view><text>{{ i === 1 ? equipment('法宝')?.name || '未装备' : '未装备' }}</text>
          </button>
        </view>
      </view>
    </view>
    <view class="source-hero-func">
      <button @click="game.open('cultivate', 'train')">
        培养
      </button><button @click="game.open('cultivate', 'stage')">
        进阶
      </button><button @click="game.open('cultivate', 'star')">
        升星
      </button><button @click="game.open('rebirth', game.hero.id)">
        重生
      </button>
    </view>
  </view>
</template>
