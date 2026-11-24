import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initialSave, shanghaiDay } from './data'
import { heroStats, makeBattle, stepBattle, validateSave } from './engine'
import { useGameStore } from '@/store/game'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-22T08:00:00Z'))
})
afterEach(() => vi.useRealTimers())

describe('local economy and persistence boundaries', () => {
  it('accepts valid snapshots and rejects incomplete or corrupt wallets', () => {
    const value = initialSave()
    expect(validateSave(value)).toBe(true)
    expect(validateSave({ version: 1 })).toBe(false)
    value.wallet.jade = -1
    expect(validateSave(value)).toBe(false)
  })
  it('rejects duplicate deployed heroes and orphan formation references', () => {
    const save = initialSave()
    save.formation[1] = save.formation[0]
    expect(validateSave(save)).toBe(false)
    save.formation[1] = 'missing'
    expect(validateSave(save)).toBe(false)
  })
  it('does not replace an existing save after a rejected import', () => {
    const g = useGameStore()
    g.save.wallet.jade = 123
    expect(g.importSave({ version: 1 })).toBe(false)
    expect(g.save.wallet.jade).toBe(123)
  })
  it('validates names and creates the role once', () => {
    const g = useGameStore()
    expect(g.create('<x>', '男', '人')).toBe(false)
    expect(g.create('云青尘', '男', '人')).toBe(true)
    expect(g.create('苏映月', '女', '仙')).toBe(false)
    expect(g.save.heroes[0].name).toBe('云青尘')
  })
  it('prevents double claims and partial spending', () => {
    const g = useGameStore()
    const before = { ...g.save.wallet }
    expect(g.claim('mail', { jade: 100 })).toBe(true)
    expect(g.claim('mail', { jade: 100 })).toBe(false)
    expect(g.save.wallet.jade).toBe(before.jade + 100)
    expect(g.spend({ coin: 1, jade: 99999999 })).toBe(false)
    expect(g.save.wallet.coin).toBe(before.coin)
  })
  it('caps offline rewards at 12 hours and cannot collect the same interval twice', () => {
    const g = useGameStore()
    g.save.lastIdle = Date.now() - 24 * 3600000
    g.tick()
    expect(g.idleSeconds).toBe(43200)
    const exp = g.save.wallet.exp
    const earned = g.idleReward.exp
    g.claimIdle()
    g.claimIdle()
    expect(g.save.wallet.exp).toBe(exp + earned)
    expect(g.idleSeconds).toBe(0)
  })
  it('resets daily attempts at the Shanghai date boundary', () => {
    expect(shanghaiDay(Date.parse('2026-11-22T15:59:59Z'))).toBe('2026-11-22')
    expect(shanghaiDay(Date.parse('2026-11-22T16:00:00Z'))).toBe('2026-11-23')
    const g = useGameStore()
    g.save.daily.boss = 3
    g.claim('sign', { coin: 10 }, true)
    vi.setSystemTime(new Date('2026-11-22T16:00:00Z'))
    g.tick()
    expect(g.save.daily.boss).toBeUndefined()
    expect(g.claimed('sign', true)).toBe(false)
  })
  it('keeps locked and equipped items out of bulk smelting', () => {
    const g = useGameStore()
    const equipment = g.save.items.filter(i => i.kind === '装备')
    equipment[0].locked = true
    equipment[1].equipped = g.hero.id
    g.smelt(6)
    expect(equipment[0].count).toBe(1)
    expect(equipment[1].count).toBe(1)
    expect(equipment[2].count).toBe(0)
  })
  it('transfers equipment without duplicating its slot and changes battle stats', () => {
    const g = useGameStore()
    const sword = g.save.items.find(i => i.name === '碧波宝刀')!
    const stats = heroStats(g.hero, g.save)
    g.operateItem(sword.id, 'equip')
    expect(heroStats(g.hero, g.save).attack).toBeGreaterThan(stats.attack)
    const other = g.save.heroes[1]
    g.selectedHero = other.id
    g.operateItem(sword.id, 'equip')
    expect(sword.equipped).toBe(other.id)
    expect(heroStats(g.save.heroes[0], g.save).attack).toBe(stats.attack)
  })
  it('rejects early harvesting and claims completed crafts once', () => {
    const g = useGameStore()
    const herbs = g.save.items.find(i => i.name === '灵草')!
    const initial = herbs.count
    g.buildingAction('field')
    g.buildingAction('field')
    expect(herbs.count).toBe(initial)
    vi.advanceTimersByTime(31000)
    g.tick()
    g.buildingAction('field')
    expect(herbs.count).toBe(initial + 5)
    g.buildingAction('alchemy')
    expect(herbs.count).toBe(initial)
    const pill = g.save.items.find(i => i.name === '聚气丹')!
    const count = pill.count
    g.buildingAction('alchemy')
    expect(pill.count).toBe(count)
    vi.advanceTimersByTime(16000)
    g.tick()
    g.buildingAction('alchemy')
    expect(pill.count).toBe(count + 1)
    expect(g.save.craft).toBeNull()
  })
  it('refuses locked item sale and unclaimed mail deletion', () => {
    const g = useGameStore()
    const i = g.save.items[0]
    i.locked = true
    const count = i.count
    g.operateItem(i.id, 'sell')
    expect(i.count).toBe(count)
    g.deleteMail('welcome')
    expect(g.save.mails.some(m => m.id === 'welcome')).toBe(true)
    g.claimMail('welcome')
    const jade = g.save.wallet.jade
    g.claimMail('welcome')
    expect(g.save.wallet.jade).toBe(jade)
    g.deleteMail('welcome')
    expect(g.save.mails.some(m => m.id === 'welcome')).toBe(false)
  })
  it('uses summon tokens and gives ten distinct results for a ten pull', () => {
    const g = useGameStore()
    const tokens = g.save.items.find(i => i.name === '仙玉招募令')!
    const before = g.save.wallet.jade
    g.summon('普通', 10)
    expect(tokens.count).toBe(5)
    expect(g.save.wallet.jade).toBe(before)
    expect(g.recruitResult).toHaveLength(10)
    expect(g.save.summon).toBe(10)
  })
  it('refunds the amount actually spent on upgrades, once', () => {
    const g = useGameStore()
    const exp = g.save.wallet.exp
    g.levelHero(g.hero.id, 2)
    const invested = g.hero.invested
    expect(g.save.wallet.exp).toBe(exp - invested)
    g.rebirth(g.hero.id)
    expect(g.save.wallet.exp).toBe(exp)
    g.rebirth(g.hero.id)
    expect(g.save.wallet.exp).toBe(exp)
  })
})

describe('deterministic automatic combat', () => {
  it('replays the same snapshot and seed identically', () => {
    const save = initialSave()
    const a = makeBattle(save)
    const b = makeBattle(save)
    for (let i = 0; i < 90; i++) {
      stepBattle(a)
      stepBattle(b)
    }
    expect(a).toEqual(b)
  })
  it('reaches a real result without negative hp', () => {
    const b = makeBattle(initialSave())
    let steps = 0
    while (b.status === 'fighting' && steps++ < 500) stepBattle(b)
    expect(['won', 'lost']).toContain(b.status)
    expect([...b.allies, ...b.enemies].every(h => h.hp >= 0 && h.hp <= h.maxHp)).toBe(true)
  })
  it('uses original chapter enemy names and formation positions', () => {
    const b = makeBattle(initialSave())
    expect(b.title).toContain('侯月灵')
    expect(b.enemies).toHaveLength(1)
    expect(b.enemies[0].name).toBe('侯月灵')
    expect(b.enemies[0].position).toBe(4)
  })
  it('releases a charged skill and resets the actor energy', () => {
    const b = makeBattle(initialSave())
    const actor = [...b.allies, ...b.enemies].sort((left, right) => right.speed - left.speed)[0]
    actor.energy = 100
    const event = stepBattle(b)
    expect(event?.actor).toBe(actor.id)
    expect(event?.skill).toBe(true)
    expect(actor.energy).toBe(0)
  })
  it('uses mock skill text to hit all enemies and create a shield buff', () => {
    const b = makeBattle(initialSave(), 'boss')
    const actor = [...b.allies, ...b.enemies].sort((left, right) => right.speed - left.speed)[0]
    actor.energy = 100
    actor.skillDescription = '攻击全体敌人，造成伤害，并给自己添加相当自身攻击50%的吸收盾持续2回合'
    const event = stepBattle(b)
    expect(event?.skillShape).toBe('all')
    expect(event?.hits.length).toBeGreaterThan(1)
    expect(actor.buffs?.some(buff => buff.kind === 'shield')).toBe(true)
  })
  it('uses different mock enemy lineups for activity battles', () => {
    const arena = makeBattle(initialSave(), 'arena')
    const material = makeBattle(initialSave(), 'material')
    expect(arena.enemies).toHaveLength(6)
    expect(material.enemies).toHaveLength(3)
    expect(arena.enemies[0].name).not.toBe(material.enemies[0].name)
    expect(arena.enemies.every(enemy => enemy.buffs?.length === 0)).toBe(true)
  })
  it('preserves empty allied positions when creating a battle', () => {
    const save = initialSave()
    save.formation[1] = null
    const b = makeBattle(save)
    expect(b.allies.map(h => h.position)).toEqual([0, 2, 3, 4, 5])
  })
  it('settles a win once and skip does not grant a second reward', () => {
    const g = useGameStore()
    g.create('云青尘', '男', '人')
    g.startBattle()
    g.skipBattle()
    expect(g.battle.status).toBe('won')
    const coin = g.save.wallet.coin
    g.step()
    g.skipBattle()
    expect(g.save.wallet.coin).toBe(coin)
  })
  it('stops at the activity daily limit and does not reward retreats', () => {
    const g = useGameStore()
    g.create('云青尘', '男', '人')
    const coin = g.save.wallet.coin
    for (let i = 0; i < 4; i++) {
      g.startBattle('boss')
      g.retreat()
    }
    expect(g.save.daily.boss).toBe(3)
    expect(g.save.wallet.coin).toBe(coin)
  })
})
