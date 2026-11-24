import type { Resource } from '@/game/types'

export interface IActivity {
  id: string
  name: string
  description: string
  icon: string
  limit: number
  reward: Partial<Record<Resource, number>>
}

// Local service catalog. No HTTP client, platform SDK, payment or websocket is used.
export const MOCK_ACTIVITIES: IActivity[] = [
  {
    id: 'material',
    name: '材料秘境',
    description: '灵石洞窟 · 炼器谷 · 丹草园',
    icon: 'ore',
    limit: 3,
    reward: { coin: 6000, exp: 1200 },
  },
  {
    id: 'tower',
    name: '镇妖塔',
    description: '层层试炼，以战证道',
    icon: 'tower',
    limit: 20,
    reward: { jade: 80, exp: 1500 },
  },
  {
    id: 'boss',
    name: '世界首领',
    description: '玄冥妖王 · 挑战强敌',
    icon: 'monster',
    limit: 3,
    reward: { jade: 120, coin: 10000 },
  },
  {
    id: 'arena',
    name: '竞技场',
    description: '与天下道友切磋论道',
    icon: 'sword',
    limit: 5,
    reward: { honor: 100, jade: 50 },
  },
  {
    id: 'relic',
    name: '远古遗迹',
    description: '寻觅上古修士留下的机缘',
    icon: 'mountain',
    limit: 3,
    reward: { exp: 2400, jade: 60 },
  },
  {
    id: 'team',
    name: '组队副本',
    description: '携道友同行，探三千秘境',
    icon: 'person',
    limit: 3,
    reward: { exp: 1800, coin: 8000 },
  },
]

// CarbonSkin's original map entrances. Names and placement follow the H5 client.
MOCK_ACTIVITIES.push(
  {
    id: 'ascend',
    name: '登仙台',
    description: '登临仙台，渡劫飞升',
    icon: 'tower',
    limit: 3,
    reward: { exp: 2400, jade: 100 },
  },
  {
    id: 'wander',
    name: '云游',
    description: '云游四海，寻觅仙缘',
    icon: 'mountain',
    limit: 5,
    reward: { coin: 3000, energy: 300 },
  },
  {
    id: 'trial',
    name: '神魔试炼',
    description: '神魔试炼，砥砺修行',
    icon: 'sword',
    limit: 3,
    reward: { exp: 2000, jade: 100 },
  },
  {
    id: 'invasion',
    name: '魔神降临',
    description: '魔神降临，共御强敌',
    icon: 'monster',
    limit: 3,
    reward: { coin: 8000, jade: 100 },
  },
  {
    id: 'holy',
    name: '圣兽境地',
    description: '圣兽境地，寻觅灵兽',
    icon: 'monster',
    limit: 3,
    reward: { exp: 1600, liquid: 100 },
  },
  {
    id: 'veins',
    name: '经脉谷',
    description: '通达经脉，凝练真元',
    icon: 'lotus',
    limit: 3,
    reward: { exp: 1800, energy: 300 },
  },
)
MOCK_ACTIVITIES.find(a => a.id === 'arena')!.name = '夺天之争'
MOCK_ACTIVITIES.find(a => a.id === 'boss')!.name = '魔王来袭'
MOCK_ACTIVITIES.find(a => a.id === 'material')!.name = '日常副本'

export const MOCK_RANKINGS = [
  { name: '太初剑尊', realm: '化神九重', power: 986520 },
  { name: '月下听风', realm: '化神七重', power: 862400 },
  { name: '一剑霜寒', realm: '元婴九重', power: 756320 },
  { name: '长生客', realm: '元婴七重', power: 684200 },
  { name: '清风道人', realm: '结丹九重', power: 528900 },
  { name: '一叶知秋', realm: '结丹六重', power: 389420 },
  { name: '枕山听雨', realm: '筑基九重', power: 256400 },
  { name: '云间月', realm: '筑基五重', power: 163200 },
]
export const MOCK_UNIONS = [
  { name: '青云仙盟', level: 5, members: 28, motto: '青云有路，携手长生。' },
  { name: '烟雨楼', level: 4, members: 21, motto: '一蓑烟雨任平生。' },
  { name: '问道阁', level: 3, members: 16, motto: '朝闻道，夕可矣。' },
]
export const WELFARE_TABS = [
  '每日签到',
  '七日登录',
  '在线奖励',
  '成长基金',
  '祈福',
  '幸运转盘',
  '首充豪礼',
  '月卡',
  '每日礼包',
]
export const NOTICE
  = '山海有期，仙途无尽。欢迎来到封天神魔。开服七日可领取丰厚修行物资，每日签到、完成任务皆可积累仙玉。愿与诸位道友，同赴长生之约。'
