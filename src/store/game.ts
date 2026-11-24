import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { IGameSave, IHero, ModuleId, Resource } from '@/game/types'
import {
  BUILDINGS,
  HERO_POOL,
  initialSave,
  ITEM_TEMPLATES,
  makeHero,
  makeItem,
  REALMS,
  RESOURCES,
  shanghaiDay,
} from '@/game/data'
import {
  emptyBattle,
  heroStats,
  makeBattle,
  power,
  random,
  stepBattle,
  validateSave,
} from '@/game/engine'
import { MOCK_ACTIVITIES } from '@/api/mock'
import { playChime } from '@/game/sound'

export const useGameStore = defineStore(
  'xiuxian',
  () => {
    const save = ref<IGameSave>(initialSave())
    const screen = ref<'server' | 'create' | 'game'>('server')
    const module = ref<ModuleId>('battle')
    const panel = ref('')
    const detailId = ref('')
    const selectedHero = ref('hero-0')
    const battle = ref(emptyBattle())
    const auto = ref(false)
    const speed = ref(1)
    const now = ref(Date.now())
    const toast = ref('')
    const recruitResult = ref<IHero[]>([])
    const lastReward = ref<Partial<Record<Resource, number>>>({})
    let toastTimer: ReturnType<typeof setTimeout> | undefined
    let mobAt = 0
    let mobWins = 0
    let pendingBattleResult = false

    const hero = computed(
      () => save.value.heroes.find(h => h.id === selectedHero.value) || save.value.heroes[0],
    )
    const team = computed(() =>
      save.value.formation.map(id => save.value.heroes.find(h => h.id === id) || null),
    )
    const teamPower = computed(() =>
      team.value.reduce((n, h) => n + (h ? power(h, save.value) : 0), 0),
    )
    const realm = computed(
      () => `${REALMS[save.value.realm]}${save.value.heroes[0]?.level % 10 || 10}重`,
    )
    const idleSeconds = computed(() =>
      Math.min(43200, Math.max(0, Math.floor((now.value - save.value.lastIdle) / 1000))),
    )
    const idleReward = computed(() => ({
      exp: Math.floor(idleSeconds.value * (0.65 + save.value.cleared * 0.04)),
      coin: Math.floor(idleSeconds.value * (1.3 + save.value.cleared * 0.08)),
    }))
    const unread = computed(() => save.value.mails.filter(m => !m.read || !m.claimed).length)

    function notify(message: string): void {
      if (save.value.sound)
        playChime()
      toast.value = message
      clearTimeout(toastTimer)
      toastTimer = setTimeout(() => {
        toast.value = ''
      }, 2600)
    }
    function open(name: string, id = ''): void {
      panel.value = name
      detailId.value = id
    }
    function close(): void {
      const resumeMob = panel.value === 'battle-result' && screen.value === 'game' && module.value === 'battle'
      panel.value = ''
      detailId.value = ''
      if (resumeMob)
        startMobBattle()
    }
    function reward(values: Partial<Record<Resource, number>>): void {
      for (const [k, v] of Object.entries(values)) save.value.wallet[k as Resource] += v || 0
    }
    function spend(values: Partial<Record<Resource, number>>): boolean {
      for (const [k, v] of Object.entries(values)) {
        if (save.value.wallet[k as Resource] < (v || 0)) {
          notify(`${RESOURCES[k as Resource]}不足`)
          return false
        }
      }
      for (const [k, v] of Object.entries(values)) save.value.wallet[k as Resource] -= v || 0
      return true
    }
    function addItem(index: number, count = 1): void {
      const template = ITEM_TEMPLATES[index]
      const existing = save.value.items.find(
        i =>
          i.name === template.name && !i.equipped && !i.locked && ['道具', '碎片'].includes(i.kind),
      )
      if (existing) {
        existing.count += count
      }
      else {
        save.value.items.push(
          makeItem(index, `item-${Date.now()}-${save.value.items.length}`, count),
        )
      }
    }
    function consumeItem(name: string, count = 1): boolean {
      const item = save.value.items.find(i => i.name === name && i.count >= count)
      if (!item) {
        notify(`${name}不足`)
        return false
      }
      item.count -= count
      return true
    }
    function claim(key: string, values: Partial<Record<Resource, number>>, daily = false): boolean {
      const id = daily ? `${save.value.day}:${key}` : key
      if (save.value.claims.includes(id)) {
        notify('奖励已经领取')
        return false
      }
      save.value.claims.push(id)
      reward(values)
      lastReward.value = values
      notify(
        Object.entries(values)
          .map(([k, v]) => `${RESOURCES[k as Resource]} +${v}`)
          .join('，'),
      )
      return true
    }
    function claimed(key: string, daily = false): boolean {
      return save.value.claims.includes(daily ? `${save.value.day}:${key}` : key)
    }
    function tick(): void {
      const t = Date.now()
      const diff = Math.min(5, Math.max(0, (t - now.value) / 1000))
      now.value = t
      save.value.lastSeen = t
      if (screen.value === 'game')
        save.value.played += diff
      if (save.value.day !== shanghaiDay(t)) {
        save.value.day = shanghaiDay(t)
        save.value.daily = {}
        save.value.played = 0
        save.value.claims = save.value.claims.filter(k => !/^\d{4}-\d{2}-\d{2}:/.test(k))
      }
      if (
        mobAt > 0
        && battle.value.status !== 'fighting'
        && !panel.value
        && t >= mobAt
        && screen.value === 'game'
        && module.value === 'battle'
      ) {
        mobAt = 0
        if (auto.value && mobWins >= 3)
          startBattle('main')
        else
          startMobBattle()
      }
    }
    function restore(): void {
      if (!validateSave(save.value)) {
        save.value = initialSave()
        notify('本地存档无法识别，已恢复初始数据')
      }
      for (const building of save.value.buildings) {
        const current = BUILDINGS.find(item => item.id === building.id)
        if (current) {
          building.name = current.name
          building.icon = current.icon
          building.description = current.description
        }
      }
      tick()
      const wasAway = now.value - save.value.lastIdle > 60000
      screen.value = save.value.created ? 'game' : 'server'
      if (save.value.created) {
        module.value = 'battle'
        mobWins = 0
        startMobBattle()
      }
      if (save.value.created && wasAway)
        open('idle')
    }
    function enter(): void {
      screen.value = save.value.created ? 'game' : 'create'
      if (save.value.created) {
        module.value = 'battle'
        mobWins = 0
        close()
        startMobBattle()
      }
    }
    function create(name: string, sex: string, camp: string): boolean {
      const trimmed = name.trim()
      if (!/^[\u4E00-\u9FA5A-Z0-9]{2,5}$/i.test(trimmed)) {
        notify('请输入 2～5 位中文、字母或数字道号')
        return false
      }
      if (save.value.created)
        return false
      save.value.name = trimmed
      save.value.sex = sex
      save.value.camp = camp
      Object.assign(save.value.heroes[0], { name: trimmed, camp, main: true, quality: 4 })
      save.value.created = true
      screen.value = 'game'
      module.value = 'battle'
      mobWins = 0
      close()
      startMobBattle()
      return true
    }
    function changeModule(id: ModuleId): void {
      if (id === module.value)
        return
      module.value = id
      close()
      if (id === 'battle') {
        if (pendingBattleResult) {
          pendingBattleResult = false
          open('battle-result')
        }
        else if (battle.value.status === 'idle') {
          startMobBattle()
        }
      }
    }
    function pauseBattle(): void {
      auto.value = false
    }
    function startBattle(source = 'main', title = ''): void {
      if (battle.value.status === 'fighting' && battle.value.source !== 'mob')
        return
      if (!save.value.formation.some(Boolean)) {
        notify('请先上阵道友')
        return
      }
      const activity = MOCK_ACTIVITIES.find(a => a.id === source)
      if (activity) {
        const used = save.value.daily[source] || 0
        if (used >= activity.limit) {
          notify('今日挑战次数已用尽')
          return
        }
        save.value.daily[source] = used + 1
      }
      close()
      auto.value = false
      mobAt = 0
      pendingBattleResult = false
      battle.value = makeBattle(save.value, source, title)
      module.value = 'battle'
    }
    function startMobBattle(): void {
      if (screen.value !== 'game' || module.value !== 'battle')
        return
      mobAt = 0
      pendingBattleResult = false
      battle.value = makeBattle(save.value, 'mob', `挂机战斗 · 第${save.value.chapter}关`)
    }
    function startBossBattle(): void {
      startBattle('main')
    }
    function step(): void {
      if (battle.value.status !== 'fighting')
        return
      stepBattle(battle.value)
      if (battle.value.status !== 'fighting')
        settleBattle()
    }
    function settleBattle(): void {
      const b = battle.value
      save.value.seed = b.seed
      if (b.source === 'mob') {
        if (b.status === 'won') {
          mobWins++
          const values = {
            exp: 20 + save.value.chapter * 4,
            coin: 30 + save.value.chapter * 6,
          }
          b.reward = values
          reward(values)
        }
        else {
          mobWins = 0
          b.reward = {}
        }
        mobAt = now.value + 1200
        return
      }
      if (b.status === 'won') {
        const activity = MOCK_ACTIVITIES.find(a => a.id === b.source)
        const values = activity?.reward || {
          exp: 600 + save.value.chapter * 60,
          coin: 1200 + save.value.chapter * 120,
          jade: 20,
        }
        b.reward = values
        reward(values)
        if (b.source === 'main') {
          save.value.cleared = Math.max(save.value.cleared, save.value.chapter)
          save.value.chapter++
          if (save.value.cleared % 3 === 0)
            addItem(6)
        }
        if (b.source === 'tower')
          save.value.tower++
        if (b.source === 'arena')
          save.value.arena = Math.max(1, save.value.arena - 7)
        if (b.source === 'material') {
          addItem(3, 5)
          addItem(4, 5)
        }
        if (b.source === 'relic')
          addItem(14, 2)
      }
      else {
        b.reward = {}
        auto.value = false
      }
      if (b.source === 'main')
        auto.value = false
      mobAt = 0
      if (!auto.value) {
        if (module.value === 'battle')
          open('battle-result')
        else
          pendingBattleResult = true
      }
    }
    function skipBattle(): void {
      if (battle.value.status !== 'fighting')
        return
      let limit = 0
      while (battle.value.status === 'fighting' && limit++ < 500) stepBattle(battle.value)
      if (battle.value.status === 'fighting')
        battle.value.status = 'lost'
      settleBattle()
    }
    function retreat(): void {
      auto.value = false
      mobAt = 0
      mobWins = 0
      close()
      notify('已退出本次战斗')
      startMobBattle()
    }
    function claimIdle(multiplier = 1): void {
      if (idleSeconds.value < 10) {
        notify('请稍候再领取收益')
        return
      }
      if (multiplier > 1 && !spend({ jade: 500 }))
        return
      const values = {
        exp: idleReward.value.exp * multiplier,
        coin: idleReward.value.coin * multiplier,
      }
      reward(values)
      save.value.lastIdle = now.value
      lastReward.value = values
      open('reward')
    }
    function levelHero(id: string, times = 1): void {
      const h = save.value.heroes.find(h => h.id === id)
      if (!h)
        return
      let count = 0
      for (let n = 0; n < times; n++) {
        if (h.level >= 20 + save.value.realm * 20) {
          notify('已达境界等级上限，请先突破')
          break
        }
        const cost = h.level * 60
        if (!spend({ exp: cost }))
          break
        h.invested += cost
        h.level++
        count++
      }
      if (count)
        notify(`${h.name}提升 ${count} 级`)
    }
    function breakthrough(): void {
      if (save.value.realm >= REALMS.length - 1) {
        notify('已达最高境界')
        return
      }
      if (save.value.heroes[0].level < 20 + save.value.realm * 20) {
        notify('主角需先达到当前境界等级上限')
        return
      }
      const cost = (save.value.realm + 1) * 3000
      if (save.value.wallet.exp < cost) {
        notify('修为不足')
        return
      }
      if (!consumeItem('渡劫丹'))
        return
      spend({ exp: cost })
      save.value.realm++
      notify(`渡劫成功！突破至${REALMS[save.value.realm]}境`)
    }
    function trainHero(id: string, mode: string): void {
      const h = save.value.heroes.find(h => h.id === id)
      if (!h)
        return
      if (mode === 'star') {
        const cost = (h.star + 1) * 10
        if (h.star >= 5) {
          notify('已达五星')
          return
        }
        if (h.fragments < cost) {
          notify(`需要 ${cost} 枚该道友碎片`)
          return
        }
        h.fragments -= cost
        h.star++
      }
      else if (mode === 'stage') {
        if (!spend({ coin: 2000 * (h.stage + 1), exp: 800 * (h.stage + 1) }))
          return
        h.invested += 800 * (h.stage + 1)
        h.stage++
      }
      else {
        if (!spend({ coin: 1500 }))
          return
        h.train++
      }
      notify('培养成功，属性已提升')
    }
    function rebirth(id: string): void {
      const h = save.value.heroes.find(h => h.id === id)
      if (!h)
        return
      const refund = h.invested
      reward({ exp: refund })
      h.level = 1
      h.stage = 0
      h.train = 0
      h.invested = 0
      close()
      notify(`重生完成，返还修为 ${refund}`)
    }
    function swapSlots(a: number, b: number): void {
      const formation = [...save.value.formation]
      ;[formation[a], formation[b]] = [formation[b], formation[a]]
      save.value.formation = formation
    }
    function deploy(id: string, slot: number): void {
      const old = save.value.formation.indexOf(id)
      if (old >= 0) {
        swapSlots(old, slot)
        return
      }
      save.value.formation[slot] = id
      notify('上阵成功')
    }
    function undeploy(id: string): void {
      const h = save.value.heroes.find(h => h.id === id)
      if (h?.main) {
        notify('主角不能下阵')
        return
      }
      save.value.formation = save.value.formation.map(v => (v === id ? null : v))
      notify('已下阵')
    }
    function summon(kind: string, count: number): void {
      const token = save.value.items.find(i => i.name === '仙玉招募令' && i.count >= count)
      if (kind === '普通' && token) {
        token.count -= count
      }
      else if (
        !spend(
          kind === '友情'
            ? { friendship: count * 30 }
            : { jade: count * (kind === '高级' ? 200 : 100) },
        )
      ) {
        return
      }
      const result: IHero[] = []
      for (let i = 0; i < count; i++) {
        const [r, seed] = random(save.value.seed)
        save.value.seed = seed
        save.value.summon++
        if (kind === '高级')
          save.value.advancedSummon++
        let index
          = kind === '高级' && save.value.advancedSummon % 20 === 0
            ? 6
            : Math.floor(r * HERO_POOL.length)
        if (kind !== '高级' && index === 10)
          index = 11
        const existing = save.value.heroes.find(h => h.name === HERO_POOL[index].name && !h.main)
        if (existing) {
          existing.fragments += 10
          result.push({ ...existing })
        }
        else {
          const h = makeHero(index, `hero-${Date.now()}-${save.value.summon}`)
          h.level = 1
          save.value.heroes.push(h)
          result.push({ ...h })
        }
      }
      recruitResult.value = result
      open('summon-result')
    }
    function operateItem(id: string, op: string): void {
      const item = save.value.items.find(i => i.id === id)
      if (!item || item.count <= 0)
        return
      if (op === 'lock') {
        item.locked = !item.locked
        notify(item.locked ? '已锁定物品' : '已解锁物品')
        return
      }
      if (op === 'equip') {
        const old = save.value.items.find(
          i => i.equipped === hero.value.id && i.slot === item.slot,
        )
        if (old)
          old.equipped = undefined
        item.equipped = hero.value.id
        notify(`${hero.value.name}已穿戴${item.name}`)
        return
      }
      if (op === 'unequip') {
        item.equipped = undefined
        notify('已卸下装备')
        return
      }
      if (op === 'enhance') {
        if (!spend({ coin: 500 * (item.enhance + 1) }))
          return
        item.enhance++
        notify(`强化成功 +${item.enhance}`)
        return
      }
      if (item.locked || item.equipped) {
        notify('请先解锁或卸下物品')
        return
      }
      if (op === 'use') {
        if (item.name === '聚气丹') {
          reward({ exp: 600 })
        }
        else if (item.name === '铜贝袋') {
          reward({ coin: 2000 })
        }
        else {
          notify('该物品在对应系统使用')
          return
        }
        item.count--
        notify('使用成功')
      }
      if (op === 'sell') {
        item.count--
        reward({ coin: (item.quality + 1) * 300 })
        notify('出售成功')
      }
      if (op === 'resolve') {
        item.count--
        addItem(3, item.quality + 1)
        notify(`分解获得玄铁 ×${item.quality + 1}`)
      }
      if (op === 'combine') {
        if (item.count < 10) {
          notify('需要 10 枚碎片')
          return
        }
        item.count -= 10
        addItem(2)
        notify('合成获得仙玉招募令 ×1')
      }
      if (!item.count)
        close()
    }
    function smelt(maxQuality: number): void {
      const items = save.value.items.filter(
        i =>
          i.kind === '装备' && !i.equipped && !i.locked && i.quality <= maxQuality && i.count > 0,
      )
      const count = items.reduce((n, i) => n + i.count, 0)
      items.forEach((i) => {
        i.count = 0
      })
      if (count) {
        addItem(3, count * 3)
        notify(`熔炼 ${count} 件装备，获得玄铁 ×${count * 3}`)
      }
      else {
        notify('没有符合条件的装备')
      }
    }
    function upgradeBuilding(id: string): void {
      const b = save.value.buildings.find(b => b.id === id)
      if (b && spend({ coin: b.level * 3000, liquid: b.level * 50 })) {
        b.level++
        notify(`${b.name}升至 ${b.level} 级`)
      }
    }
    function buildingAction(id: string, kind = ''): void {
      const b = save.value.buildings.find(b => b.id === id)
      if (!b)
        return
      if (id === 'spirit' || id === 'library') {
        if (spend({ energy: 100 })) {
          reward({ exp: 500 * b.level })
          notify(`参悟完成，修为 +${500 * b.level}`)
        }
      }
      if (id === 'field') {
        if (!save.value.cropAt) {
          if (spend({ coin: 200 })) {
            save.value.cropAt = now.value + 30000
            notify('已播种，30 秒后成熟')
          }
        }
        else if (now.value < save.value.cropAt) {
          notify('灵草尚未成熟')
        }
        else {
          save.value.cropAt = 0
          addItem(4, b.level * 5)
          notify(`收获灵草 ×${b.level * 5}`)
        }
      }
      if (id === 'alchemy' || id === 'forge') {
        if (save.value.craft) {
          if (now.value < save.value.craft.ends) {
            notify('正在炼制中')
            return
          }
          addItem(
            save.value.craft.kind === 'forge'
              ? 6
              : save.value.craft.kind === 'breakthrough'
                ? 1
                : 0,
            1,
          )
          save.value.craft = null
          notify('炼制完成，已放入行囊')
          return
        }
        if (!consumeItem(id === 'forge' ? '玄铁' : '灵草', 5))
          return
        save.value.craft = {
          kind: id === 'forge' ? 'forge' : kind || 'pill',
          ends: now.value + 15000,
        }
        notify('开始炼制，15 秒后可领取')
      }
      if (id === 'adventure') {
        if ((save.value.daily.adventure || 0) >= 3) {
          notify('今日机缘已尽，明日再来')
          return
        }
        save.value.daily.adventure = (save.value.daily.adventure || 0) + 1
        const [r, seed] = random(save.value.seed)
        save.value.seed = seed
        const values = r > 0.5 ? { jade: 50, exp: 500 } : { coin: 3000, energy: 200 }
        reward(values)
        lastReward.value = values
        open('adventure-result')
      }
    }
    function buy(index: number, currency: Resource = 'coin'): void {
      const price
        = currency === 'coin' ? 800 + index * 250 : currency === 'jade' ? 50 + index * 10 : 100
      if (spend({ [currency]: price })) {
        addItem(index)
        notify(`已购入${ITEM_TEMPLATES[index].name}`)
      }
    }
    function claimMail(id: string): void {
      const mail = save.value.mails.find(m => m.id === id)
      if (!mail || mail.claimed)
        return
      reward(mail.rewards)
      mail.claimed = true
      mail.read = true
      notify('附件已领取')
    }
    function deleteMail(id: string): void {
      const mail = save.value.mails.find(m => m.id === id)
      if (!mail?.claimed) {
        notify('请先领取附件')
        return
      }
      save.value.mails = save.value.mails.filter(m => m.id !== id)
      close()
      notify('邮件已删除')
    }
    function sendChat(text: string, channel: string): void {
      if (!text.trim() || text.length > 100) {
        notify('请输入 1～100 字内容')
        return
      }
      if (channel === '仙盟' && !save.value.union) {
        notify('请先加入仙盟')
        return
      }
      save.value.chats.push({ name: save.value.name, text: text.trim(), channel })
      save.value.chats = save.value.chats.slice(-60)
    }
    function joinUnion(name: string, createUnion = false): void {
      if (save.value.union)
        return
      if (createUnion && (name.trim().length < 2 || name.trim().length > 8)) {
        notify('盟名需为 2～8 字')
        return
      }
      if (createUnion && !spend({ jade: 500 }))
        return
      save.value.union = name
      close()
      notify(`已${createUnion ? '创建' : '加入'}${name}`)
    }
    function donate(): void {
      if (!save.value.union)
        return
      if (claimed('donate', true)) {
        notify('今日已捐献')
        return
      }
      if (spend({ coin: 5000 })) {
        claim('donate', { contribution: 100 }, true)
        save.value.unionExp += 100
      }
    }
    function spin(): void {
      if (!spend({ jade: 50 }))
        return
      const [r, seed] = random(save.value.seed)
      save.value.seed = seed
      const values = r < 0.1 ? { jade: 300 } : r < 0.45 ? { exp: 1500 } : { coin: 5000 }
      reward(values)
      lastReward.value = values
      open('reward')
    }
    function redeem(code: string): void {
      const key = code.trim().toUpperCase()
      if (!['XIUXIAN2026', 'QINGYUN', 'UNIBEST'].includes(key)) {
        notify('激活码不存在')
        return
      }
      claim(`code-${key}`, { jade: 500, exp: 2000 })
    }
    function leave(): void {
      auto.value = false
      battle.value = emptyBattle()
      close()
      screen.value = 'server'
    }
    function importSave(value: unknown): boolean {
      if (!validateSave(value)) {
        notify('存档格式或数据不正确')
        return false
      }
      save.value = JSON.parse(JSON.stringify(value)) as IGameSave
      battle.value = emptyBattle()
      auto.value = false
      close()
      restore()
      notify('存档导入成功')
      return true
    }
    function reset(): void {
      auto.value = false
      save.value = initialSave()
      battle.value = emptyBattle()
      screen.value = 'server'
      close()
      notify('本地存档已重置')
    }
    function rename(name: string): void {
      if (!/^[\u4E00-\u9FA5A-Z0-9]{2,5}$/i.test(name.trim())) {
        notify('道号需为 2～5 位中文、字母或数字')
        return
      }
      if (!spend({ jade: 100 }))
        return
      save.value.name = name.trim()
      save.value.heroes[0].name = name.trim()
      close()
      notify('道号已更改')
    }

    return {
      save,
      screen,
      module,
      panel,
      detailId,
      selectedHero,
      battle,
      auto,
      speed,
      now,
      toast,
      recruitResult,
      lastReward,
      hero,
      team,
      teamPower,
      realm,
      idleSeconds,
      idleReward,
      unread,
      notify,
      open,
      close,
      reward,
      spend,
      addItem,
      consumeItem,
      claim,
      claimed,
      tick,
      restore,
      enter,
      create,
      changeModule,
      pauseBattle,
      startBattle,
      startMobBattle,
      startBossBattle,
      step,
      skipBattle,
      retreat,
      claimIdle,
      levelHero,
      breakthrough,
      trainHero,
      rebirth,
      swapSlots,
      deploy,
      undeploy,
      summon,
      operateItem,
      smelt,
      upgradeBuilding,
      buildingAction,
      buy,
      claimMail,
      deleteMail,
      sendChat,
      joinUnion,
      donate,
      spin,
      redeem,
      leave,
      importSave,
      reset,
      rename,
      heroStats,
    }
  },
  { persist: { paths: ['save'] } },
)
