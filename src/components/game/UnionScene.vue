<script setup lang="ts">
import { MOCK_UNIONS } from '@/api/mock'
import { useGameStore } from '@/store/game'

const game = useGameStore()
const cards = [
  { id: 'union-boss', name: '仙盟副本', art: 'experience-landscape' },
  { id: 'union-four', name: '仙盟四象', art: 'abode-landscape' },
  { id: 'union-war', name: '仙盟争锋', art: 'city-landscape' },
  { id: 'union-rank', name: '最强仙盟', art: 'landscape' },
]
</script>

<template>
  <view class="reference-union-scene">
    <template v-if="!game.save.union">
      <view class="reference-union-list">
        <view v-for="u in MOCK_UNIONS" :key="u.name" class="source-union-row">
          <view>
            <text>{{ u.name }}</text><text>等级:{{ u.level }} 人数:{{ u.members }}/30</text><text>仙盟公告：{{ u.motto }}</text>
          </view><button class="source-small" @click="game.joinUnion(u.name)">
            申请加入
          </button>
        </view>
      </view><button class="primary-button reference-create-union" @click="game.open('create-union')">
        创建仙盟
      </button>
    </template>
    <template v-else>
      <view class="reference-union-paper">
        <view class="union-info-lines">
          <text>仙盟名：{{ game.save.union }}</text><text>盟 主：清风道人</text><text>等 级：5</text><text>建设度：{{ 300 + game.save.unionExp }}/1000</text><text>成 员：29/30</text>
        </view><view class="reference-union-announcement">
          <text>仙盟公告</text><view>青云有路，携手长生。</view>
        </view><button class="small-button union-notice-edit" @click="game.open('union-notice')">
          修改
        </button>
      </view><view class="reference-union-management">
        <button
          v-for="(name, index) in ['仙盟日志', '查看成员', '入盟申请', '入盟设置', '发布招募']"
          :key="name"
          class="small-button"
          @click="
            game.open(
              ['union-log', 'union-members', 'union-apply', 'union-settings', 'union-recruit'][
                index
              ],
            )
          "
        >
          {{ name }}
        </button>
      </view><view class="reference-union-cards">
        <button
          v-for="card in cards"
          :key="card.id"
          :style="{ backgroundImage: `url(/static/game/${card.art}.svg)` }"
          @click="game.open(card.id)"
        >
          <text>{{ card.name }}</text>
        </button>
      </view><view class="reference-union-bottom">
        <button class="small-button" @click="game.open('union-list')">
          仙盟列表
        </button><button class="small-button" @click="game.open('union-donate')">
          仙盟建设
        </button><button class="small-button" @click="game.open('union-shop')">
          仙盟商店
        </button>
      </view>
    </template>
  </view>
</template>
