<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { IItem, Resource } from '@/game/types'
import { HERO_POOL, ITEM_TEMPLATES, QUALITY, REALMS, RESOURCES } from '@/game/data'
import { heroStats, makeBattle, power } from '@/game/engine'
import { MOCK_ACTIVITIES, MOCK_RANKINGS, NOTICE } from '@/api/mock'
import { useGameStore } from '@/store/game'
import GameIcon from './GameIcon.vue'
import HeroPlate from './HeroPlate.vue'
import WelfareScene from './WelfareScene.vue'
import ReferenceDialogs from './ReferenceDialogs.vue'

const game = useGameStore()
const exactPanel = computed(() =>
  [
    'formation',
    'formation-select',
    'hero-select',
    'recruit',
    'idle',
    'settings',
    'redeem',
    'hero-detail',
    'building-page',
  ].includes(game.panel),
)
const titles: Record<string, string> = {
  'notice': '游戏公告',
  'servers': '选择区服',
  'welcome': '初入仙途',
  'formation': '布阵',
  'recruit': '道友招募',
  'summon-result': '仙缘相逢',
  'pass-reward': '通关奖励',
  'tasks': '修行任务',
  'idle': '离线收益',
  'reward': '获得奖励',
  'battle-result': '斗法结算',
  'battle-log': '战斗记录',
  'retreat': '退出斗法',
  'guide': '修行攻略',
  'forecast': '功能预告',
  'hero-detail': '人物详情',
  'more-attrs': '更多属性',
  'breakthrough': '渡劫突破',
  'cultivate': '道友培养',
  'rebirth': '道友重生',
  'item': '物品详情',
  'equip-select': '选择装备',
  'smelt': '批量熔炼',
  'building': '洞府建筑',
  'abode-help': '洞府说明',
  'adventure-result': '山中奇遇',
  'activity': '探索',
  'shop': '坊市',
  'rank': '天机排行榜',
  'friends': '好友',
  'mail': '邮件',
  'mail-detail': '邮件详情',
  'codex': '万象图鉴',
  'chat': '传音',
  'settings': '设置',
  'rename': '更改道号',
  'reset': '重置存档',
  'create-union': '创建仙盟',
  'leave-union': '退出仙盟',
  'union-members': '仙盟成员',
  'union-donate': '仙盟捐献',
  'union-tasks': '仙盟任务',
  'union-shop': '贡献商店',
  'union-boss': '仙盟首领',
  'probability': '奖励说明',
  'recruit-probability': '招募说明',
  'enemy': '敌方信息',
  'city-activity': '仙城',
  'formation-feature': '布阵',
  'recruit-exchange': '英雄兑换',
  'union-list': '仙盟列表',
  'union-log': '仙盟日志',
  'union-apply': '入盟申请',
  'union-settings': '入盟设置',
  'union-notice': '仙盟公告',
  'union-recruit': '发布招募',
  'union-four': '仙盟四象',
  'union-war': '仙盟争锋',
  'union-rank': '最强仙盟',
  'import-confirm': '导入存档',
}
const building = computed(() => game.save.buildings.find(b => b.id === game.detailId))
const item = computed(() => game.save.items.find(i => i.id === game.detailId))
const activity = computed(() => MOCK_ACTIVITIES.find(a => a.id === game.detailId))
const mail = computed(() => game.save.mails.find(m => m.id === game.detailId))
const title = computed(() =>
  game.panel === 'building'
    ? building.value?.name || '洞府建筑'
    : game.panel === 'activity'
      ? activity.value?.name || '探索'
      : titles[game.panel] || '仙途',
)
const selectedSlot = ref(-1)
const summonKind = ref('普通')
const tab = ref('全部')
const textInput = ref('')
const chatInput = ref('')
const channel = ref('世界')
const smeltQuality = ref(1)
const activityDifficulty = ref('普通')
const pendingImport = ref<unknown>(null)
const dialog = ref<HTMLElement>()
let previousFocus: HTMLElement | null = null

watch(
  () => game.panel,
  async (value, previous) => {
    selectedSlot.value = -1
    textInput.value = ''
    tab.value = '全部'
    if (value === 'chat')
      channel.value = previous === 'union-members' || game.module === 'union' ? '仙盟' : '世界'
    // #ifdef H5
    if (value && !previous)
      previousFocus = document.activeElement as HTMLElement
    await nextTick()
    if (value) {
      const element = document.querySelector<HTMLElement>(
        '.panel-shade .close-button, .reference-dialog-mask button',
      )
      element?.focus()
    }
    else {
      previousFocus?.focus()
    }
    // #endif
  },
)
function keydown(event: KeyboardEvent): void {
  if (!game.panel)
    return
  if (event.key === 'Escape')
    game.close()
  // #ifdef H5
  if (event.key === 'Tab') {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.panel-shade button:not([disabled]), .panel-shade input, .panel-shade textarea, .reference-dialog-mask button:not([disabled]), .reference-dialog-mask input',
      ),
    )
    const first = elements[0]
    const last = elements.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    }
    else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }
  // #endif
}
onMounted(() => {
  // #ifdef H5
  document.addEventListener('keydown', keydown)
  // #endif
})
onUnmounted(() => {
  // #ifdef H5
  document.removeEventListener('keydown', keydown)
  // #endif
})
function time(seconds: number): string {
  return `${Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0')}:${Math.floor((seconds / 60) % 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
function clickSlot(index: number): void {
  if (selectedSlot.value < 0) {
    selectedSlot.value = index
  }
  else {
    game.swapSlots(selectedSlot.value, index)
    selectedSlot.value = -1
    game.notify('阵位已交换')
  }
}
function buy(index: number): void {
  game.buy(index, tab.value === '仙玉' ? 'jade' : tab.value === '荣誉' ? 'honor' : 'coin')
}
function equipItems(): IItem[] {
  return game.save.items.filter(i => i.slot === game.detailId && i.count > 0)
}
function friendAdd(name: string): void {
  if (game.save.friends.includes(name))
    return
  game.save.friends.push(name)
  game.notify('对方已接受好友申请')
}
function refreshShop(): void {
  if (game.spend({ coin: 500 })) {
    game.save.daily.shopRefresh = (game.save.daily.shopRefresh || 0) + 1
    game.notify('坊市货架已刷新')
  }
}
const shopItems = computed(() => {
  const shift = (game.save.daily.shopRefresh || 0) % 5
  return [0, 1, 2, 3, 4, 6, 7, 11].map(i => (i + shift) % ITEM_TEMPLATES.length)
})
function claimPass(n: number): void {
  if (game.save.cleared < n)
    return
  game.claim(`pass-${n}`, { jade: n * 20, exp: n * 150, coin: n * 300 })
}
function downloadSave(): void {
  // #ifdef H5
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(game.save, null, 2)], { type: 'application/json' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `封天神魔-${game.save.name}-${game.save.day}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  game.notify('存档已导出')
  // #endif
}
function uploadSave(): void {
  // #ifdef H5
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,application/json'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file)
      return
    if (file.size > 2000000) {
      game.notify('存档文件不能超过 2 MB')
      return
    }
    try {
      pendingImport.value = JSON.parse(await file.text())
      game.open('import-confirm')
    }
    catch {
      game.notify('无法解析此存档文件')
    }
  }
  input.click()
  // #endif
}
const rewardValues = computed(() =>
  game.panel === 'idle'
    ? game.idleReward
    : game.panel === 'battle-result'
      ? game.battle.reward
      : game.lastReward,
)
const rewardEntries = computed(() => Object.entries(rewardValues.value) as [Resource, number][])
const stats = computed(() => heroStats(game.hero, game.save))
const enemy = computed(() =>
  [...game.battle.enemies, ...makeBattle(game.save).enemies].find(e => e.id === game.detailId),
)
const activityPreview = computed(() =>
  activity.value ? makeBattle(game.save, activity.value.id, activity.value.name) : null,
)
const activityProfile = computed(() => {
  const current = activity.value
  if (!current)
    return null
  const profiles: Record<string, { tag: string, objective: string, progressLabel: string, progress: string, tip: string, action: string }> = {
    material: {
      tag: '每日副本',
      objective: '灵石洞窟、炼器谷与丹草园轮番开放，清除三波守关妖灵。',
      progressLabel: '本日已挑战',
      progress: `${game.save.daily.material || 0}/${current.limit}`,
      tip: '推荐使用群攻道友快速清场',
      action: '进入秘境',
    },
    tower: {
      tag: '爬塔挑战',
      objective: '逐层挑战镇妖塔，击败守层妖将后进入下一层。',
      progressLabel: '当前层数',
      progress: `第 ${game.save.tower} 层`,
      tip: '气血会继承到下一层，请留意队伍状态',
      action: '挑战本层',
    },
    boss: {
      tag: '世界首领',
      objective: '集结全服道友挑战玄冥妖王，按伤害结算排名奖励。',
      progressLabel: '今日挑战',
      progress: `${game.save.daily.boss || 0}/${current.limit}`,
      tip: '首领拥有高额减伤，怒气技能收益更高',
      action: '挑战首领',
    },
    arena: {
      tag: '竞技论道',
      objective: '匹配其他道友进行六人对决，胜利后提升竞技排名。',
      progressLabel: '当前排名',
      progress: `第 ${game.save.arena} 名`,
      tip: '对手阵容为本地 Mock 道友，可反复演练',
      action: '匹配对手',
    },
    relic: {
      tag: '限时探索',
      objective: '探索远古遗迹，击败守卫后从上古机缘中随机获得奖励。',
      progressLabel: '今日探索',
      progress: `${game.save.daily.relic || 0}/${current.limit}`,
      tip: '遗迹守卫擅长群体攻击，建议携带医修',
      action: '探索遗迹',
    },
    team: {
      tag: '组队副本',
      objective: '与清风道人、一叶知秋组成四人小队，挑战秘境主宰。',
      progressLabel: '今日次数',
      progress: `${game.save.daily.team || 0}/${current.limit}`,
      tip: '本地伙伴会随队伍战力动态调整',
      action: '组队挑战',
    },
    ascend: {
      tag: '渡劫挑战',
      objective: '登临仙台迎战天雷与天门守卫，验证当前修行成果。',
      progressLabel: '今日挑战',
      progress: `${game.save.daily.ascend || 0}/${current.limit}`,
      tip: '敌方等级较高，建议先提升道友境界',
      action: '登上仙台',
    },
    wander: {
      tag: '云游奇遇',
      objective: '御剑云游山海，遭遇散修与精怪并获取随机机缘。',
      progressLabel: '今日云游',
      progress: `${game.save.daily.wander || 0}/${current.limit}`,
      tip: '云游敌人较少，适合快速完成日常',
      action: '御剑云游',
    },
    trial: {
      tag: '神魔试炼',
      objective: '挑战神魔投影，测试阵容对不同属性敌人的适应能力。',
      progressLabel: '今日试炼',
      progress: `${game.save.daily.trial || 0}/${current.limit}`,
      tip: '试炼敌人会优先攻击后排道友',
      action: '开启试炼',
    },
    invasion: {
      tag: '共御魔神',
      objective: '魔神降临人间，击退先锋、祭司与战将，守卫修行界。',
      progressLabel: '今日迎战',
      progress: `${game.save.daily.invasion || 0}/${current.limit}`,
      tip: '敌方首领攻击较高，护盾类技能效果显著',
      action: '迎战魔神',
    },
    holy: {
      tag: '圣兽境地',
      objective: '进入圣兽栖居之地，击败守卫并收集灵兽机缘。',
      progressLabel: '今日进入',
      progress: `${game.save.daily.holy || 0}/${current.limit}`,
      tip: '圣兽守卫拥有吸收盾，需要持续输出',
      action: '进入境地',
    },
    veins: {
      tag: '经脉试炼',
      objective: '冲击经脉毒瘴，疏通真元并获取灵气奖励。',
      progressLabel: '今日通关',
      progress: `${game.save.daily.veins || 0}/${current.limit}`,
      tip: '单体爆发道友更适合经脉试炼',
      action: '冲击经脉',
    },
  }
  return profiles[current.id] || {
    tag: '修行历练',
    objective: current.description,
    progressLabel: '今日剩余',
    progress: `${Math.max(0, current.limit - (game.save.daily[current.id] || 0))}/${current.limit}`,
    tip: '与道友并肩，探寻修行机缘',
    action: '进入挑战',
  }
})
function beginActivity(): void {
  if (!activity.value)
    return
  game.startBattle(activity.value.id, `${activity.value.name} · ${activityDifficulty.value}`)
}
</script>

<template>
  <ReferenceDialogs v-if="exactPanel" />
  <view v-else-if="game.panel" class="panel-shade" :class="{ 'server-shade': game.panel === 'servers' }" @click.self="game.close()">
    <view
      ref="dialog"
      class="game-panel"
      :class="{
        'wide-panel': ['formation', 'recruit', 'welfare-shortcut', 'chat'].includes(game.panel),
        'embedded-panel': game.panel === 'welfare-shortcut',
        'server-panel': game.panel === 'servers',
      }"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <view class="panel-heading" :class="{ 'server-panel-heading': game.panel === 'servers' }">
        <template v-if="game.panel === 'servers'">
          <view class="server-heading-copy">
            <text class="server-heading-title">选择区服</text>
          </view>
        </template>
        <template v-else>
          <view class="heading-ornament" /><text>{{ title }}</text><view class="heading-ornament" />
        </template>
        <button
          class="close-button"
          aria-label="关闭弹窗"
          @click="game.close()"
        >
          ×
        </button>
      </view>
      <view class="panel-body" :class="{ 'server-panel-body': game.panel === 'servers' }">
        <template v-if="game.panel === 'notice'">
          <view class="notice-date">
            青云历 · 仙途初启
          </view><view class="prose">
            {{ NOTICE }}
          </view><view class="section-title">
            修行须知
          </view><view class="prose">
            主线挑战提升挂机收益，培养道友、调整阵位、配置法宝均可提升队伍实力。所有进度自动保存在当前浏览器。
          </view><button class="primary-button centered" @click="game.close()">
            知晓
          </button>
        </template>

        <template v-else-if="game.panel === 'servers'">
          <view class="server-dialog-body">
            <button
              class="server-entry"
              @click="
                () => {
                  game.save.server = 1
                  game.close()
                }
              "
            >
              <view class="server-entry-main">
                <view class="server-entry-title">
                  <view class="status-dot" /><text>青云问道</text>
                </view>
                <text class="server-entry-meta">1区 · 修仙1服</text>
              </view>
              <view class="server-entry-action">
                <text>进入</text><text>›</text>
              </view>
            </button>
          </view>
          <view class="server-dialog-footer">
            <view class="server-account">
              <text class="server-account-label">最近登录</text>
              <text class="server-account-name">{{ game.save.created ? `${game.save.name} · 1区` : '暂无' }}</text>
            </view>
            <text class="server-footer-tip">当前仅开放 1 个区服</text>
          </view>
        </template>

        <template v-else-if="game.panel === 'welcome'">
          <view class="result-calligraphy">
            仙途已启
          </view><view class="prose text-center">
            {{
              game.save.name
            }}道友，山海之间，自此多了一位寻道之人。<br>六位道友已列阵，点击「挑战」即可开启修行。
          </view><view class="welcome-steps">
            <text>① 挑战主线</text><text>② 升级道友</text><text>③ 领取收益</text>
          </view><button class="primary-button centered" @click="game.close()">
            开始修行
          </button>
        </template>

        <template v-else-if="game.panel === 'formation'">
          <view class="muted text-center">
            先点选一名道友，再点击另一阵位交换
          </view><view class="formation-label">
            后排 · 法修与辅助
          </view><view class="formation-grid">
            <view v-for="(h, index) in game.team" :key="index" class="formation-slot">
              <text class="slot-number">{{ index + 1 }}</text><HeroPlate
                v-if="h"
                :unit="h"
                :selected="selectedSlot === index"
                @select="clickSlot(index)"
              /><button
                v-else
                class="empty-slot"
                :class="{ chosen: selectedSlot === index }"
                @click="clickSlot(index)"
              >
                ＋<text>空阵位</text>
              </button>
            </view>
          </view><view class="formation-label">
            前排 · 御敌于前
          </view><view class="section-title">
            待选道友
          </view><view class="muted text-center">
            {{
              selectedSlot >= 0
                ? `正在选择第 ${selectedSlot + 1} 阵位的道友`
                : '点击阵位后可从下方选择上阵'
            }}
          </view><view class="formation-reserves">
            <button
              v-for="h in game.save.heroes"
              :key="h.id"
              class="hero-chip"
              :class="[`q${h.quality}`]"
              @click="
                selectedSlot >= 0
                  ? (game.deploy(h.id, selectedSlot), (selectedSlot = -1))
                  : game.notify('请先点选一个阵位')
              "
            >
              {{ h.name
              }}<text>{{ game.save.formation.includes(h.id) ? '已上阵' : '可上阵' }}</text>
            </button>
          </view><view class="action-row">
            <button
              class="paper-button"
              :disabled="selectedSlot < 0 || !game.team[selectedSlot]"
              @click="
                () => {
                  game.undeploy(game.team[selectedSlot]!.id)
                  selectedSlot = -1
                }
              "
            >
              下阵所选
            </button><button class="primary-button" @click="game.close()">
              完成布阵
            </button>
          </view>
        </template>

        <template v-else-if="game.panel === 'recruit'">
          <view class="tab-strip">
            <button
              v-for="kind in ['普通', '高级', '友情']"
              :key="kind"
              :class="{ selected: summonKind === kind }"
              @click="summonKind = kind"
            >
              {{ kind }}招募
            </button>
          </view><view class="recruit-art">
            <view class="recruit-orbit" /><view class="recruit-inner" /><GameIcon
              name="scroll"
              :size="150"
            /><view class="recruit-poem">
              三千道友 共赴仙途
            </view>
          </view><view class="recruit-description">
            {{
              summonKind === '高级'
                ? `每20次高级招募必得仙品道友，当前 ${game.save.advancedSummon % 20}/20`
                : summonKind === '友情'
                  ? '以仙缘会友，以真心相交'
                  : '山海寻仙，静候有缘人'
            }}
          </view><view class="muted text-center">
            {{
              summonKind === '普通'
                ? `拥有仙玉招募令 ${game.save.items.find((i) => i.name === '仙玉招募令')?.count || 0} 枚 · 不足时每次100仙玉`
                : summonKind === '高级'
                  ? '每次消耗 200 仙玉'
                  : `每次消耗 30 友情 · 拥有 ${game.save.wallet.friendship}`
            }}
          </view><view class="action-row">
            <button class="paper-button" @click="game.summon(summonKind, 1)">
              单次招募
            </button><button class="primary-button" @click="game.summon(summonKind, 10)">
              十连招募
            </button>
          </view><button class="text-btn centered" @click="game.open('recruit-probability')">
            招募说明
          </button>
        </template>

        <template v-else-if="game.panel === 'recruit-probability'">
          <view class="prose">
            演示卡池共
            {{ HERO_POOL.length }}
            位道友，按固定种子等概率抽取。高级招募每20次固定获得卡池指定道友；普通及友情招募不产出圣品道友。重复道友转换为10枚对应碎片。
          </view><view class="muted">
            这是本地 mock 规则，不代表参考游戏原服概率。
          </view><button class="paper-button centered" @click="game.open('recruit')">
            返回招募
          </button>
        </template>

        <template v-else-if="game.panel === 'summon-result'">
          <view class="result-calligraphy">
            仙缘相逢
          </view><view class="summon-results">
            <view
              v-for="(h, index) in game.recruitResult"
              :key="index"
              class="summon-hero"
              :class="`q${h.quality}`"
            >
              <view class="hero-mini-seal">
                {{ h.name[0] }}
              </view><text>{{ h.name }}</text><text class="tiny">{{ QUALITY[h.quality] }}</text>
            </view>
          </view><view class="muted text-center">
            新道友已入包裹，重复道友转为碎片
          </view><button class="primary-button centered" @click="game.open('recruit')">
            再续仙缘
          </button>
        </template>

        <template
          v-else-if="['idle', 'reward', 'adventure-result', 'battle-result'].includes(game.panel)"
        >
          <view
            class="result-calligraphy"
            :class="{ lost: game.panel === 'battle-result' && game.battle.status === 'lost' }"
          >
            {{
              game.panel === 'idle'
                ? '静修有成'
                : game.panel === 'adventure-result'
                  ? '山中得缘'
                  : game.panel === 'battle-result'
                    ? game.battle.status === 'won'
                      ? '斗法胜利'
                      : '胜败乃常'
                    : '仙缘馈赠'
            }}
          </view><view v-if="game.panel === 'idle'" class="idle-time">
            已修行 {{ time(game.idleSeconds)
            }}<view class="muted">
              最多累计 12 小时收益
            </view>
          </view><view v-if="game.panel === 'adventure-result'" class="prose">
            沿溪而行，忽见一老者盘坐青石。与你论道三刻，临别赠予一份修行机缘。
          </view><view v-if="game.panel === 'battle-result'" class="muted text-center">
            {{ game.battle.title }} · {{ game.battle.round }}回合
          </view><view class="reward-grid">
            <view v-for="[key, amount] in rewardEntries" :key="key" class="reward-box">
              <GameIcon
                :name="key === 'coin' ? 'coin' : key === 'jade' ? 'jade' : 'lotus'"
                :size="65"
              /><text>{{ RESOURCES[key] }}</text><strong>+{{ amount.toLocaleString() }}</strong>
            </view>
          </view><view
            v-if="game.panel === 'battle-result' && game.battle.status === 'lost'"
            class="prose text-center"
          >
            不妨调整阵位、提升道友等级，或配置更好的装备法宝，再来挑战。
          </view><view v-if="game.panel === 'idle'" class="action-row">
            <button class="paper-button" @click="game.claimIdle(2)">
              双倍领取 · 30仙玉
            </button><button class="primary-button" @click="game.claimIdle()">
              领取收益
            </button>
          </view><template v-else>
            <view v-if="game.panel === 'battle-result'" class="action-row">
              <button class="paper-button" @click="game.open('battle-log')">
                战斗记录
              </button><button class="primary-button" @click="game.close()">
                继续修行
              </button>
            </view><button v-else class="primary-button centered" @click="game.close()">
              收下
            </button>
          </template>
        </template>

        <template v-else-if="game.panel === 'battle-log'">
          <view
            v-for="(line, index) in [...game.battle.log].reverse()"
            :key="index"
            class="battle-log-line"
          >
            {{ line }}
          </view><button class="paper-button centered" @click="game.close()">
            返回
          </button>
        </template>

        <template v-else-if="game.panel === 'retreat'">
          <view class="prose text-center">
            确定退出当前斗法？本次挑战次数不会返还，尚未获胜不发放奖励。
          </view><view class="action-row">
            <button class="paper-button" @click="game.close()">
              继续斗法
            </button><button class="primary-button" @click="game.retreat()">
              退出
            </button>
          </view>
        </template>

        <template v-else-if="game.panel === 'pass-reward'">
          <view class="muted text-center">
            已通关 {{ game.save.cleared }} 关
          </view><view v-for="n in [1, 3, 5, 10, 15, 20, 30, 50, 100]" :key="n" class="list-row">
            <GameIcon name="gift" :size="50" /><view class="flex-1">
              通关第 {{ n }} 关<view class="muted">
                仙玉 ×{{ n * 20 }} · 修为 ×{{ n * 150 }}
              </view>
            </view><button
              class="small-button"
              :disabled="game.save.cleared < n || game.claimed(`pass-${n}`)"
              @click="claimPass(n)"
            >
              {{ game.claimed(`pass-${n}`) ? '已领取' : game.save.cleared < n ? '未达成' : '领取' }}
            </button>
          </view>
        </template>

        <template v-else-if="game.panel === 'tasks'">
          <view class="tab-strip">
            <button
              v-for="name in ['全部', '主线', '日常']"
              :key="name"
              :class="{ selected: tab === name }"
              @click="tab = name"
            >
              {{ name }}
            </button>
          </view><view v-if="tab !== '日常'" class="task-card">
            <view class="section-title">
              主线 · 初窥仙途
            </view><view>通关青云山第1关</view><view class="muted">
              {{ Math.min(1, game.save.cleared) }}/1 · 仙玉200、修为1000
            </view><button
              class="small-button"
              :disabled="game.save.cleared < 1 || game.claimed('main-task')"
              @click="game.claim('main-task', { jade: 200, exp: 1000 })"
            >
              {{ game.claimed('main-task') ? '已领取' : '领取' }}
            </button>
          </view><view v-if="tab !== '主线'" class="task-card">
            <view class="section-title">
              日常 · 广结仙缘
            </view><view>完成一次招募</view><view class="muted">
              {{ Math.min(1, game.save.summon) }}/1 · 铜贝5000、修为500
            </view><button
              class="small-button"
              :disabled="game.save.summon < 1 || game.claimed('summon-task', true)"
              @click="game.claim('summon-task', { coin: 5000, exp: 500 }, true)"
            >
              领取
            </button>
          </view><view v-if="tab !== '主线'" class="task-card">
            <view class="section-title">
              日常 · 勤修不辍
            </view><view>累计在线1分钟</view><view class="muted">
              {{ Math.min(60, Math.floor(game.save.played)) }}/60秒 · 仙玉100
            </view><button
              class="small-button"
              :disabled="game.save.played < 60 || game.claimed('online-task', true)"
              @click="game.claim('online-task', { jade: 100 }, true)"
            >
              领取
            </button>
          </view>
        </template>

        <template v-else-if="game.panel === 'guide'">
          <view class="section-title">
            六人阵法
          </view><view class="prose">
            体修放在前排承担伤害，医修与法修列于后排。点击「布阵」可以交换两名道友的位置，或从道友列表中选择上阵。
          </view><view class="section-title">
            修行与斗法
          </view><view class="prose">
            斗法自动进行，能量满100时释放本命神通。修为用于升级道友；通关越多，挂机收益越高。战斗失败可以免费重试主线。
          </view><view class="section-title">
            装备与机缘
          </view><view class="prose">
            包裹中点击装备即可穿戴。洞府可炼丹、炼器、种植灵草；探索可获得各类材料。每日签到和邮件也有修行奖励。
          </view>
        </template>

        <template v-else-if="game.panel === 'forecast'">
          <view
            v-for="name in [
              '道友招募',
              '洞府修行',
              '材料秘境',
              '镇妖塔',
              '仙盟协作',
              '竞技论道',
              '远古遗迹',
            ]"
            :key="name"
            class="list-row"
          >
            <GameIcon name="scroll" /><view class="flex-1">
              {{ name }}<view class="muted">
                循序修行，渐悟长生
              </view>
            </view><text class="green">已开放</text>
          </view><view class="muted text-center">
            演示已开放常用系统，便于体验完整流程
          </view>
        </template>

        <template v-else-if="game.panel === 'hero-detail'">
          <view class="detail-name" :class="`q${game.hero.quality}`">
            {{ game.hero.name
            }}<text>
              {{ QUALITY[game.hero.quality] }} ·
              {{ game.hero.role }}
            </text>
          </view><view class="prose">
            {{ game.hero.description }}
          </view><view class="detail-stats">
            <text>攻击 {{ stats.attack }}</text><text>气血 {{ stats.hp }}</text><text>防御 {{ stats.defense }}</text><text>速度 {{ stats.speed }}</text>
          </view><view class="section-title">
            本命神通 · {{ game.hero.skill }}
          </view><view class="prose">
            {{
              game.hero.role === '医修'
                ? '消耗100能量，为己方气血最低的存活道友回复攻击力240%的气血。'
                : '消耗100能量，对敌方目标造成攻击力230%的伤害。普通攻击恢复30能量。'
            }}
          </view><view class="muted">
            星级 {{ game.hero.star }} · 进阶 {{ game.hero.stage }} · 培养 {{ game.hero.train }} ·
            碎片 {{ game.hero.fragments }}
          </view><view class="action-row">
            <button class="paper-button" @click="game.open('formation')">
              布阵上阵
            </button><button
              class="primary-button"
              @click="
                () => {
                  game.close()
                  game.changeModule('hero')
                }
              "
            >
              前往培养
            </button>
          </view>
        </template>

        <template v-else-if="game.panel === 'more-attrs'">
          <view class="detail-name">
            {{ game.hero.name }}
          </view><view v-for="(value, key) in stats" :key="key" class="attribute-row">
            <text>{{ { hp: '气血', attack: '攻击', defense: '防御', speed: '速度' }[key] }}</text><text>{{ value }}</text>
          </view><view class="attribute-row">
            <text>战力</text><text>{{ power(game.hero, game.save) }}</text>
          </view><view class="prose">
            属性来自等级、品质、星级、进阶、培养、已穿戴物品与藏经阁。当前效果会直接应用于斗法。
          </view>
        </template>

        <template v-else-if="game.panel === 'breakthrough'">
          <view class="breakthrough-symbol">
            {{ REALMS[game.save.realm] }}
          </view><view class="prose text-center">
            下一境界：{{ REALMS[Math.min(8, game.save.realm + 1)] }}<br>主角等级要求：{{
              20 + game.save.realm * 20
            }}<br>消耗修为：{{ (game.save.realm + 1) * 3000 }}<br>渡劫丹：1枚 · 拥有
            {{ game.save.items.find((i) => i.name === '渡劫丹')?.count || 0 }} 枚
          </view><view class="muted text-center">
            演示规则：满足条件必定突破，解锁更高等级上限
          </view><button class="primary-button centered" @click="game.breakthrough()">
            渡劫突破
          </button>
        </template>

        <template v-else-if="game.panel === 'cultivate'">
          <view class="detail-name">
            {{ game.hero.name }}
          </view><view class="prose text-center">
            {{
              game.detailId === 'star'
                ? `消耗 ${(game.hero.star + 1) * 10} 枚对应碎片（拥有${game.hero.fragments}），提升一星。`
                : game.detailId === 'stage'
                  ? `消耗铜贝 ${2000 * (game.hero.stage + 1)}、修为 ${800 * (game.hero.stage + 1)}，提升一阶。`
                  : '消耗铜贝1500，提升一次培养等级。'
            }}<br>当前：{{
              game.detailId === 'star'
                ? `${game.hero.star}星`
                : game.detailId === 'stage'
                  ? `${game.hero.stage}阶`
                  : `${game.hero.train}次培养`
            }}
          </view><button
            class="primary-button centered"
            @click="game.trainHero(game.hero.id, game.detailId)"
          >
            确认培养
          </button>
        </template>

        <template v-else-if="game.panel === 'rebirth'">
          <view class="prose text-center">
            {{ game.hero.name }}重生后等级恢复为1级，进阶、培养清零。<br>返还实际消耗修为
            {{ game.hero.invested }}。星级和装备保留。
          </view><view class="action-row">
            <button class="paper-button" @click="game.close()">
              取消
            </button><button class="primary-button" @click="game.rebirth(game.detailId)">
              确认重生
            </button>
          </view>
        </template>

        <template v-else-if="game.panel === 'item' && item">
          <view class="item-detail-top" :class="`q${item.quality}`">
            <GameIcon :name="item.icon" :size="95" /><view>
              <view class="detail-name">
                {{ item.name }}{{ item.enhance ? ` +${item.enhance}` : '' }}
              </view><view>{{ QUALITY[item.quality] }} · {{ item.kind }}</view><view class="muted">
                拥有 {{ item.count }}{{ item.locked ? ' · 已锁定' : '' }}
              </view>
            </view>
          </view><view class="prose">
            {{ item.description }}
          </view><view v-if="item.equipped" class="muted">
            已装备于 {{ game.save.heroes.find((h) => h.id === item!.equipped)?.name }}
          </view><view v-if="['装备', '法宝', '仙器'].includes(item.kind)" class="prose tiny">
            当前 mock 属性：攻击 +{{
              Math.round(35 * item.quality * (1 + item.enhance * 0.1))
            }}、气血 +{{ Math.round(160 * item.quality * (1 + item.enhance * 0.1)) }}、防御 +{{
              Math.round(15 * item.quality * (1 + item.enhance * 0.1))
            }}
          </view><view class="item-actions">
            <template v-if="item.kind === '道具'">
              <button class="primary-button" @click="game.operateItem(item!.id, 'use')">
                使用
              </button>
            </template><template v-if="['装备', '法宝', '仙器'].includes(item.kind)">
              <button
                class="primary-button"
                @click="game.operateItem(item!.id, item!.equipped ? 'unequip' : 'equip')"
              >
                {{ item.equipped ? '卸下' : `装备给${game.hero.name}` }}
              </button><button class="paper-button" @click="game.operateItem(item!.id, 'enhance')">
                强化 · {{ 500 * (item.enhance + 1) }}铜贝
              </button><button class="paper-button" @click="game.operateItem(item!.id, 'resolve')">
                分解
              </button>
            </template><button
              v-if="item.kind === '碎片'"
              class="primary-button"
              @click="game.operateItem(item!.id, 'combine')"
            >
              合成 · 10枚
            </button><button class="paper-button" @click="game.operateItem(item!.id, 'lock')">
              {{ item.locked ? '解锁' : '锁定' }}
            </button><button class="paper-button" @click="game.operateItem(item!.id, 'sell')">
              出售一件
            </button>
          </view>
        </template>

        <template v-else-if="game.panel === 'equip-select'">
          <view class="muted">
            为 {{ game.hero.name }} 选择{{ game.detailId }}
          </view><button
            v-for="i in equipItems()"
            :key="i.id"
            class="list-row full-width"
            @click="
              () => {
                game.operateItem(i.id, 'equip')
                game.close()
              }
            "
          >
            <GameIcon :name="i.icon" :size="65" /><view
              class="flex-1 text-left"
              :class="`q${i.quality}`"
            >
              {{ i.name }} +{{ i.enhance
              }}<view class="muted">
                {{ i.equipped ? '已穿戴 · 可转移' : '未穿戴' }}
              </view>
            </view><text>装备</text>
          </button><view v-if="!equipItems().length" class="empty-state">
            暂无可用物品，可前往坊市或炼器室获取
          </view>
        </template>

        <template v-else-if="game.panel === 'smelt'">
          <view class="prose">
            选择熔炼品质上限。已穿戴、锁定物品不会被消耗。每件装备获得玄铁3枚。
          </view><view class="choice-row">
            <button
              v-for="q in [0, 1, 2, 3]"
              :key="q"
              :class="{ selected: smeltQuality === q }"
              @click="smeltQuality = q"
            >
              {{ QUALITY[q] }}
            </button>
          </view><view class="action-row">
            <button class="paper-button" @click="game.close()">
              取消
            </button><button
              class="primary-button"
              @click="
                () => {
                  game.smelt(smeltQuality)
                  game.close()
                }
              "
            >
              确认熔炼
            </button>
          </view>
        </template>

        <template v-else-if="game.panel === 'building' && building">
          <view class="building-detail">
            <image src="/static/game/pavilion.svg" mode="aspectFit" /><view class="scene-heading">
              {{ building.name }} · {{ building.level }}级
            </view><view class="prose">
              {{ building.description }}
            </view>
          </view><view v-if="building.id === 'field'" class="prose text-center">
            {{
              !game.save.cropAt
                ? '灵田空闲，可种植灵草'
                : game.now >= game.save.cropAt
                  ? `灵草已成熟，可收获${building.level * 5}株`
                  : `距离成熟 ${Math.ceil((game.save.cropAt - game.now) / 1000)} 秒`
            }}
          </view><template v-if="building.id === 'alchemy' || building.id === 'forge'">
            <view v-if="game.save.craft" class="prose text-center">
              {{
                game.now >= game.save.craft.ends
                  ? '炼制完成，可领取'
                  : `正在炼制，剩余${Math.ceil((game.save.craft.ends - game.now) / 1000)}秒`
              }}
            </view><view v-else class="prose text-center">
              消耗{{ building.id === 'alchemy' ? '灵草' : '玄铁' }}5枚，炼制15秒
            </view><view v-if="building.id === 'alchemy' && !game.save.craft" class="choice-row">
              <button :class="{ selected: tab !== '渡劫丹' }" @click="tab = '聚气丹'">
                聚气丹
              </button><button :class="{ selected: tab === '渡劫丹' }" @click="tab = '渡劫丹'">
                渡劫丹
              </button>
            </view>
          </template><view class="building-actions">
            <button
              class="primary-button"
              @click="game.buildingAction(building!.id, tab === '渡劫丹' ? 'breakthrough' : 'pill')"
            >
              {{
                building.id === 'field'
                  ? !game.save.cropAt
                    ? '播种 · 200铜贝'
                    : '收获灵草'
                  : ['alchemy', 'forge'].includes(building.id)
                    ? game.save.craft
                      ? '领取成品'
                      : '开始炼制'
                    : building.id === 'adventure'
                      ? '寻觅机缘'
                      : '参悟 · 100灵气'
              }}
            </button><button class="paper-button" @click="game.upgradeBuilding(building!.id)">
              升级 · {{ building.level * 3000 }}铜贝 / {{ building.level * 50 }}灵液
            </button>
          </view>
        </template>

        <template v-else-if="game.panel === 'abode-help'">
          <view class="prose">
            聚灵阵与藏经阁可消耗灵气获得修为。升级藏经阁提升全体攻击。灵田播种30秒成熟，炼丹、炼器15秒完成。升级建筑消耗铜贝与灵液，灵液池每日可采集一次。每个真实日期按北京时间重置每日次数。
          </view>
        </template>

        <template v-else-if="game.panel === 'activity' && activity && activityProfile">
          <view class="activity-hero-card">
            <view class="activity-detail-art">
              <GameIcon :name="activity.icon" :size="118" />
            </view>
            <view class="activity-hero-copy">
              <view class="activity-mode-tag">
                {{ activityProfile.tag }}
              </view>
              <view class="scene-heading">
                {{ activity.name }}
              </view>
              <view class="muted">
                {{ activityProfile.objective }}
              </view>
            </view>
          </view>
          <view class="activity-metrics">
            <view>
              <text>{{ activityProfile.progressLabel }}</text>
              <text class="activity-metric-value">{{ activityProfile.progress }}</text>
            </view>
            <view>
              <text>今日剩余</text>
              <text class="activity-metric-value">{{ Math.max(0, activity.limit - (game.save.daily[activity.id] || 0)) }}/{{ activity.limit }}</text>
            </view>
            <view>
              <text>推荐战力</text>
              <text class="activity-metric-value">{{ Math.round(game.teamPower * (1 + (activityPreview?.enemies.length || 1) * 0.12)).toLocaleString() }}</text>
            </view>
          </view>
          <view v-if="activityPreview?.enemies.length" class="activity-enemy-panel">
            <view class="activity-section-label">
              模拟敌阵
            </view>
            <view class="activity-enemy-list">
              <view v-for="enemyUnit in activityPreview.enemies.slice(0, 4)" :key="enemyUnit.id">
                <text>{{ enemyUnit.name }}</text>
                <text class="activity-enemy-meta">{{ enemyUnit.role }} · {{ enemyUnit.level }}阶</text>
                <text class="activity-enemy-hp">气血 {{ enemyUnit.maxHp.toLocaleString() }}</text>
              </view>
            </view>
          </view>
          <view class="activity-tip">
            {{ activityProfile.tip }}
          </view>
          <view class="section-title">
            奖励预览
          </view>
          <view class="reward-pills">
            <text v-for="(amount, key) in activity.reward" :key="key">
              {{ RESOURCES[key] }} ×{{ amount }}
            </text>
          </view>
          <button
            class="primary-button centered activity-start-button"
            :disabled="(game.save.daily[activity.id] || 0) >= activity.limit"
            @click="beginActivity"
          >
            {{ activityProfile.action }}
          </button>
        </template>

        <template v-else-if="game.panel === 'shop' || game.panel === 'union-shop'">
          <view v-if="game.panel === 'shop'" class="tab-strip">
            <button
              v-for="name in ['铜贝', '仙玉', '荣誉']"
              :key="name"
              :class="{ selected: tab === name || (tab === '全部' && name === '铜贝') }"
              @click="tab = name"
            >
              {{ name }}商店
            </button>
          </view><view class="shop-caption">
            <text>
              {{
                game.panel === 'union-shop'
                  ? `贡献：${game.save.wallet.contribution}`
                  : `铜贝 ${game.save.wallet.coin.toLocaleString()} · 仙玉 ${game.save.wallet.jade}`
              }}
            </text><button v-if="game.panel === 'shop'" class="text-btn" @click="refreshShop">
              刷新 · 500铜贝
            </button>
          </view><view class="shop-grid">
            <view v-for="index in shopItems" :key="index" class="shop-item">
              <GameIcon :name="ITEM_TEMPLATES[index].icon" :size="75" /><view
                :class="`q${ITEM_TEMPLATES[index].quality}`"
              >
                {{ ITEM_TEMPLATES[index].name }}
              </view><view class="muted">
                {{
                  game.panel === 'union-shop'
                    ? '100贡献'
                    : tab === '仙玉'
                      ? `${50 + index * 10}仙玉`
                      : tab === '荣誉'
                        ? '100荣誉'
                        : `${800 + index * 250}铜贝`
                }}
              </view><button
                class="small-button"
                @click="game.panel === 'union-shop' ? game.buy(index, 'contribution') : buy(index)"
              >
                购买
              </button>
            </view>
          </view>
        </template>

        <template v-else-if="game.panel === 'rank'">
          <view class="tab-strip">
            <button
              v-for="name in ['战力', '境界', '镇妖塔']"
              :key="name"
              :class="{ selected: tab === name || (tab === '全部' && name === '战力') }"
              @click="tab = name"
            >
              {{ name }}榜
            </button>
          </view><view v-for="(r, index) in MOCK_RANKINGS" :key="r.name" class="rank-row">
            <view class="rank-number" :class="`rank-${index + 1}`">
              {{ index + 1 }}
            </view><view class="flex-1">
              <view>{{ r.name }}</view><text class="muted">{{ r.realm }}</text>
            </view><text>
              {{
                tab === '镇妖塔'
                  ? `${98 - index * 7}层`
                  : tab === '境界'
                    ? r.realm
                    : r.power.toLocaleString()
              }}
            </text>
          </view><view class="my-rank">
            我的排名：128 <text>{{ game.save.name }} · {{ game.teamPower.toLocaleString() }}</text>
          </view>
        </template>

        <template v-else-if="game.panel === 'friends'">
          <view class="tab-strip">
            <button
              v-for="name in ['好友', '申请', '寻找道友']"
              :key="name"
              :class="{ selected: tab === name || (tab === '全部' && name === '好友') }"
              @click="tab = name"
            >
              {{ name }}
            </button>
          </view><view v-if="tab === '寻找道友'" class="search-row">
            <input v-model="textInput" placeholder="输入道号" aria-label="寻找道友"><button
              class="small-button"
              @click="textInput.trim() ? friendAdd(textInput.trim()) : game.notify('请填写道号')"
            >
              申请
            </button>
          </view><view
            v-for="name in tab === '申请'
              ? ['云间月', '枕山听雨'].filter((n) => !game.save.friends.includes(n))
              : tab === '寻找道友'
                ? ['云间月', '长生客']
                : game.save.friends"
            :key="name"
            class="list-row"
          >
            <view class="hero-mini-seal">
              {{ name[0] }}
            </view><view class="flex-1">
              {{ name
              }}<view class="muted">
                {{ tab === '申请' ? '请求与你结为道友' : '仙缘常在，山海同游' }}
              </view>
            </view><button
              v-if="tab === '申请' || tab === '寻找道友'"
              class="small-button"
              @click="friendAdd(name)"
            >
              {{ game.save.friends.includes(name) ? '已结缘' : '结缘' }}
            </button><button
              v-else
              class="small-button"
              :disabled="game.claimed(`friend-${name}`, true)"
              @click="game.claim(`friend-${name}`, { friendship: 30 }, true)"
            >
              {{ game.claimed(`friend-${name}`, true) ? '已赠礼' : '赠礼' }}
            </button>
          </view>
        </template>

        <template v-else-if="game.panel === 'mail'">
          <button
            v-for="m in game.save.mails"
            :key="m.id"
            class="mail-row full-width"
            @click="
              () => {
                m.read = true
                game.open('mail-detail', m.id)
              }
            "
          >
            <GameIcon name="mail" :size="55" /><view class="flex-1 text-left">
              <view>{{ m.title }}<text v-if="!m.read" class="new-tag">新</text></view><text class="muted">
                {{ m.claimed ? '已领取 / 无附件' : '有未领取附件' }}
              </text>
            </view><text>›</text>
          </button><view v-if="!game.save.mails.length" class="empty-state">
            暂无邮件
          </view><button
            v-if="game.save.mails.some((m) => !m.claimed)"
            class="primary-button centered"
            @click="game.save.mails.forEach((m) => game.claimMail(m.id))"
          >
            一键领取
          </button>
        </template>

        <template v-else-if="game.panel === 'mail-detail' && mail">
          <view class="scene-heading text-center">
            {{ mail.title }}
          </view><view class="prose">
            {{ mail.body }}
          </view><view class="reward-pills">
            <text v-for="(amount, key) in mail.rewards" :key="key">
              {{ RESOURCES[key] }} ×{{ amount }}
            </text>
          </view><view class="action-row">
            <button
              class="paper-button"
              :disabled="!mail.claimed"
              @click="game.deleteMail(mail!.id)"
            >
              删除
            </button><button
              class="primary-button"
              :disabled="mail.claimed"
              @click="game.claimMail(mail!.id)"
            >
              {{ mail.claimed ? '已领取' : '领取附件' }}
            </button>
          </view><button class="text-btn centered" @click="game.open('mail')">
            返回邮件
          </button>
        </template>

        <template v-else-if="game.panel === 'codex'">
          <view class="muted text-center">
            仙缘录 · 已结识 {{ game.save.heroes.length }} 位道友
          </view><view
            v-for="h in HERO_POOL"
            :key="h.name"
            class="list-row"
            :class="{ undiscovered: !game.save.heroes.some((v) => v.name === h.name) }"
          >
            <view class="hero-mini-seal" :class="`q${h.quality}`">
              {{ h.name[0] }}
            </view><view class="flex-1">
              <view :class="`q${h.quality}`">
                {{ h.name }} · {{ h.role }}
              </view><view class="muted">
                {{ h.description }}
              </view>
            </view><text class="tiny">
              {{ game.save.heroes.some((v) => v.name === h.name) ? '已结识' : '未结识' }}
            </text>
          </view>
        </template>

        <template v-else-if="game.panel === 'chat'">
          <view class="tab-strip">
            <button
              v-for="name in ['世界', '仙盟', '私聊']"
              :key="name"
              :class="{ selected: channel === name }"
              @click="channel = name"
            >
              {{ name }}
            </button>
          </view><view class="chat-history">
            <view
              v-for="(message, index) in game.save.chats.filter((c) => c.channel === channel)"
              :key="index"
              class="chat-message"
              :class="{ own: message.name === game.save.name }"
            >
              <text>{{ message.name }}</text><view>{{ message.text }}</view>
            </view><view v-if="!game.save.chats.some((c) => c.channel === channel)" class="empty-state">
              {{ channel === '仙盟' && !game.save.union ? '加入仙盟后即可传音' : '静候道友传音' }}
            </view>
          </view><view v-if="channel === '私聊'" class="muted">
            收信道友：{{ game.save.friends[0] || '暂无好友' }}
          </view><view class="chat-compose">
            <input
              v-model="chatInput"
              maxlength="100"
              placeholder="道友，说点什么吧…"
              aria-label="传音内容"
              @confirm="
                () => {
                  game.sendChat(chatInput, channel)
                  chatInput = ''
                }
              "
            ><button
              class="primary-button"
              @click="
                () => {
                  game.sendChat(chatInput, channel)
                  chatInput = ''
                }
              "
            >
              发送
            </button>
          </view><view class="muted tiny text-center">
            本地传音记录，无实时服务器连接
          </view>
        </template>

        <template v-else-if="game.panel === 'settings'">
          <view class="setting-profile">
            <GameIcon name="person" :size="80" /><view>
              <view class="scene-heading">
                {{ game.save.name }}
              </view><text class="muted">1区 · 青云问道 · {{ game.realm }}</text>
            </view>
          </view><view class="attribute-row">
            <text>游戏音效</text><button
              class="switch-button"
              :aria-pressed="game.save.sound"
              :class="{ on: game.save.sound }"
              @click="
                () => {
                  game.save.sound = !game.save.sound
                  game.notify(game.save.sound ? '音效已开启' : '音效已关闭')
                }
              "
            >
              {{ game.save.sound ? '开' : '关' }}
            </button>
          </view><button class="setting-row" @click="game.open('rename')">
            <text>更改道号</text><text>100仙玉 ›</text>
          </button><view class="redeem-row">
            <input v-model="textInput" placeholder="输入激活码" aria-label="激活码"><button
              class="small-button"
              @click="game.redeem(textInput)"
            >
              兑换
            </button>
          </view><view class="tiny muted">
            体验码：XIUXIAN2026 / QINGYUN / UNIBEST
          </view><view class="action-row">
            <button class="paper-button" @click="downloadSave">
              导出存档
            </button><button class="paper-button" @click="uploadSave">
              导入存档
            </button>
          </view><button class="paper-button centered" @click="game.leave()">
            切换区服 / 账号
          </button><button class="text-btn danger centered" @click="game.open('reset')">
            重置本地存档
          </button><view class="muted tiny text-center">
            数据保存在本浏览器，可导出备份
          </view>
        </template>

        <template v-else-if="game.panel === 'rename'">
          <view class="prose">
            输入新的道号，2～5位中文、字母或数字，消耗100仙玉。
          </view><input
            v-model="textInput"
            class="paper-input"
            maxlength="5"
            aria-label="新道号"
            placeholder="新的道号"
          ><button class="primary-button centered" @click="game.rename(textInput)">
            确认改名
          </button>
        </template>

        <template v-else-if="game.panel === 'reset' || game.panel === 'import-confirm'">
          <view class="prose text-center">
            {{
              game.panel === 'reset'
                ? '重置将清除当前浏览器中的角色和全部游戏进度。建议先导出存档备份。'
                : '导入将替换当前浏览器存档。确认前请保留现有备份。'
            }}
          </view><view class="action-row">
            <button class="paper-button" @click="game.close()">
              取消
            </button><button
              class="primary-button"
              @click="game.panel === 'reset' ? game.reset() : game.importSave(pendingImport)"
            >
              确认{{ game.panel === 'reset' ? '重置' : '导入' }}
            </button>
          </view>
        </template>

        <template v-else-if="game.panel === 'create-union'">
          <view class="prose text-center">
            创建仙盟消耗500仙玉，仙盟名需为2～8字。
          </view><input
            v-model="textInput"
            class="paper-input"
            maxlength="8"
            placeholder="仙盟名称"
            aria-label="仙盟名称"
          ><button class="primary-button centered" @click="game.joinUnion(textInput, true)">
            开宗立盟
          </button>
        </template>

        <template v-else-if="game.panel === 'leave-union'">
          <view class="prose text-center">
            确定退出 {{ game.save.union }}？已获得的贡献保留。
          </view><view class="action-row">
            <button class="paper-button" @click="game.close()">
              留下
            </button><button
              class="primary-button"
              @click="
                () => {
                  game.save.union = ''
                  game.close()
                  game.notify('已退出仙盟')
                }
              "
            >
              退出
            </button>
          </view>
        </template>

        <template v-else-if="game.panel === 'union-members'">
          <view
            v-for="(name, index) in [
              game.save.name,
              '清风道人',
              '太初剑尊',
              '月下听风',
              '一叶知秋',
            ]"
            :key="name"
            class="list-row"
          >
            <view class="hero-mini-seal">
              {{ name[0] }}
            </view><view class="flex-1">
              {{ name
              }}<view class="muted">
                {{ index === 2 ? '盟主' : '成员' }} · 今日活跃
              </view>
            </view><text class="green">在线</text>
          </view>
        </template>

        <template v-else-if="game.panel === 'union-donate'">
          <view class="activity-detail-art">
            <GameIcon name="coin" :size="110" />
          </view><view class="prose text-center">
            捐献铜贝5000，获得贡献100、仙盟建设100。每日可捐献一次。
          </view><button
            class="primary-button centered"
            :disabled="game.claimed('donate', true)"
            @click="game.donate()"
          >
            {{ game.claimed('donate', true) ? '今日已捐献' : '捐献' }}
          </button>
        </template>

        <template v-else-if="game.panel === 'union-tasks'">
          <view class="task-card">
            <view class="section-title">
              仙盟同心
            </view><view>完成今日捐献 1 次</view><view class="muted">
              贡献 ×100 · 铜贝 ×2000
            </view><button
              class="primary-button centered"
              :disabled="!game.claimed('donate', true) || game.claimed('union-task', true)"
              @click="game.claim('union-task', { contribution: 100, coin: 2000 }, true)"
            >
              领取任务奖励
            </button>
          </view>
        </template>

        <template v-else-if="game.panel === 'union-boss'">
          <view class="activity-detail-art">
            <GameIcon name="monster" :size="135" />
          </view><view class="scene-heading text-center">
            玄冥妖王
          </view><view class="prose text-center">
            与盟友共同守护仙盟。完成首领挑战可获得仙玉、铜贝。
          </view><button
            class="primary-button centered"
            @click="game.startBattle('boss', '仙盟首领 · 玄冥妖王')"
          >
            挑战首领
          </button>
        </template>

        <template v-else-if="game.panel === 'welfare-shortcut'">
          <WelfareScene :initial-tab="game.detailId" />
        </template>

        <template v-else-if="game.panel === 'probability'">
          <view class="prose">
            本地演示奖励概率：仙玉300（10%）、修为1500（35%）、铜贝5000（55%）。每次消耗仙玉50，抽取结果与存档种子一起保存。
          </view>
        </template>

        <template v-else-if="game.panel === 'city-activity'">
          <view class="scene-heading text-center">
            {{
              {
                stone: '灵脉争夺',
                arena: '仙斗榜',
                cross: '仙灵争霸',
                ancient: '上古战场',
                tianji: '天机阁',
              }[game.detailId]
            }}
          </view><view class="activity-detail-art">
            <GameIcon :name="game.detailId === 'stone' ? 'ore' : 'tower'" :size="135" />
          </view><view class="source-event-stats">
            <text>我的战力：{{ game.teamPower }}</text><text>今日挑战：{{ game.save.daily[`city-${game.detailId}`] || 0 }}/3</text><text>奖励：荣誉100、仙玉50</text>
          </view><button
            class="primary-button centered"
            :disabled="(game.save.daily[`city-${game.detailId}`] || 0) >= 3"
            @click="
              () => {
                game.save.daily[`city-${game.detailId}`]
                  = (game.save.daily[`city-${game.detailId}`] || 0) + 1
                game.startBattle('arena', '仙城斗法')
              }
            "
          >
            挑战
          </button>
        </template>
        <template v-else-if="game.panel === 'formation-feature'">
          <view class="scene-heading text-center">
            {{ game.detailId }}
          </view><view class="activity-detail-art">
            <GameIcon name="lotus" :size="150" />
          </view><view class="prose text-center">
            当前等级：{{ game.save.daily[`formation-${game.detailId}`] || 0
            }}<br>消耗铜贝2000提升一次，全体修为+500
          </view><button
            class="primary-button centered"
            @click="
              () => {
                if (game.spend({ coin: 2000 })) {
                  game.save.daily[`formation-${game.detailId}`]
                    = (game.save.daily[`formation-${game.detailId}`] || 0) + 1
                  game.reward({ exp: 500 })
                  game.notify('培养成功')
                }
              }
            "
          >
            培养
          </button>
        </template>
        <template v-else-if="game.panel === 'recruit-exchange'">
          <view class="scene-heading text-center">
            英雄兑换
          </view><view class="prose text-center">
            招募次数 {{ game.save.summon }}/100<br>招募100次可领取仙玉1000。
          </view><button
            class="primary-button centered"
            :disabled="game.save.summon < 100 || game.claimed('summon-100')"
            @click="game.claim('summon-100', { jade: 1000 })"
          >
            领取
          </button>
        </template>
        <template v-else-if="game.panel === 'union-list'">
          <view v-for="name in ['青云仙盟', '烟雨楼', '问道阁']" :key="name" class="list-row">
            <text class="flex-1">{{ name }}</text><text>等级5 成员29/30</text>
          </view><button class="paper-button centered" @click="game.open('leave-union')">
            退出仙盟
          </button>
        </template>
        <template v-else-if="game.panel === 'union-log'">
          <view class="list-row">
            {{ game.save.name }} 加入了仙盟
          </view><view v-if="game.save.unionExp" class="list-row">
            {{ game.save.name }} 捐献铜贝，建设度+{{ game.save.unionExp }}
          </view>
        </template>
        <template v-else-if="game.panel === 'union-apply'">
          <view class="empty-state">
            暂无入盟申请
          </view>
        </template>
        <template v-else-if="game.panel === 'union-settings' || game.panel === 'union-notice'">
          <view class="prose text-center">
            仅盟主可修改仙盟设置与公告。
          </view><button class="paper-button centered" @click="game.close()">
            确认
          </button>
        </template>
        <template v-else-if="game.panel === 'union-recruit'">
          <view class="prose text-center">
            向世界发布仙盟招募信息？
          </view><button
            class="primary-button centered"
            @click="
              () => {
                game.sendChat(`${game.save.union}招募同道，共赴仙途。`, '世界')
                game.close()
                game.notify('招募已发布')
              }
            "
          >
            发布招募
          </button>
        </template>
        <template v-else-if="game.panel === 'union-four' || game.panel === 'union-war'">
          <view class="activity-detail-art">
            <GameIcon name="monster" :size="135" />
          </view><view class="scene-heading text-center">
            {{ game.panel === 'union-four' ? '仙盟四象' : '仙盟争锋' }}
          </view><view class="prose text-center">
            协力修行，共御强敌。今日剩余
            {{ Math.max(0, 3 - (game.save.daily['union-war'] || 0)) }} 次。
          </view><button
            class="primary-button centered"
            :disabled="(game.save.daily['union-war'] || 0) >= 3"
            @click="
              () => {
                game.save.daily['union-war'] = (game.save.daily['union-war'] || 0) + 1
                game.startBattle('boss', '仙盟试炼')
              }
            "
          >
            挑战
          </button>
        </template>
        <template v-else-if="game.panel === 'union-rank'">
          <view
            v-for="(name, index) in ['青云仙盟', '烟雨楼', '问道阁']"
            :key="name"
            class="rank-row"
          >
            <text>{{ index + 1 }}</text><text class="flex-1">{{ name }}</text><text>{{ 1000000 - index * 200000 }}</text>
          </view>
        </template>
        <template v-else-if="game.panel === 'enemy' && enemy">
          <view class="detail-name" :class="`q${enemy.quality}`">
            {{ enemy.name }}
          </view><view class="prose text-center">
            等级 {{ enemy.level }} · {{ enemy.role }}<br>气血 {{ enemy.hp }}/{{ enemy.maxHp
            }}<br>攻击 {{ enemy.attack }} · 防御 {{ enemy.defense }}<br>神通：{{ enemy.skill }}
          </view>
        </template>
      </view>
    </view>
  </view>
</template>
