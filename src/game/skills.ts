import type { IUnit, SkillShape } from './types'

export interface ISkillProfile {
  shape: SkillShape
  ratio: number
  label: string
  shieldPct: number
  damageReduction: number
  critBoost: number
  silenceChance: number
}

function percent(text: string, pattern: RegExp, fallback = 0): number {
  const match = text.match(pattern)
  return match ? Number(match[1]) / 100 : fallback
}

/** Mock skill interpreter: derives deterministic behavior from the extracted skill text. */
export function getSkillProfile(unit: IUnit): ISkillProfile {
  const text = unit.skillDescription || ''
  let shape: SkillShape = 'single'
  let ratio = 2.3
  let label = '单体怒气技'

  if (/治疗全体/.test(text)) {
    shape = 'healAll'
    ratio = 1.45
    label = '群体治疗'
  }
  else if (/治疗/.test(text)) {
    shape = 'heal'
    ratio = 2.35
    label = '治疗神通'
  }
  else if (/全体敌人|所有敌人/.test(text)) {
    shape = 'all'
    ratio = 1.15
    label = '群体怒气技'
  }
  else if (/随机横排|任意横排/.test(text)) {
    shape = 'row'
    ratio = 1.35
    label = '横排怒气技'
  }
  else if (/随机3名|随机3个/.test(text)) {
    shape = 'multi3'
    ratio = 1.25
    label = '随机三段'
  }
  else if (/2个敌人|2名敌人/.test(text)) {
    shape = 'multi2'
    ratio = 1.45
    label = '双目标怒气技'
  }
  else if (/攻击最高/.test(text)) {
    shape = 'strongest'
    ratio = 2.2
    label = '定点爆发'
  }
  else if (/血量最低/.test(text)) {
    shape = 'lowest'
    ratio = 2.35
    label = '斩杀神通'
  }

  return {
    shape,
    ratio,
    label,
    shieldPct: percent(text, /(?:相当自身攻击|攻击)(\d+)%的吸收盾/) || percent(text, /(\d+)%的吸收盾/),
    damageReduction: percent(text, /受到伤害减少(\d+)%/),
    critBoost: /暴击率/.test(text) ? 0.5 : 0,
    silenceChance: percent(text, /(\d+)%概率使其沉默/),
  }
}

/** Mock enemy skills keep every battle variant behaving differently without server data. */
export function mockEnemySkill(index: number): { skill: string, skillDescription: string } {
  const pool = [
    { skill: '裂爪', skillDescription: '裂爪对血量最低的敌人造成伤害' },
    { skill: '妖风袭', skillDescription: '妖风攻击随机3名敌人，造成伤害' },
    { skill: '山崩', skillDescription: '山崩对随机横排造成伤害，并降低其防御' },
    { skill: '护体妖光', skillDescription: '治疗自身，并给自己添加相当自身攻击50%的吸收盾持续2回合' },
  ]
  return pool[index % pool.length]
}
