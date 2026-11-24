import referenceContent from './reference-content.json'
import type { IBuilding, IGameSave, IHero, IItem, ModuleId, Resource } from './types'

export const MODULES: { id: ModuleId, label: string, icon: string, featured?: boolean }[] = [
  { id: 'hero', label: '道友', icon: 'person' },
  { id: 'bag', label: '包裹', icon: 'bag' },
  { id: 'abode', label: '洞府', icon: 'house' },
  { id: 'battle', label: '战斗', icon: 'sword', featured: true },
  { id: 'experience', label: '探索', icon: 'mountain' },
  { id: 'welfare', label: '活动', icon: 'gift' },
  { id: 'city', label: '仙城', icon: 'city' },
]
export const RESOURCES: Record<Resource, string> = {
  exp: '修为',
  coin: '铜贝',
  jade: '仙玉',
  energy: '灵气',
  liquid: '灵液',
  honor: '荣誉',
  friendship: '友情',
  contribution: '贡献',
}
export const QUALITY = ['凡品', '良品', '上品', '极品', '仙品', '神品', '圣品']
export const REALMS = ['炼气', '筑基', '结丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫']
export const REGIONS = ['青云山', '落霞谷', '幽冥泽', '天阙峰', '无尽海', '昆仑墟']
export const HERO_POOL: Omit<
  IHero,
  'id' | 'level' | 'star' | 'stage' | 'train' | 'fragments' | 'invested'
>[] = referenceContent.heroes
export const ITEM_TEMPLATES: Omit<IItem, 'id' | 'count' | 'enhance'>[] = [
  {
    name: '聚气丹',
    kind: '道具',
    quality: 2,
    icon: 'pill',
    description: '服用后获得修为 600，可用于提升道友境界。',
  },
  { name: '渡劫丹', kind: '道具', quality: 4, icon: 'pill', description: '渡劫突破所需的丹药。' },
  {
    name: '仙玉招募令',
    kind: '道具',
    quality: 3,
    icon: 'scroll',
    description: '用于一次普通招募。',
  },
  {
    name: '玄铁',
    kind: '道具',
    quality: 2,
    icon: 'ore',
    description: '炼器与装备强化的基础材料。',
  },
  {
    name: '灵草',
    kind: '道具',
    quality: 1,
    icon: 'leaf',
    description: '山野间采得的草药，可用于炼丹。',
  },
  { name: '铜贝袋', kind: '道具', quality: 2, icon: 'coin', description: '打开获得铜贝 2000。' },
  {
    name: '碧波宝刀',
    kind: '装备',
    quality: 3,
    icon: 'sword',
    slot: '武器',
    description: '由灵器师精心炼制而成。因其材质轻巧，并且能批量打造。',
  },
  {
    name: '碧波宝甲',
    kind: '装备',
    quality: 3,
    icon: 'robe',
    slot: '衣服',
    description: '由灵器师精心炼制而成。因其材质轻巧，并且能批量打造。',
  },
  {
    name: '碧波宝戒',
    kind: '装备',
    quality: 2,
    icon: 'jade',
    slot: '饰品',
    description: '由灵器师精心炼制而成。因其材质轻巧，并且能批量打造。',
  },
  {
    name: '碧波宝鞋',
    kind: '装备',
    quality: 2,
    icon: 'boot',
    slot: '鞋子',
    description: '由灵器师精心炼制而成。因其材质轻巧，并且能批量打造。',
  },
  {
    name: '珈蓝战刃',
    kind: '装备',
    quality: 1,
    icon: 'sword',
    slot: '武器',
    description:
      '相传由著名灵器师通过淬火打造而成。剑锋隐隐有流风毒液，脱手即可破风而出，削铁如泥。',
  },
  {
    name: '青木葫芦',
    kind: '法宝',
    quality: 3,
    icon: 'bottle',
    slot: '法宝',
    description: '收天地灵气于壶中。气血 +800，攻击 +80。',
  },
  {
    name: '渔神网·法宝',
    kind: '法宝',
    quality: 4,
    icon: 'bell',
    slot: '法宝',
    description: '铃音摄魂。攻击 +180，防御 +50。',
  },
  {
    name: '轩辕·仙器',
    kind: '仙器',
    quality: 4,
    icon: 'mirror',
    slot: '仙器',
    description: '洞照太虚。全属性获得提升。',
  },
  {
    name: '仙灵碎片',
    kind: '碎片',
    quality: 4,
    icon: 'shard',
    description: '集齐 10 枚可合成一枚仙玉招募令。',
  },
]
export const BUILDINGS: IBuilding[] = [
  {
    id: 'spirit',
    name: '炼神',
    icon: 'lotus',
    level: 1,
    x: 54,
    y: 12,
    description: '炼神凝魄，提升洞府境界。',
  },
  {
    id: 'library',
    name: '功法',
    icon: 'scroll',
    level: 1,
    x: 20,
    y: 30,
    description: '参悟功法，提升全体道友属性。',
  },
  {
    id: 'alchemy',
    name: '灵池',
    icon: 'bottle',
    level: 1,
    x: 77,
    y: 35,
    description: '聚集灵气，培养金木水火土灵根。',
  },
  {
    id: 'forge',
    name: '练功房',
    icon: 'sword',
    level: 1,
    x: 57,
    y: 52,
    description: '道友闭关，领取修炼产出。',
  },
  {
    id: 'field',
    name: '五行力',
    icon: 'lotus',
    level: 1,
    x: 22,
    y: 66,
    description: '运转金木水火土五行灵根。',
  },
  {
    id: 'adventure',
    name: '书阁',
    icon: 'mountain',
    level: 1,
    x: 76,
    y: 80,
    description: '学习丹方器方，炼丹炼器。',
  },
]

export function shanghaiDay(now = Date.now()): string {
  return new Date(now + 8 * 3600000).toISOString().slice(0, 10)
}
export function makeHero(index: number, id: string): IHero {
  return {
    ...HERO_POOL[index % HERO_POOL.length],
    id,
    level: 12,
    star: 0,
    stage: 0,
    train: 0,
    fragments: 0,
    invested: 0,
  }
}
export function makeItem(index: number, id: string, count = 1): IItem {
  return { ...ITEM_TEMPLATES[index % ITEM_TEMPLATES.length], id, count, enhance: 0 }
}
export function initialSave(): IGameSave {
  const now = Date.now()
  return {
    version: 1,
    created: false,
    name: '云无涯',
    sex: '男',
    camp: '剑修',
    server: 1,
    realm: 0,
    chapter: 1,
    cleared: 0,
    wallet: {
      exp: 16800,
      coin: 128600,
      jade: 3680,
      energy: 1200,
      liquid: 960,
      honor: 600,
      friendship: 300,
      contribution: 0,
    },
    heroes: Array.from({ length: 6 }, (_, i) => makeHero(i, `hero-${i}`)),
    formation: Array.from({ length: 6 }, (_, i) => `hero-${i}`),
    items: ITEM_TEMPLATES.map((_, i) =>
      makeItem(i, `item-${i}`, i < 6 ? [12, 8, 15, 40, 30, 3][i] : i === 14 ? 20 : 1),
    ),
    buildings: BUILDINGS.map(b => ({ ...b })),
    mails: [
      {
        id: 'welcome',
        title: '仙途启程礼',
        body: '道友初入仙途，特备薄礼一份。愿你于万千山海间，寻得自己的长生大道。',
        read: false,
        claimed: false,
        rewards: { jade: 300, exp: 1200, coin: 5000 },
      },
      {
        id: 'notice',
        title: '青云山修行札记',
        body: '炼气修行，贵在持恒。挑战主线可提升挂机收益，别忘了为道友配置装备、调整阵法。',
        read: false,
        claimed: true,
        rewards: {},
      },
    ],
    claims: [],
    day: shanghaiDay(now),
    daily: {},
    lastIdle: now - 1800000,
    lastSeen: now,
    played: 0,
    createdAt: now,
    seed: 20261122,
    summon: 0,
    advancedSummon: 0,
    tower: 1,
    arena: 128,
    union: '',
    unionExp: 0,
    friends: ['清风道人', '一叶知秋'],
    chats: [{ name: '清风道人', text: '青云山下，可有道友同行？', channel: '世界' }],
    cropAt: 0,
    craft: null,
    sound: false,
  }
}
