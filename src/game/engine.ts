import referenceContent from './reference-content.json'
import type { IBattle, IBattleEvent, IBattleHit, IBuff, IGameSave, IHero, IStats, IUnit, SkillShape } from './types'
import { getSkillProfile, mockEnemySkill } from './skills'

const ACTIVITY_BATTLE: Record<string, { count: number, difficulty: number, names: string[] }> = {
  mob: { count: 3, difficulty: 0.45, names: ['山野精魄', '赤尾小妖', '青竹蛇灵'] },
  tower: { count: 3, difficulty: 1.25, names: ['镇塔妖将', '镇塔妖卫', '镇塔灵兽'] },
  boss: { count: 3, difficulty: 3.6, names: ['玄冥妖王', '护法妖卫', '护法妖卫'] },
  arena: { count: 6, difficulty: 1.5, names: [] },
  material: { count: 3, difficulty: 1.15, names: ['灵石傀儡', '炼器火灵', '丹草妖藤'] },
  relic: { count: 3, difficulty: 1.75, names: ['遗迹守卫', '古阵残灵', '守宝石像'] },
  team: { count: 4, difficulty: 1.8, names: ['秘境地煞', '秘境天魔', '秘境妖尊', '秘境主宰'] },
  ascend: { count: 3, difficulty: 2.2, names: ['登仙雷灵', '渡劫天将', '天门守卫'] },
  wander: { count: 2, difficulty: 1.35, names: ['山野精怪', '云游散修'] },
  trial: { count: 2, difficulty: 1.8, names: ['试炼魔影', '试炼神将'] },
  invasion: { count: 3, difficulty: 2.5, names: ['魔神先锋', '魔神祭司', '魔神战将'] },
  holy: { count: 2, difficulty: 2.1, names: ['圣兽幼崽', '圣兽守卫'] },
  veins: { count: 1, difficulty: 1.3, names: ['经脉毒瘴'] },
}

export function random(seed: number): [number, number] {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return [next / 4294967296, next]
}

export function heroStats(hero: IHero, save: IGameSave): IStats {
  const mult
    = (1 + hero.quality * 0.12) * (1 + hero.star * 0.16 + hero.stage * 0.2 + hero.train * 0.025)
  const stats = {
    hp: Math.round((1200 + hero.level * 210) * mult),
    attack: Math.round((140 + hero.level * 28) * mult),
    defense: Math.round((60 + hero.level * 12) * mult),
    speed: 85 + hero.level + (hero.role === '灵修' ? 35 : 0),
  }
  if (hero.role === '体修') {
    stats.hp = Math.round(stats.hp * 1.6)
    stats.defense = Math.round(stats.defense * 1.3)
  }
  for (const item of save.items.filter(i => i.equipped === hero.id)) {
    const gain = item.quality * (1 + item.enhance * 0.1)
    stats.attack += Math.round(35 * gain)
    stats.hp += Math.round(160 * gain)
    stats.defense += Math.round(15 * gain)
  }
  const library = save.buildings.find(b => b.id === 'library')?.level || 1
  stats.attack = Math.round(stats.attack * (1 + (library - 1) * 0.03))
  return stats
}
export function power(hero: IHero, save: IGameSave): number {
  const s = heroStats(hero, save)
  return Math.round(s.hp / 4 + s.attack * 3 + s.defense * 2 + s.speed)
}
export function emptyBattle(): IBattle {
  return {
    status: 'idle',
    source: 'main',
    title: '',
    allies: [],
    enemies: [],
    round: 1,
    turn: 0,
    log: [],
    active: '',
    event: null,
    seed: 1,
    reward: {},
  }
}
export function makeBattle(save: IGameSave, source = 'main', title = ''): IBattle {
  const level = source === 'mob' ? 3 + Math.min(save.chapter, 50) : source === 'tower' ? save.tower * 2 + 8 : source === 'arena' ? 16 : 7 + save.chapter
  const allies: IUnit[] = save.formation.flatMap((id, position) => {
    const hero = save.heroes.find(h => h.id === id)
    if (!hero)
      return []
    const stats = heroStats(hero, save)
    return [
      {
        ...stats,
        id: hero.id,
        name: hero.name,
        quality: hero.quality,
        role: hero.role,
        level: hero.level,
        skill: hero.skill,
        skillDescription: hero.skillDescription,
        maxHp: stats.hp,
        position,
        energy: 70,
        buffs: [],
        main: hero.main,
      },
    ]
  })
  const battleConfig = ACTIVITY_BATTLE[source]
  const arenaHeroes = referenceContent.heroes.slice(0, 6)
  const enemyCount = battleConfig?.count || 6
  const difficulty = battleConfig?.difficulty || 1
  const enemies: IUnit[] = Array.from({ length: enemyCount }, (_, i) => {
    const arenaHero = source === 'arena' ? arenaHeroes[i] : undefined
    const mockSkill = mockEnemySkill(i)
    const hp = Math.round((900 + level * 160) * difficulty)
    return {
      id: `enemy-${i}`,
      name: arenaHero?.name || battleConfig?.names[i] || ['山林精怪', '赤尾妖狐', '青竹蛇妖', '巡山妖兵', '山魈', '妖狼头领'][i],
      quality: arenaHero?.quality ?? (i === 5 || source === 'boss' ? 3 : i % 3),
      role: arenaHero?.role || (source === 'boss' ? '首领' : '妖兽'),
      level,
      skill: arenaHero?.skill || mockSkill.skill,
      skillDescription: arenaHero?.skillDescription || mockSkill.skillDescription,
      position: i + 1,
      hp,
      maxHp: hp,
      attack: Math.round((100 + level * 22) * difficulty) + (arenaHero ? Math.round(arenaHero.quality * 8) : 0),
      defense: 45 + level * 9,
      speed: 70 + level + (arenaHero?.role === '灵修' ? 12 : 0),
      energy: 50,
      buffs: [],
    }
  })
  const referenceChapter
    = referenceContent.campaigns[String(save.chapter) as keyof typeof referenceContent.campaigns]
  if (source === 'main' && referenceChapter?.enemies.length) {
    enemies.splice(
      0,
      enemies.length,
      ...referenceChapter.enemies.map((enemy, i) => ({
        ...enemy,
        id: `enemy-${i}`,
        role: '道友',
        skillDescription: mockEnemySkill(i).skillDescription,
        position: enemy.position,
        speed: 70 + enemy.level,
        maxHp: enemy.hp,
        energy: 50,
        buffs: [],
      })),
    )
  }
  // Mock balance: guarantee one full allied round so the energy bar can visibly
  // fill and the next action can release the charged skill.
  if (source === 'main' && enemies.length) {
    const alliedAttack = allies.reduce((total, unit) => total + unit.attack, 0)
    const currentHp = enemies.reduce((total, unit) => total + unit.hp, 0)
    const minimumHp = Math.round(alliedAttack * 1.15)
    if (currentHp > 0 && currentHp < minimumHp) {
      const scale = minimumHp / currentHp
      for (const enemy of enemies) {
        enemy.hp = Math.round(enemy.hp * scale)
        enemy.maxHp = enemy.hp
      }
    }
  }

  return {
    ...emptyBattle(),
    status: 'fighting',
    source,
    title: title || `第${save.chapter}关 · ${referenceChapter?.name || '修行'}`,
    allies,
    enemies,
    seed: save.seed,
    log: ['双方列阵，斗法开始。'],
  }
}

function living(units: IUnit[]): IUnit[] {
  return units.filter(unit => unit.hp > 0)
}

function rowOf(unit: IUnit, allied: boolean): number {
  const slot = allied ? (unit.position ?? 0) : Math.max(0, (unit.position ?? 1) - 1)
  return slot < 3 ? 0 : 1
}

function buffValue(unit: IUnit, kind: IBuff['kind']): number {
  return (unit.buffs || []).filter(buff => buff.kind === kind).reduce((total, buff) => total + buff.value, 0)
}

function addBuff(unit: IUnit, buff: IBuff, log: IBuff[]): void {
  if (!unit.buffs)
    unit.buffs = []
  const existing = unit.buffs.find(item => item.id === buff.id)
  if (existing) {
    existing.value = Math.max(existing.value, buff.value)
    existing.turns = Math.max(existing.turns, buff.turns)
  }
  else {
    unit.buffs.push(buff)
  }
  log.push(buff)
}

function tickBuffs(unit: IUnit): void {
  if (!unit.buffs)
    return
  for (const buff of unit.buffs) buff.turns--
  unit.buffs = unit.buffs.filter(buff => buff.turns > 0 && (buff.kind !== 'shield' || buff.value > 0))
}

function pickRandom(units: IUnit[], count: number, roll: () => number): IUnit[] {
  const pool = [...units]
  const picked: IUnit[] = []
  while (pool.length && picked.length < count) {
    const index = Math.min(pool.length - 1, Math.floor(roll() * pool.length))
    picked.push(pool.splice(index, 1)[0])
  }
  return picked
}

function chooseTargets(
  shape: SkillShape,
  allied: boolean,
  battle: IBattle,
  roll: () => number,
): IUnit[] {
  const own = living(allied ? battle.allies : battle.enemies)
  const opposing = living(allied ? battle.enemies : battle.allies)
  if (shape === 'heal' || shape === 'healAll')
    return shape === 'heal' ? [...own].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, 1) : own
  if (shape === 'all')
    return opposing
  if (shape === 'strongest')
    return [...opposing].sort((a, b) => b.attack - a.attack).slice(0, 1)
  if (shape === 'lowest')
    return [...opposing].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, 1)
  if (shape === 'multi2')
    return pickRandom(opposing, 2, roll)
  if (shape === 'multi3')
    return pickRandom(opposing, 3, roll)
  if (shape === 'row') {
    const rows = [0, 1].filter(row => opposing.some(unit => rowOf(unit, !allied) === row))
    const row = rows[Math.min(rows.length - 1, Math.floor(roll() * rows.length))]
    return opposing.filter(unit => rowOf(unit, !allied) === row)
  }
  const front = opposing.filter(unit => rowOf(unit, !allied) === 0)
  return pickRandom(front.length ? front : opposing, 1, roll)
}

function applyDamage(
  actor: IUnit,
  target: IUnit,
  ratio: number,
  roll: () => number,
  critChance: number,
): IBattleHit {
  const attack = actor.attack * (1 + buffValue(actor, 'attack'))
  const defenseDown = Math.min(0.6, buffValue(target, 'defense'))
  const defense = Math.max(0, target.defense * (1 - defenseDown))
  let amount = Math.max(
    1,
    Math.round(attack * ratio * (0.9 + roll() * 0.2) * (1 - defense / (defense + 500))),
  )
  const critical = roll() < critChance
  if (critical)
    amount = Math.round(amount * 1.65)
  let absorbed = 0
  const shield = target.buffs?.find(buff => buff.kind === 'shield')
  if (shield) {
    absorbed = Math.min(shield.value, amount)
    shield.value -= absorbed
    amount -= absorbed
    if (shield.value <= 0)
      target.buffs = target.buffs?.filter(buff => buff !== shield)
  }
  target.hp = Math.max(0, target.hp - amount)
  return { target: target.id, amount, absorbed, critical }
}

// Advance one actor; the same snapshot and seed always produce the same report.
export function stepBattle(battle: IBattle): IBattleEvent | null {
  if (battle.status !== 'fighting')
    return null
  const actors = [...battle.allies, ...battle.enemies].sort((a, b) => b.speed - a.speed)
  if (!actors.length) {
    battle.status = 'lost'
    return null
  }
  let actor = actors[battle.turn % actors.length]
  for (let count = 0; actor.hp <= 0 && count < actors.length; count++) {
    battle.turn++
    actor = actors[battle.turn % actors.length]
  }
  const allied = battle.allies.includes(actor)
  const own = living(allied ? battle.allies : battle.enemies)
  const opposing = living(allied ? battle.enemies : battle.allies)
  if (!opposing.length) {
    battle.status = allied ? 'won' : 'lost'
    return null
  }

  let seed = battle.seed
  const roll = (): number => {
    const [value, next] = random(seed)
    seed = next
    return value
  }
  const energyBefore = actor.energy
  const skill = energyBefore >= 100
  const profile = getSkillProfile(actor)
  const shape = skill ? profile.shape : 'single'
  const buffLog: IBuff[] = []

  tickBuffs(actor)
  const silenced = actor.buffs?.some(buff => buff.kind === 'silence')
  battle.active = actor.id
  if (silenced) {
    const text = `${actor.name}受到沉默影响，无法行动。`
    const event: IBattleEvent = {
      text,
      actor: actor.id,
      target: actor.id,
      amount: 0,
      hits: [],
      buffs: [],
      energyBefore,
      energyAfter: actor.energy,
    }
    battle.event = event
    battle.log.unshift(text)
    battle.log = battle.log.slice(0, 100)
    battle.turn++
    battle.round = Math.floor(battle.turn / actors.length) + 1
    battle.seed = seed
    return event
  }

  const targets = chooseTargets(shape, allied, battle, roll)
  const healing = shape === 'heal' || shape === 'healAll'
  const hits: IBattleHit[] = []

  if (healing) {
    for (const target of targets) {
      const amount = Math.min(target.maxHp - target.hp, Math.round(actor.attack * profile.ratio))
      target.hp += amount
      hits.push({ target: target.id, amount, heal: true })
    }
  }
  else {
    const critChance = 0.12 + (skill ? profile.critBoost : 0)
    for (const target of targets) {
      const hit = applyDamage(actor, target, skill ? profile.ratio : 1, roll, critChance)
      hits.push(hit)
      if (skill && profile.silenceChance > 0 && hit.amount > 0 && roll() < profile.silenceChance) {
        addBuff(target, {
          id: `silence-${battle.turn}`,
          name: '沉默',
          kind: 'silence',
          value: 0,
          turns: 2,
        }, buffLog)
      }
    }
  }

  if (skill && profile.shieldPct > 0) {
    addBuff(actor, {
      id: `shield-${battle.turn}`,
      name: '护体',
      kind: 'shield',
      value: Math.round(actor.attack * profile.shieldPct),
      turns: 2,
    }, buffLog)
  }
  if (skill && profile.damageReduction > 0) {
    addBuff(actor, {
      id: `defense-${battle.turn}`,
      name: '减伤',
      kind: 'defense',
      value: profile.damageReduction,
      turns: 2,
    }, buffLog)
  }
  if (skill && profile.critBoost > 0) {
    addBuff(actor, {
      id: `crit-${battle.turn}`,
      name: '暴击',
      kind: 'crit',
      value: profile.critBoost,
      turns: 2,
    }, buffLog)
  }

  actor.energy = skill ? 0 : Math.min(100, energyBefore + 30)
  const names = targets.map(target => target.name).join('、')
  const total = hits.reduce((sum, hit) => sum + hit.amount, 0)
  const absorbed = hits.reduce((sum, hit) => sum + (hit.absorbed || 0), 0)
  const critical = hits.some(hit => hit.critical)
  const segment = hits.length > 1 ? `（${hits.length}段）` : ''
  const shieldText = absorbed > 0 ? `，护盾吸收 ${absorbed}` : ''
  const text = skill
    ? `${actor.name}施展「${actor.skill}」，${healing ? '为' : '对'}${names}${healing ? '恢复' : '造成'} ${total} ${healing ? '气血' : '伤害'}${segment}${critical ? '，暴击' : ''}${shieldText}${targets.some(target => target.hp <= 0) ? '，击败目标' : ''}。`
    : `${actor.name}出手，对${names}造成 ${total} 伤害${critical ? '，暴击' : ''}${shieldText}${targets.some(target => target.hp <= 0) ? '，击败目标' : ''}。`
  const event: IBattleEvent = {
    text,
    actor: actor.id,
    target: hits[0]?.target || targets[0]?.id || actor.id,
    amount: total,
    heal: healing,
    skill,
    skillShape: skill ? profile.shape : 'single',
    skillLabel: skill ? profile.label : '普通攻击',
    hits,
    buffs: buffLog,
    energyBefore,
    energyAfter: actor.energy,
  }
  battle.event = event
  battle.log.unshift(text)
  battle.log = battle.log.slice(0, 100)
  battle.turn++
  battle.round = Math.floor(battle.turn / actors.length) + 1
  battle.seed = seed
  if (battle.enemies.every(unit => unit.hp <= 0))
    battle.status = 'won'
  else if (battle.allies.every(unit => unit.hp <= 0) || battle.round > 20)
    battle.status = 'lost'
  return event
}

export function validateSave(value: unknown): value is IGameSave {
  if (!value || typeof value !== 'object')
    return false
  const save = value as IGameSave
  const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0
  if (
    save.version !== 1
    || typeof save.created !== 'boolean'
    || typeof save.name !== 'string'
    || save.name.length > 20
  ) {
    return false
  }
  if (
    !save.wallet
    || !['exp', 'coin', 'jade', 'energy', 'liquid', 'honor', 'friendship', 'contribution'].every(k =>
      finite(save.wallet[k as keyof typeof save.wallet]),
    )
  ) {
    return false
  }
  if (!Array.isArray(save.heroes) || save.heroes.length > 200 || !save.heroes.length)
    return false
  if (
    !save.heroes.every(
      h =>
        h
        && typeof h.id === 'string'
        && typeof h.name === 'string'
        && finite(h.level)
        && h.level <= 200
        && finite(h.quality)
        && h.quality <= 6
        && finite(h.fragments)
        && finite(h.star)
        && finite(h.stage)
        && finite(h.train)
        && finite(h.invested)
        && typeof h.role === 'string'
        && typeof h.skill === 'string',
    )
  ) {
    return false
  }
  if (new Set(save.heroes.map(h => h.id)).size !== save.heroes.length)
    return false
  if (
    !Array.isArray(save.formation)
    || save.formation.length !== 6
    || !save.formation.every(id => id === null || save.heroes.some(h => h.id === id))
  ) {
    return false
  }
  const deployed = save.formation.filter(Boolean)
  if (!deployed.length || new Set(deployed).size !== deployed.length)
    return false
  if (
    !Array.isArray(save.items)
    || save.items.length > 2000
    || !save.items.every(
      i =>
        i
        && typeof i.id === 'string'
        && typeof i.name === 'string'
        && finite(i.count)
        && finite(i.quality)
        && i.quality <= 6
        && finite(i.enhance)
        && ['道具', '装备', '法宝', '仙器', '碎片'].includes(i.kind),
    )
  ) {
    return false
  }
  if (
    !Array.isArray(save.buildings)
    || save.buildings.length !== 6
    || !save.buildings.every(
      b => b && typeof b.id === 'string' && finite(b.level) && b.level >= 1 && b.level <= 100,
    )
  ) {
    return false
  }
  if (
    !Array.isArray(save.claims)
    || !save.claims.every(c => typeof c === 'string')
    || !Array.isArray(save.mails)
    || !save.mails.every(
      m =>
        m
        && typeof m.id === 'string'
        && typeof m.title === 'string'
        && typeof m.body === 'string'
        && typeof m.claimed === 'boolean'
        && m.rewards
        && Object.values(m.rewards).every(finite),
    )
  ) {
    return false
  }
  if (
    !Array.isArray(save.friends)
    || !save.friends.every(n => typeof n === 'string')
    || !Array.isArray(save.chats)
    || !save.chats.every(c => c && typeof c.name === 'string' && typeof c.text === 'string')
  ) {
    return false
  }
  if (!save.daily || typeof save.daily !== 'object' || !Object.values(save.daily).every(finite))
    return false
  if (
    ![
      save.realm,
      save.chapter,
      save.cleared,
      save.lastIdle,
      save.lastSeen,
      save.played,
      save.createdAt,
      save.seed,
      save.summon,
      save.advancedSummon,
      save.tower,
      save.arena,
      save.unionExp,
      save.cropAt,
    ].every(finite)
  ) {
    return false
  }
  return (
    save.realm < 9
    && save.chapter >= 1
    && typeof save.union === 'string'
    && typeof save.day === 'string'
    && typeof save.sound === 'boolean'
    && (!save.craft || (typeof save.craft.kind === 'string' && finite(save.craft.ends)))
  )
}
