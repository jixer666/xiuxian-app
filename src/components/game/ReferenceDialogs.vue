<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '@/store/game'
import { heroStats } from '@/game/engine'
import { QUALITY } from '@/game/data'
import GameIcon from './GameIcon.vue'
import SourceBuildingScene from './SourceBuildingScene.vue'

const game = useGameStore()
const selected = ref(-1)
const code = ref('')
const skip = ref(false)
const stats = computed(() => heroStats(game.hero, game.save))
const availableHeroes = computed(() =>
  game.save.heroes.filter(hero => !game.save.formation.includes(hero.id)),
)
function clickSlot(index: number): void {
  const hero = game.team[index]
  if (hero) {
    selected.value = -1
    game.undeploy(hero.id)
    return
  }
  selected.value = selected.value === index ? -1 : index
}
function deploySelected(id: string): void {
  if (selected.value < 0)
    return
  game.deploy(id, selected.value)
  selected.value = -1
}
function time(seconds: number): string {
  return `${Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0')}:${Math.floor((seconds / 60) % 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
function changeHero(id: string): void {
  game.selectedHero = id
  game.close()
}
</script>

<template>
  <view
    class="reference-dialog-mask"
    :class="{ 'lineup-mask': game.panel === 'formation' }"
    role="dialog"
    aria-modal="true"
    :aria-label="game.panel"
    @click.self="game.close()"
  >
    <SourceBuildingScene v-if="game.panel === 'building-page'" />
    <template v-else-if="game.panel === 'formation'">
      <view class="game-panel lineup-panel">
        <view class="panel-heading">
          <view class="heading-ornament" /><text>阵容</text><view class="heading-ornament" />
          <button class="close-button" aria-label="关闭阵容" @click="game.close()">
            ×
          </button>
        </view>
        <view class="panel-body lineup-body">
          <view class="lineup-intro">
            <text>点击道友下阵，点击空阵位上阵</text>
            <text class="lineup-count">2 × 3 · {{ game.save.formation.filter(Boolean).length }}/6</text>
          </view>
          <view class="lineup-grid">
            <button
              v-for="(hero, index) in game.team"
              :key="index"
              class="lineup-cell"
              :class="{ 'lineup-cell--empty': !hero }"
              :aria-label="hero ? `${hero.name}，点击下阵` : `阵位 ${index + 1}，点击上阵`"
              @click="clickSlot(index)"
            >
              <text class="lineup-cell__slot">{{ index + 1 }}</text>
              <template v-if="hero">
                <text class="lineup-cell__action" :class="{ 'lineup-cell__action--main': hero.main }">
                  {{ hero.main ? '主角' : '下阵' }}
                </text>
                <GameIcon :name="hero.role === '医修' ? 'lotus' : 'person'" :size="58" />
                <text class="lineup-cell__name" :class="`q${hero.quality}`">{{ hero.name }}</text>
                <text class="lineup-cell__meta">{{ hero.role }} · {{ hero.level }}阶</text>
              </template>
              <template v-else>
                <text class="lineup-cell__plus">＋</text>
                <text class="lineup-cell__empty-text">点击上阵</text>
              </template>
            </button>
          </view>
          <view v-if="selected >= 0" class="lineup-picker">
            <view class="lineup-picker__head">
              <text>选择道友上阵 · 阵位 {{ selected + 1 }}</text>
              <button aria-label="取消选择" @click="selected = -1">
                取消
              </button>
            </view>
            <view class="lineup-picker__list">
              <button
                v-for="h in availableHeroes"
                :key="h.id"
                class="lineup-picker__item"
                @click="deploySelected(h.id)"
              >
                <GameIcon name="person" :size="44" /><view>
                  <text :class="`q${h.quality}`">{{ h.name }}</text><text>{{ QUALITY[h.quality] }} · {{ h.level }}阶</text>
                </view>
              </button>
              <view v-if="!availableHeroes.length" class="lineup-picker__empty">
                暂无未上阵道友
              </view>
            </view>
          </view>
          <button class="primary-button lineup-done" @click="game.close()">
            完成
          </button>
        </view>
      </view>
    </template>
    <template v-else-if="game.panel === 'formation-select' || game.panel === 'hero-select'">
      <view class="source-select-hero">
        <view class="reference-section-title">
          选择道友
        </view><button
          v-for="h in game.save.heroes"
          :key="h.id"
          class="source-select-row"
          @click="
            game.panel === 'formation-select'
              ? (game.deploy(h.id, Number(game.detailId)), game.open('formation'))
              : changeHero(h.id)
          "
        >
          <GameIcon name="person" :size="55" /><text :class="`q${h.quality}`">{{ h.name }}</text><text>{{ QUALITY[h.quality] }} · {{ h.level }}阶</text><text>{{ game.save.formation.includes(h.id) ? '已上阵' : '上阵' }}</text>
        </button><button class="paper-button centered" @click="game.open('formation')">
          返回
        </button>
      </view>
    </template>
    <template v-else-if="game.panel === 'recruit'">
      <view class="source-recruit">
        <view class="summon-cloud-field" /><button
          class="source-recruit-close close-button"
          aria-label="关闭招募"
          @click="game.close()"
        >
          ×
        </button>
        <button class="source-recruit-exchange" @click="game.open('recruit-exchange')">
          <GameIcon name="gift" :size="90" /><text>英雄兑换</text><text>{{ game.save.summon }}/100</text>
        </button>
        <view class="source-summon-altar">
          <view class="altar-circle altar-circle-1" /><view
            class="altar-circle altar-circle-2"
          /><view class="altar-circle altar-circle-3" /><text>道</text>
        </view>
        <button class="source-hero-preview" @click="game.open('codex')">
          <GameIcon name="person" :size="65" /><text>预览</text>
        </button><button class="source-hero-probability" @click="game.open('recruit-probability')">
          <GameIcon name="scroll" :size="65" /><text>概率</text>
        </button>
        <view class="source-recruit-tips">
          招募道友，携手修仙
        </view><button class="source-summon-skip" @click="skip = !skip">
          <view class="check-box">
            {{ skip ? '✓' : '' }}
          </view><text>跳过动画</text>
        </button>
        <view class="source-recruit-buttons">
          <button @click="game.summon('普通', 1)">
            <view class="summon-ink" /><text>招募一次</text><text>消耗:仙玉招募令×1</text>
          </button><button @click="game.summon('普通', 10)">
            <view class="summon-ink" /><text>招募十次</text><text>消耗:仙玉招募令×10</text>
          </button>
        </view>
      </view>
    </template>
    <template v-else-if="game.panel === 'idle'">
      <view class="source-offline-panel">
        <view class="source-offline-title">
          离线修炼
        </view><view class="source-offline-time">
          <text>累计未领取时长: {{ time(game.idleSeconds) }}</text><text>累计未领取最长: 12小时</text><text>当前离线时间为: {{ time(game.idleSeconds) }}</text><text>离线最长可累计: 12小时</text>
        </view><view class="source-offline-rewards">
          <view>
            <GameIcon name="coin" :size="70" /><text>铜贝</text><text>{{ game.idleReward.coin }}</text>
          </view><view>
            <GameIcon name="lotus" :size="70" /><text>修为</text><text>{{ game.idleReward.exp }}</text>
          </view><view><GameIcon name="person" :size="70" /><text>道具</text><text>0</text></view>
        </view><button class="source-offline-free small-button" @click="game.claimIdle()">
          免费
        </button><button class="source-offline-double small-button" @click="game.claimIdle(2)">
          双倍领取
        </button><button class="source-offline-max small-button" @click="game.claimIdle(5)">
          5倍领取
        </button><text class="source-offline-cost cost-double">消耗:500仙玉</text><text class="source-offline-cost cost-max">消耗:500仙玉</text>
      </view>
    </template>
    <template v-else-if="game.panel === 'settings'">
      <view class="source-settings">
        <view class="source-settings-title">
          设置
        </view><button
          class="source-settings-sound small-button"
          @click="
            () => {
              game.save.sound = !game.save.sound
              game.notify(game.save.sound ? '声音：开' : '声音：关')
            }
          "
        >
          声音：{{ game.save.sound ? '开' : '关' }}
        </button><button class="source-settings-account small-button" @click="game.leave()">
          切换帐号
        </button><button class="source-settings-redeem small-button" @click="game.open('redeem')">
          兑换激活码
        </button><text class="source-settings-id">id:100001</text>
      </view><button class="reference-empty-close settings-close" @click="game.close()">
        点击空白处关闭
      </button>
    </template>
    <template v-else-if="game.panel === 'redeem'">
      <view class="source-redeem">
        <input
          v-model="code"
          maxlength="20"
          placeholder="输入或粘贴激活码"
          aria-label="激活码"
        ><button class="small-button" @click="game.redeem(code)">
          确认
        </button>
      </view>
    </template>
    <template v-else-if="game.panel === 'hero-detail'">
      <view class="source-hero-detail">
        <view class="source-hero-detail-title">
          人物详情
        </view><text class="source-hero-detail-name" :class="`q${game.hero.quality}`">
          {{ game.hero.name }}({{ game.realm }})
        </text><view class="source-hero-description">
          {{ game.hero.description }}
        </view><text class="source-hero-detail-hint">通过渡劫提升境界等级</text><view class="source-hero-detail-stats">
          <text>攻击:{{ stats.attack }}</text><text>生命:{{ stats.hp }}</text><text>物防:{{ stats.defense }}</text><text>法防:{{ stats.defense }}</text>
        </view><view class="source-hero-skill">
          <view>{{ game.hero.skill }}</view><view>
            {{
              game.hero.role === '医修'
                ? game.hero.skillDescription || '恢复己方气血最低道友的生命，恢复量为攻击力的240%。'
                : game.hero.skillDescription || '攻击敌方单位，造成攻击力230%的伤害。'
            }}
          </view><view class="source-skill-secondary">
            天赋 · {{ game.hero.role }}之道
          </view><view>星级加成 {{ game.hero.star }} · 进阶加成 {{ game.hero.stage }}</view>
        </view><view class="source-detail-buttons">
          <button class="small-button" @click="game.open('hero-select')">
            更换
          </button><button class="small-button" @click="game.open('rebirth', game.hero.id)">
            重生
          </button><button class="small-button" @click="game.open('cultivate', 'train')">
            培养
          </button><button class="small-button" @click="game.levelHero(game.hero.id)">
            渡劫
          </button>
        </view>
      </view><button class="reference-empty-close hero-detail-close" @click="game.close()">
        点击空白处关闭
      </button>
    </template>
  </view>
</template>
