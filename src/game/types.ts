export type Resource
  = | 'exp'
    | 'coin'
    | 'jade'
    | 'energy'
    | 'liquid'
    | 'honor'
    | 'friendship'
    | 'contribution'
export type ModuleId
  = | 'battle'
    | 'hero'
    | 'bag'
    | 'abode'
    | 'experience'
    | 'union'
    | 'welfare'
    | 'city'
export type ItemKind = '道具' | '装备' | '法宝' | '仙器' | '碎片'
export interface IHero {
  id: string
  name: string
  quality: number
  role: string
  camp: string
  level: number
  star: number
  stage: number
  train: number
  fragments: number
  skill: string
  skillDescription?: string
  description: string
  main?: boolean
  invested: number
}
export interface IItem {
  id: string
  name: string
  kind: ItemKind
  quality: number
  icon: string
  count: number
  description: string
  slot?: string
  equipped?: string
  locked?: boolean
  enhance: number
}
export interface IBuilding {
  id: string
  name: string
  icon: string
  level: number
  x: number
  y: number
  description: string
}
export interface IMail {
  id: string
  title: string
  body: string
  read: boolean
  claimed: boolean
  rewards: Partial<Record<Resource, number>>
}
export interface IChat {
  name: string
  text: string
  channel: string
}
export interface IGameSave {
  version: 1
  created: boolean
  name: string
  sex: string
  camp: string
  server: number
  realm: number
  chapter: number
  cleared: number
  wallet: Record<Resource, number>
  heroes: IHero[]
  formation: (string | null)[]
  items: IItem[]
  buildings: IBuilding[]
  mails: IMail[]
  claims: string[]
  day: string
  daily: Record<string, number>
  lastIdle: number
  lastSeen: number
  played: number
  createdAt: number
  seed: number
  summon: number
  advancedSummon: number
  tower: number
  arena: number
  union: string
  unionExp: number
  friends: string[]
  chats: IChat[]
  cropAt: number
  craft: { kind: string, ends: number } | null
  sound: boolean
}
export interface IStats {
  hp: number
  attack: number
  defense: number
  speed: number
}
export type SkillShape = 'single' | 'all' | 'row' | 'multi2' | 'multi3' | 'strongest' | 'lowest' | 'heal' | 'healAll'
export type BuffKind = 'shield' | 'attack' | 'defense' | 'reduce' | 'crit' | 'silence'
export interface IBuff {
  id: string
  name: string
  kind: BuffKind
  value: number
  turns: number
}
export interface IBattleHit {
  target: string
  amount: number
  heal?: boolean
  critical?: boolean
  absorbed?: number
}
export interface IUnit extends IStats {
  position?: number
  id: string
  name: string
  quality: number
  role: string
  level: number
  skill: string
  skillDescription?: string
  maxHp: number
  energy: number
  buffs?: IBuff[]
  main?: boolean
}
export interface IBattleEvent {
  text: string
  actor: string
  target: string
  amount: number
  heal?: boolean
  skill?: boolean
  skillShape?: SkillShape
  skillLabel?: string
  hits: IBattleHit[]
  buffs?: IBuff[]
  energyBefore: number
  energyAfter: number
}
export interface IBattle {
  status: 'idle' | 'fighting' | 'won' | 'lost'
  source: string
  title: string
  allies: IUnit[]
  enemies: IUnit[]
  round: number
  turn: number
  log: string[]
  active: string
  event: IBattleEvent | null
  seed: number
  reward: Partial<Record<Resource, number>>
}
