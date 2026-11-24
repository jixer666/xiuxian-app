<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { QUALITY } from '@/game/data'
import { useGameStore } from '@/store/game'

type DragKind = 'roster' | 'formation'

interface IDragSource {
  kind: DragKind
  heroId: string
  index: number
}

interface IDragCandidate {
  source: IDragSource
  startX: number
  startY: number
  lastX: number
  lastY: number
}

const emit = defineEmits<{ detail: [id: string] }>()
const game = useGameStore()
const dragging = ref(false)
const dragSource = ref<IDragSource | null>(null)
const dragPoint = ref({ x: 0, y: 0 })
const dragOverSlot = ref(-1)
const overRoster = ref(false)
const deployed = computed(() => new Set(game.save.formation.filter((id): id is string => Boolean(id))))
const dragHero = computed(() => game.save.heroes.find(hero => hero.id === dragSource.value?.heroId))
const dragHeroId = computed(() => dragSource.value?.heroId || '')

let candidate: IDragCandidate | null = null
let dragMode: 'mouse' | 'touch' | '' = ''
let touchTimer: ReturnType<typeof setTimeout> | undefined
let suppressTimer: ReturnType<typeof setTimeout> | undefined
let suppressClick = false

function isDeployed(id: string): boolean {
  return deployed.value.has(id)
}

function suppressNextClick(): void {
  suppressClick = true
  clearTimeout(suppressTimer)
  suppressTimer = setTimeout(() => {
    suppressClick = false
  }, 280)
}

function openDetail(id: string): void {
  if (suppressClick)
    return
  game.selectedHero = id
  emit('detail', id)
}

function getSceneElement(): HTMLElement | null {
  // #ifdef H5
  return document.querySelector<HTMLElement>('.hero-roster-scene')
  // #endif
  return null
}

function sourceFromTarget(target: EventTarget | null): IDragSource | null {
  const element = target instanceof Element ? target : null
  if (!element || element.closest('.hero-formation-slot__remove'))
    return null
  const card = element.closest<HTMLElement>('.hero-roster-card')
  if (card?.dataset.heroId)
    return { kind: 'roster', heroId: card.dataset.heroId, index: -1 }
  const slot = element.closest<HTMLElement>('[data-formation-slot]')
  const index = Number(slot?.dataset.formationSlot)
  if (slot && Number.isInteger(index)) {
    const hero = game.team[index]
    if (hero)
      return { kind: 'formation', heroId: hero.id, index }
  }
  return null
}

function slotAtPoint(clientX: number, clientY: number): number {
  let index = -1
  // #ifdef H5
  const target = document.elementFromPoint(clientX, clientY)
  const slot = target instanceof Element ? target.closest<HTMLElement>('[data-formation-slot]') : null
  const value = Number(slot?.dataset.formationSlot)
  if (Number.isInteger(value) && value >= 0 && value < 6)
    index = value
  // #endif
  return index
}

function pointOverRoster(clientX: number, clientY: number): boolean {
  // #ifdef H5
  return Boolean(document.elementFromPoint(clientX, clientY)?.closest('.hero-roster-panel'))
  // #endif
  return false
}

function updateDragPosition(clientX: number, clientY: number): void {
  const rect = getSceneElement()?.getBoundingClientRect()
  if (!rect?.width)
    return
  const scale = rect.width / 750
  dragPoint.value = {
    x: (clientX - rect.left) / scale,
    y: (clientY - rect.top) / scale,
  }
  dragOverSlot.value = slotAtPoint(clientX, clientY)
  overRoster.value = dragOverSlot.value < 0 && pointOverRoster(clientX, clientY)
}

function beginDrag(source: IDragSource, clientX: number, clientY: number): void {
  dragging.value = true
  dragSource.value = source
  updateDragPosition(clientX, clientY)
}

function resetDrag(): void {
  dragging.value = false
  dragSource.value = null
  dragOverSlot.value = -1
  overRoster.value = false
}

function finishDrag(clientX: number, clientY: number): void {
  const source = dragSource.value
  if (source) {
    const slot = slotAtPoint(clientX, clientY)
    if (slot >= 0) {
      if (source.kind === 'formation') {
        if (source.index !== slot)
          game.swapSlots(source.index, slot)
      }
      else {
        game.deploy(source.heroId, slot)
      }
    }
    else if (source.kind === 'formation' && pointOverRoster(clientX, clientY)) {
      game.undeploy(source.heroId)
    }
  }
  suppressNextClick()
  resetDrag()
}

function clearCandidate(): void {
  candidate = null
  dragMode = ''
  clearTimeout(touchTimer)
  touchTimer = undefined
}

function onPointerDown(event: PointerEvent): void {
  if (event.pointerType !== 'mouse' || event.button !== 0)
    return
  const source = sourceFromTarget(event.target)
  if (!source)
    return
  dragMode = 'mouse'
  candidate = {
    source,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
  }
}

function onPointerMove(event: PointerEvent): void {
  if (dragMode !== 'mouse' || !candidate)
    return
  candidate.lastX = event.clientX
  candidate.lastY = event.clientY
  if (!dragging.value) {
    if (Math.hypot(event.clientX - candidate.startX, event.clientY - candidate.startY) < 5)
      return
    beginDrag(candidate.source, event.clientX, event.clientY)
  }
  event.preventDefault()
  updateDragPosition(event.clientX, event.clientY)
}

function onPointerUp(event: PointerEvent): void {
  if (dragMode !== 'mouse' || !candidate)
    return
  if (dragging.value)
    finishDrag(event.clientX, event.clientY)
  clearCandidate()
}

function onPointerCancel(): void {
  if (dragMode !== 'mouse')
    return
  resetDrag()
  clearCandidate()
}

function onTouchStart(event: TouchEvent): void {
  if (event.touches.length !== 1)
    return
  const source = sourceFromTarget(event.target)
  if (!source)
    return
  const touch = event.touches[0]
  dragMode = 'touch'
  candidate = {
    source,
    startX: touch.clientX,
    startY: touch.clientY,
    lastX: touch.clientX,
    lastY: touch.clientY,
  }
  clearTimeout(touchTimer)
  touchTimer = setTimeout(() => {
    if (!candidate || dragMode !== 'touch')
      return
    beginDrag(candidate.source, candidate.lastX, candidate.lastY)
  }, 180)
}

function onTouchMove(event: TouchEvent): void {
  if (dragMode !== 'touch' || !candidate || event.touches.length !== 1)
    return
  const touch = event.touches[0]
  candidate.lastX = touch.clientX
  candidate.lastY = touch.clientY
  if (!dragging.value) {
    if (Math.hypot(touch.clientX - candidate.startX, touch.clientY - candidate.startY) > 9)
      clearCandidate()
    return
  }
  event.preventDefault()
  updateDragPosition(touch.clientX, touch.clientY)
}

function onTouchEnd(event: TouchEvent): void {
  if (dragMode !== 'touch' || !candidate)
    return
  clearTimeout(touchTimer)
  if (dragging.value) {
    const touch = event.changedTouches[0]
    finishDrag(touch.clientX, touch.clientY)
  }
  clearCandidate()
}

function onTouchCancel(): void {
  if (dragMode !== 'touch')
    return
  resetDrag()
  clearCandidate()
}

function onDocumentClick(event: MouseEvent): void {
  if (!suppressClick)
    return
  event.preventDefault()
  event.stopPropagation()
}

function clickSlot(index: number): void {
  if (suppressClick)
    return
  const hero = game.team[index]
  if (hero) {
    openDetail(hero.id)
    return
  }
  game.notify('按住下方道友拖到此处即可上阵')
}

function removeFromFormation(index: number, event: Event): void {
  event.stopPropagation()
  const hero = game.team[index]
  if (hero)
    game.undeploy(hero.id)
}

onMounted(() => {
  // #ifdef H5
  document.addEventListener('pointerdown', onPointerDown, true)
  document.addEventListener('pointermove', onPointerMove, true)
  document.addEventListener('pointerup', onPointerUp, true)
  document.addEventListener('pointercancel', onPointerCancel, true)
  document.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
  document.addEventListener('touchmove', onTouchMove, { capture: true, passive: false })
  document.addEventListener('touchend', onTouchEnd, true)
  document.addEventListener('touchcancel', onTouchCancel, true)
  document.addEventListener('click', onDocumentClick, true)
  // #endif
})

onUnmounted(() => {
  // #ifdef H5
  document.removeEventListener('pointerdown', onPointerDown, true)
  document.removeEventListener('pointermove', onPointerMove, true)
  document.removeEventListener('pointerup', onPointerUp, true)
  document.removeEventListener('pointercancel', onPointerCancel, true)
  document.removeEventListener('touchstart', onTouchStart, true)
  document.removeEventListener('touchmove', onTouchMove, true)
  document.removeEventListener('touchend', onTouchEnd, true)
  document.removeEventListener('touchcancel', onTouchCancel, true)
  document.removeEventListener('click', onDocumentClick, true)
  // #endif
  clearTimeout(touchTimer)
  clearTimeout(suppressTimer)
})
</script>

<template>
  <view class="hero-roster-scene">
    <view class="hero-formation-panel">
      <view class="hero-formation-panel__head">
        <text>阵容 · 2 × 3</text>
        <text>{{ game.save.formation.filter(Boolean).length }} / 6 已上阵</text>
      </view>
      <view class="hero-formation-grid">
        <view
          v-for="(hero, index) in game.team"
          :key="index"
          class="hero-formation-slot"
          :class="{
            'hero-formation-slot--empty': !hero,
            'hero-formation-slot--over': dragOverSlot === index,
            'hero-formation-slot--source': dragSource?.kind === 'formation' && dragSource.index === index,
          }"
          :data-formation-slot="index"
          :aria-label="hero ? `${hero.name}，阵位 ${index + 1}，可拖动换位` : `空阵位 ${index + 1}，拖入道友上阵`"
          @click="clickSlot(index)"
        >
          <text class="hero-formation-slot__index">
            {{ index + 1 }}
          </text>
          <template v-if="hero">
            <button
              v-if="!hero.main"
              class="hero-formation-slot__remove"
              aria-label="下阵"
              @click="removeFromFormation(index, $event)"
            >
              下阵
            </button>
            <text v-else class="hero-formation-slot__main">
              主角
            </text>
            <text class="hero-formation-slot__name" :class="`q${hero.quality}`">
              {{ hero.name }}
            </text>
            <text class="hero-formation-slot__meta">
              {{ hero.level }}级
            </text>
          </template>
          <template v-else>
            <text class="hero-formation-slot__plus">
              ＋
            </text>
            <text class="hero-formation-slot__empty-text">
              拖入道友
            </text>
          </template>
        </view>
      </view>
    </view>

    <view class="hero-roster-panel" :class="{ 'hero-roster-panel--over': overRoster }">
      <view class="hero-roster-panel__head">
        <text>全部道友</text>
        <text>按住拖动上阵 · 点击详情</text>
      </view>
      <view class="hero-roster-list">
        <view class="hero-roster-grid">
          <button
            v-for="hero in game.save.heroes"
            :key="hero.id"
            class="hero-roster-card"
            :class="[
              `q${hero.quality}`,
              {
                'hero-roster-card--deployed': isDeployed(hero.id),
                'hero-roster-card--dragging': dragHeroId === hero.id,
              },
            ]"
            :data-hero-id="hero.id"
            :aria-label="`${hero.name}，${QUALITY[hero.quality]}，${hero.level}级，点击查看详情`"
            @click="openDetail(hero.id)"
          >
            <text v-if="isDeployed(hero.id)" class="hero-roster-card__badge">
              {{ hero.main ? '主' : '阵' }}
            </text>
            <text class="hero-roster-card__name">
              {{ hero.name }}
            </text>
            <text class="hero-roster-card__level">
              {{ hero.level }}级
            </text>
          </button>
        </view>
      </view>
    </view>

    <view
      v-if="dragging && dragHero"
      class="hero-drag-follow"
      :class="`q${dragHero.quality}`"
      :style="{ left: `${dragPoint.x}px`, top: `${dragPoint.y}px` }"
    >
      <text class="hero-drag-follow__name">
        {{ dragHero.name }}
      </text>
      <text class="hero-drag-follow__level">
        {{ dragHero.level }}级
      </text>
    </view>
  </view>
</template>
