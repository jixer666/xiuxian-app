<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useGameStore } from '@/store/game'
import HeroPlate from './HeroPlate.vue'

const game = useGameStore()
const fighting = computed(() => game.battle.status !== 'idle')
const shaking = ref(false)
let shakeTimer: ReturnType<typeof setTimeout> | undefined
let impactTimer: ReturnType<typeof setTimeout> | undefined

const motionDuration = computed(() => `${Math.max(170, Math.round((game.battle.event?.skill ? 680 : 560) / game.speed))}ms`)
const impactDelay = computed(() => `${Math.max(70, Math.round((game.battle.event?.skill ? 300 : 210) / game.speed))}ms`)
const enemySlots = [[45, 146], [276, 146], [507, 146], [45, 0], [276, 0], [507, 0]] as const
const allySlots = [[45, 432], [276, 432], [507, 432], [45, 578], [276, 578], [507, 578]] as const

const actor = computed(() => {
  const id = game.battle.event?.actor
  return [...game.battle.allies, ...game.battle.enemies].find(unit => unit.id === id)
})
const effectLabel = computed(() => {
  const event = game.battle.event
  if (!event)
    return ''
  if (!event.skill)
    return '出手'
  return event.text.match(/「(.+?)」/)?.[1] || actor.value?.skill || '神通'
})
const effectKind = computed(() => game.battle.event?.skillLabel || (game.battle.event?.skill ? '怒气技能' : '普通攻击'))
const hitCount = computed(() => game.battle.event?.hits.length || 0)

watch(
  () => game.battle.turn,
  () => {
    const event = game.battle.event
    if (!event || !fighting.value)
      return
    const shouldShake = event.skill || event.amount >= 650
    if (!shouldShake)
      return
    shaking.value = false
    clearTimeout(shakeTimer)
    clearTimeout(impactTimer)
    impactTimer = setTimeout(() => {
      requestAnimationFrame(() => {
        shaking.value = true
        shakeTimer = setTimeout(() => {
          shaking.value = false
        }, event.skill ? 420 : 260)
      })
    }, Number.parseInt(impactDelay.value))
  },
)
onUnmounted(() => {
  clearTimeout(shakeTimer)
  clearTimeout(impactTimer)
})

onMounted(() => {
  if (game.module === 'battle' && game.battle.status === 'idle')
    game.startMobBattle()
})

function toggleAuto(): void {
  if (game.save.chapter <= 35) {
    game.notify('通关第35关后开启自动挑战')
    return
  }
  game.auto = !game.auto
  if (game.auto && !fighting.value)
    game.startBossBattle()
}
function slotOf(unit: { position?: number }, index: number, enemy: boolean): number {
  const raw = unit.position ?? (enemy ? index + 1 : index)
  return Math.max(0, Math.min(5, enemy ? raw - 1 : raw))
}
function pointOf(unit: { position?: number }, index: number, enemy: boolean): readonly [number, number] {
  return (enemy ? enemySlots : allySlots)[slotOf(unit, index, enemy)]
}
function targetPoint(id: string): readonly [number, number] | null {
  const allyIndex = game.battle.allies.findIndex(unit => unit.id === id)
  if (allyIndex >= 0)
    return pointOf(game.battle.allies[allyIndex], allyIndex, false)
  const enemyIndex = game.battle.enemies.findIndex(unit => unit.id === id)
  if (enemyIndex >= 0)
    return pointOf(game.battle.enemies[enemyIndex], enemyIndex, true)
  return null
}
function unitStyle(unit: { id: string, position?: number }, index: number, enemy: boolean): Record<string, string> {
  const [left, top] = pointOf(unit, index, enemy)
  const style: Record<string, string> = { left: `${left}px`, top: `${top}px` }
  const event = game.battle.event
  if (event && event.actor === unit.id) {
    const target = targetPoint(event.target)
    style['--attack-x'] = target ? `${target[0] - left}px` : '0px'
    style['--attack-y'] = target ? `${target[1] - top}px` : '0px'
  }
  return style
}
function isAttacking(id: string): boolean {
  return game.battle.active === id
}
function hitFor(id: string): { amount: number, absorbed?: number, critical?: boolean } | undefined {
  return game.battle.event?.hits.find(hit => hit.target === id)
}
function isImpact(id: string): boolean {
  return Boolean(hitFor(id))
}
function energyGain(id: string): number {
  const event = game.battle.event
  if (!event || event.actor !== id)
    return 0
  return event.energyAfter - event.energyBefore
}
function inspectHero(id: string): void {
  game.selectedHero = id
  game.open('hero-detail', id)
}
</script>

<template>
  <view class="reference-battle-scene" :class="{ 'in-combat': fighting }">
    <button
      class="reference-pass-reward"
      :class="{ 'battle-title-banner': fighting }"
      @click="game.open('pass-reward')"
    >
      <text>{{ fighting ? game.battle.title : '通关奖励' }}</text><view class="ink-tail" />
    </button>
    <template v-if="fighting">
      <view class="battle-paper-mist" aria-hidden="true" />
      <view
        class="reference-battlefield"
        :class="{ 'shake': shaking, 'skill-active': game.battle.event?.skill, 'aoe-active': hitCount > 1 }"
        :style="{ '--motion-duration': motionDuration, '--impact-delay': impactDelay }"
      >
        <HeroPlate
          v-for="(unit, index) in game.battle.enemies"
          :key="unit.id"
          class="reference-unit enemy-unit"
          :style="unitStyle(unit, index, true)"
          :unit="unit"
          battle
          :active="game.battle.active === unit.id"
          :attacking="isAttacking(unit.id)"
          :impact="isImpact(unit.id)"
          :skill="game.battle.event?.skill"
          :effect-key="game.battle.turn"
          :damage="hitFor(unit.id)?.amount || 0"
          :absorbed="hitFor(unit.id)?.absorbed"
          :critical="hitFor(unit.id)?.critical"
          :heal="game.battle.event?.heal"
          :energy-gain="energyGain(unit.id)"
          @select="game.open('enemy', unit.id)"
        />
        <HeroPlate
          v-for="(unit, index) in game.battle.allies"
          :key="unit.id"
          class="reference-unit ally-unit"
          :style="unitStyle(unit, index, false)"
          :unit="unit"
          battle
          :active="game.battle.active === unit.id"
          :attacking="isAttacking(unit.id)"
          :impact="isImpact(unit.id)"
          :skill="game.battle.event?.skill"
          :effect-key="game.battle.turn"
          :damage="isImpact(unit.id) ? game.battle.event?.amount : 0"
          :heal="game.battle.event?.heal"
          :energy-gain="energyGain(unit.id)"
          @select="inspectHero(unit.id)"
        />
        <view
          v-if="game.battle.event"
          :key="`skill-${game.battle.turn}`"
          class="reference-skill-banner"
          :class="{ ultimate: game.battle.event.skill }"
        >
          <view class="skill-banner-ink" aria-hidden="true" />
          <text class="skill-banner-kind">{{ effectKind }}</text>
          <text class="skill-banner-name">{{ effectLabel }}</text>
          <text class="skill-banner-actor">{{ actor?.name }}<template v-if="hitCount > 1"> · {{ hitCount }}段</template></text>
        </view>
      </view>
      <view v-if="game.battle.source !== 'mob'" class="reference-battle-footer">
        <view class="reference-round-chip">
          <text>{{ game.battle.round }}</text><text>/20</text>
        </view>
        <view class="reference-combat-tools">
          <button @click="game.open('battle-log')">
            统计
          </button><button @click="game.speed = game.speed === 4 ? 1 : game.speed * 2">
            {{ game.speed }}倍速
          </button><button @click="game.skipBattle()">
            跳过
          </button><button @click="game.open('retreat')">
            返回
          </button>
        </view>
      </view>
      <view v-if="shaking" class="battle-impact-flash" aria-hidden="true" />
    </template>
    <view v-if="game.battle.source === 'mob'" class="reference-main-controls combat-action-controls">
      <button class="reference-challenge" @click="game.startBossBattle()">
        <view class="challenge-brush" /><text>挑战</text>
      </button>
      <button class="reference-auto" :aria-pressed="game.auto" @click="toggleAuto">
        <view class="check-box" :class="{ checked: game.auto }">
          {{ game.auto ? '✓' : '' }}
        </view><text>自动挑战</text>
      </button>
      <view class="reference-auto-dots" :class="{ on: game.auto }">
        ◆━◆━◆
      </view>
    </view>
  </view>
</template>
