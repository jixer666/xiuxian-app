<script setup lang="ts">
import { computed } from 'vue'
import type { IHero, IUnit } from '@/game/types'

const props = defineProps<{
  unit: IHero | IUnit
  active?: boolean
  selected?: boolean
  battle?: boolean
  damage?: number
  heal?: boolean
  attacking?: boolean
  impact?: boolean
  skill?: boolean
  effectKey?: number
  energyGain?: number
  absorbed?: number
  critical?: boolean
}>()
defineEmits<{ select: [] }>()

const hpPercent = computed(() => {
  const unit = props.unit
  return 'maxHp' in unit ? Math.max(0, Math.min(100, (unit.hp / unit.maxHp) * 100)) : 100
})
const energyPercent = computed(() => {
  const unit = props.unit
  return 'energy' in unit ? Math.max(0, Math.min(100, unit.energy)) : 0
})
const energyReady = computed(() => energyPercent.value >= 100)
const hpText = computed(() => {
  const unit = props.unit
  return 'maxHp' in unit ? `${Math.ceil(unit.hp)}/${Math.ceil(unit.maxHp)}` : ''
})
const energyGainText = computed(() => {
  if (!props.energyGain)
    return ''
  return props.energyGain > 0 ? `+${props.energyGain} 气` : '气尽'
})
const buffs = computed(() => 'buffs' in props.unit ? props.unit.buffs || [] : [])
const damageText = computed(() => {
  if (props.damage)
    return `${props.heal ? '+' : '−'}${props.damage}`
  if (props.absorbed)
    return `盾 −${props.absorbed}`
  return ''
})
const buffGlyph: Record<string, string> = {
  shield: '盾',
  attack: '攻',
  defense: '御',
  reduce: '减',
  crit: '暴',
  silence: '默',
}
</script>

<template>
  <button
    class="hero-plate"
    :class="[
      `q${unit.quality}`,
      {
        'active': active,
        'chosen': selected,
        'fallen': hpPercent <= 0,
        'attacking': attacking,
        'impact': impact,
        'skill-release': attacking && skill,
        'energy-ready': energyReady,
      },
    ]"
    :aria-label="unit.name"
    @click="$emit('select')"
  >
    <view v-if="unit.main" class="main-tag">
      主
    </view>
    <view v-if="attacking" class="attack-effect" aria-hidden="true">
      <view class="attack-streak streak-one" />
      <view class="attack-streak streak-two" />
      <view class="attack-glow" />
    </view>
    <view class="plate-frame">
      <view class="plate-ink-wash" aria-hidden="true" />
      <view class="plate-name">
        {{ unit.name }}
      </view>
      <view class="plate-realm">
        {{ unit.role }} · 炼气{{ unit.level }}阶
      </view>
      <view class="plate-bars">
        <view class="hp-bar">
          <view class="hp-fill" :style="{ width: `${hpPercent}%` }" />
          <view class="bar-glint" />
          <text v-if="hpText" class="hp-value">{{ hpText }}</text>
        </view>
        <view
          v-if="battle"
          class="mp-bar"
          :class="{ ready: energyReady, charging: (energyGain || 0) > 0 }"
        >
          <view class="mp-fill" :style="{ width: `${energyPercent}%` }">
            <view class="energy-shimmer" />
          </view>
          <text v-if="energyReady" class="energy-ready-mark">满</text>
        </view>
      </view>
    </view>
    <view v-if="attacking && skill" class="spell-charge" aria-hidden="true">
      <view v-for="n in 6" :key="n" class="spell-rune" :style="{ '--rune-index': n }" />
    </view>
    <view v-if="attacking && skill" class="skill-cast-aura" aria-hidden="true">
      <view class="skill-cast-ring ring-one" />
      <view class="skill-cast-ring ring-two" />
      <view class="skill-cast-core" />
    </view>
    <view v-if="buffs.length" class="buff-strip">
      <view
        v-for="buff in buffs"
        :key="buff.id"
        class="buff-chip"
        :class="`buff-${buff.kind}`"
        :title="`${buff.name} ${buff.turns}回合`"
      >
        {{ buffGlyph[buff.kind] }}{{ buff.turns }}
      </view>
    </view>
    <view v-if="impact" :key="`impact-${effectKey}`" class="impact-effect" aria-hidden="true">
      <view class="impact-flash" />
      <view v-for="n in 8" :key="n" class="impact-spark" :style="{ '--spark-index': n }" />
    </view>
    <view
      v-if="damageText"
      :key="`damage-${effectKey}-${damage}-${absorbed}`"
      class="floating-number"
      :class="{ healing: heal, critical, shielded: !damage && absorbed }"
    >
      {{ damageText }}<text v-if="critical" class="critical-mark">暴击</text>
    </view>
    <view v-if="energyGainText" :key="`energy-${effectKey}`" class="energy-gain">
      {{ energyGainText }}
    </view>
    <view v-if="hpPercent <= 0" class="fallen-label">
      败
    </view>
  </button>
</template>
