<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '@/store/game'
import GameIcon from './GameIcon.vue'

type ProfessionId = '剑修' | '刀修' | '枪修' | '体修'
interface IProfession {
  glyph: string
  title: string
  tagline: string
  skill: string
  text: string
  normal: string
  ultimate: string
  focus: string
}

const game = useGameStore()
const name = ref(game.save.name)
const sex = ref('男')
const camp = ref<ProfessionId>('剑修')
const professionIds: ProfessionId[] = ['剑修', '刀修', '枪修', '体修']
const camps: Record<ProfessionId, IProfession> = {
  剑修: {
    glyph: '剑',
    title: '青锋剑客',
    tagline: '御剑 · 攻守',
    skill: '青云剑诀',
    text: '凡心向道，剑问长生。以剑入道，身法轻灵，攻守兼备。',
    normal: '御剑破敌，凝气为刃。',
    ultimate: '万剑归宗，剑意长鸣。',
    focus: '均衡 · 爆发',
  },
  刀修: {
    glyph: '刀',
    title: '断岳刀客',
    tagline: '狂刀 · 破阵',
    skill: '断岳刀诀',
    text: '一刀断岳，势若奔雷。以刚猛刀势破阵，愈战愈勇。',
    normal: '横刀斩月，裂石开山。',
    ultimate: '九幽断岳，刀气纵横。',
    focus: '强攻 · 破防',
  },
  枪修: {
    glyph: '枪',
    title: '游龙枪客',
    tagline: '游龙 · 连击',
    skill: '游龙枪诀',
    text: '枪出如龙，穿云裂空。以迅捷枪势封锁敌手，连击不止。',
    normal: '寒星点点，穿云破空。',
    ultimate: '游龙惊海，千枪归一。',
    focus: '速度 · 连击',
  },
  体修: {
    glyph: '体',
    title: '不灭体修',
    tagline: '炼体 · 守御',
    skill: '玄罡炼体诀',
    text: '以身为炉，淬炼筋骨。气血绵长，守如山岳，愈战愈坚。',
    normal: '拳撼山河，罡气护身。',
    ultimate: '不灭金身，万法不侵。',
    focus: '生存 · 反击',
  },
}
function randomName(): void {
  const surnames = ['云', '顾', '沈', '陆', '苏', '宁', '白', '叶']
  const names
    = sex.value === '男'
      ? ['无涯', '长风', '玄策', '知远', '青尘']
      : ['映雪', '清音', '知秋', '月璃', '灵溪']
  name.value
    = surnames[Math.floor(Math.random() * surnames.length)]
      + names[Math.floor(Math.random() * names.length)]
}
function create(): void {
  if (game.create(name.value, sex.value, camp.value)) {
    game.save.heroes[0].skill = camps[camp.value].skill
    game.save.heroes[0].role = camp.value
  }
}
</script>

<template>
  <view
    class="entry-scene reference-entry"
    :class="{ 'reference-create': game.screen === 'create' }"
  >
    <template v-if="game.screen === 'server'">
      <text class="entry-version">v1.0.0</text><button class="reference-entry-notice" @click="game.open('notice')">
        <GameIcon name="scroll" :size="48" /><text>公告</text>
      </button><view class="age-stamp" role="note" aria-label="16岁以上适龄提示">
        <view class="age-stamp-rating">
          <text>16</text><text>+</text>
        </view>
        <view class="age-stamp-copy">
          <text>适龄提示</text><text>健康游戏</text>
        </view>
      </view><view class="source-entry-logo">
        封天神魔
      </view><view class="source-server-actions">
        <button class="source-server-select" @click="game.open('servers')">
          <text class="server-gold-diamond">◆</text><text>{{ game.save.server }}区</text><text>修仙{{ game.save.server }}服</text><text class="server-status">畅</text><text class="server-click">[点击选取]</text>
        </button>
      </view><button class="source-entry-start" @click="game.enter()">
        点击开始
      </button><view class="source-entry-footer">
        健康游戏忠告<br>抵制不良游戏 拒绝盗版游戏 注意自我保护 谨防受骗上当<br>适度游戏益脑
        沉迷游戏伤身 合理安排时间 享受健康生活
      </view>
    </template>
    <view v-else class="source-create-frame">
      <view class="create-header">
        <button class="create-back" @click="game.screen = 'server'">
          ‹ 返回
        </button>
        <text class="create-header-title">创建角色</text>
      </view>

      <view class="source-create-card">
        <view class="create-section">
          <view class="create-section-head">
            <text class="create-section-title">选择流派</text>
            <text class="create-section-hint">四道殊途，皆可问长生</text>
          </view>
          <view class="source-camp-seals" role="radiogroup" aria-label="选择修行之道">
            <button
              v-for="id in professionIds"
              :key="id"
              class="camp-seal"
              :class="{ selected: camp === id }"
              role="radio"
              :aria-checked="camp === id"
              @click="camp = id"
            >
              <text class="camp-seal-glyph">{{ camps[id].glyph }}</text>
              <text class="camp-seal-name">{{ id }}</text>
            </button>
          </view>
        </view>

        <view class="create-profession-summary">
          <view class="create-profession-head">
            <text class="create-profession-title">{{ camps[camp].title }}</text>
            <text class="create-profession-focus">{{ camps[camp].focus }}</text>
          </view>
          <text class="create-profession-description">{{ camps[camp].text }}</text>
          <view class="create-skill-list">
            <view class="create-skill-row">
              <text>普通技</text><text>{{ camps[camp].normal }}</text>
            </view>
            <view class="create-skill-row">
              <text>怒气技</text><text>{{ camps[camp].ultimate }}</text>
            </view>
            <view class="create-skill-row">
              <text>本命功法</text><text>{{ camps[camp].skill }}</text>
            </view>
          </view>
        </view>

        <view class="create-section create-identity">
          <view class="create-section-head">
            <text class="create-section-title">道号与身份</text>
            <text class="create-section-hint">2～5 位中文、字母或数字</text>
          </view>
          <view class="source-create-bottom">
            <button :class="{ selected: sex === '男' }" aria-label="选择男性角色" @click="sex = '男'">
              师兄
            </button>
            <view class="source-name-field">
              <input v-model="name" maxlength="5" aria-label="道号" placeholder="请输入道号">
              <button class="source-random-name" aria-label="随机道号" @click="randomName">
                <GameIcon name="scroll" :size="42" />
              </button>
            </view>
            <button :class="{ selected: sex === '女' }" aria-label="选择女性角色" @click="sex = '女'">
              师妹
            </button>
          </view>
        </view>

        <button class="source-create-start" @click="create">
          开始修仙
        </button>
      </view>
    </view>
  </view>
</template>
