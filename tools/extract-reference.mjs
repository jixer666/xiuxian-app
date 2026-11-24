/**
 * 从参考 H5（参考/文字修仙-御龙战仙/源码/h5）提取纯数据层，产出可被 app 直接渲染的 JSON。
 *
 * 产物（全部不含图片/字体/音频等原素材，只有布局、文案、数值）：
 *   src/game/data/skins/<folder>.json   997 套 EUI 皮肤的真实布局（锚点、坐标、尺寸、字号、颜色、缩放、九宫格）
 *   src/game/data/skins/index.json      皮肤清单（按文件夹分组，供懒加载）
 *   src/game/data/tables/<name>.json    68 张与前端展示/数值相关的配置表
 *   src/game/data/tables/index.json     配置表清单与条数
 *   src/game/data/lang.json             1185 条界面文案
 *
 * 用法：node tools/extract-reference.mjs
 * 参考目录可用 REF_H5 覆盖。
 */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import zlib from 'node:zlib'

const REF = process.env.REF_H5
  || path.resolve('../../参考/逆向还原/源码/h5')
const OUT = path.resolve('src/game/data')

const DELTA = 0x9E3779B9

function xxteaDecrypt(bytes, keyStr) {
  const k = new Uint32Array(16)
  for (let i = 0; i < keyStr.length && i < 16; i++)
    k[i >> 2] |= (keyStr.charCodeAt(i) & 0xFF) << ((i & 3) << 3)
  const n = Math.ceil(bytes.length / 4)
  const v = new Uint32Array(n)
  for (let i = 0; i < bytes.length; i++) v[i >> 2] |= bytes[i] << ((i & 3) << 3)
  let sum = (Math.floor(6 + 52 / n) * DELTA) >>> 0
  let y = v[0]
  let z, e, p
  while (sum !== 0) {
    e = (sum >>> 2) & 3
    for (p = n - 1; p > 0; p--) {
      z = v[p - 1]
      v[p] = (v[p] - ((((z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4)) ^ ((sum ^ y) + (k[(p & 3) ^ e] ^ z))) >>> 0)) >>> 0
      y = v[p]
    }
    z = v[n - 1]
    v[0] = (v[0] - ((((z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4)) ^ ((sum ^ y) + (k[(0 & 3) ^ e] ^ z))) >>> 0)) >>> 0
    y = v[0]
    sum = (sum - DELTA) >>> 0
  }
  return v
}

function readConfigBin(file) {
  const raw = fs.readFileSync(file)
  const v = xxteaDecrypt(new Uint8Array(raw), 'wd2021yq')
  const bytes = Buffer.alloc(v.length * 4)
  for (let i = 0; i < bytes.length; i++) bytes[i] = (v[i >> 2] >>> ((i & 3) << 3)) & 0xFF
  let eocd = -1
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4B && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('config.bin 中未找到 zip 目录')
  const method = bytes[8] | (bytes[9] << 8)
  const compSize = bytes[18] | (bytes[19] << 8) | (bytes[20] << 16) | (bytes[21] << 24)
  const nameLen = bytes[26] | (bytes[27] << 8)
  const extraLen = bytes[28] | (bytes[29] << 8)
  const start = 30 + nameLen + extraLen
  const comp = bytes.subarray(start, start + compSize)
  const data = method === 8 ? zlib.inflateRawSync(comp) : comp
  return JSON.parse(data.toString('utf8'))
}

// ---------- 皮肤 ----------
function makeStringTable(table) {
  const t = table.slice()
  t.e = []
  t.d = function (i) {
    if (!i) return ''
    const s = unescape(i)
    let out = String.fromCharCode(s.charCodeAt(0) - s.length)
    for (let k = 1; k < s.length; k++)
      out += String.fromCharCode(s.charCodeAt(k) - out.charCodeAt(k - 1))
    return out
  }
  t.g = function (i) {
    if (t.e[i] == null) t.e[i] = t.d(t[i])
    return t.e[i]
  }
  return t
}

const callableStub = () => new Proxy(function () {}, {
  get(target, prop) {
    if (prop === 'prototype') return target.prototype
    if (prop === 'getInstance') return () => callableStub()
    return callableStub()
  },
  apply() { return callableStub() },
  construct() { const o = {}; o.__class = 'stub'; return o },
})

function buildThemeContext(table) {
  const eui = new Proxy({}, {
    get(target, prop) {
      if (!(prop in target)) {
        const cls = `eui.${String(prop)}`
        target[prop] = function () { this.__class = cls; return this }
        target[prop].prototype = new Proxy({}, { get: () => function () {} })
      }
      return target[prop]
    },
  })
  const egret = new Proxy({}, { get: () => callableStub() })
  const generateEUI = { paths: {}, styles: undefined, skins: undefined }
  const sandbox = Object.create(null)
  Object.assign(sandbox, {
    console, unescape, escape, JSON, Object, Array, String, Math, Proxy, Date, RegExp, Error,
    eui, egret, generateEUI,
  })
  sandbox.window = sandbox
  sandbox.global = sandbox
  sandbox.globalThis = sandbox
  sandbox.__extends = function (d, b) {
    for (const p of Object.keys(b)) if (b.hasOwnProperty(p)) d[p] = b[p]
    function __() { this.constructor = d }
    __.prototype = b.prototype
    d.prototype = new __()
    return d
  }
  sandbox.xx_en_str = { data: [makeStringTable(table)] }
  sandbox.RES = egret
  return vm.createContext(sandbox)
}

const DEFAULT_KEYS = new Set(['__class'])
const DEFAULT_VALUES = new Map([
  ['visible', true],
  ['alpha', 1],
  ['scaleX', 1],
  ['scaleY', 1],
  ['enabled', true],
  ['touchEnabled', true],
  ['touchChildren', true],
  ['bold', false],
  ['horizontalCenter', 0],
  ['verticalCenter', 0],
  ['anchorOffsetX', 0],
  ['anchorOffsetY', 0],
])

function compact(value) {
  if (Array.isArray(value)) return value.map(compact)
  if (!value || typeof value !== 'object') return value
  const out = {}
  for (const [k, v] of Object.entries(value)) {
    if (DEFAULT_KEYS.has(k)) continue
    if (DEFAULT_VALUES.has(k) && v === DEFAULT_VALUES.get(k)) continue
    if (v === '' || v === null || v === undefined) continue
    if (Array.isArray(v) && v.length === 0) continue
    if (k === 'elementsContent') {
      if (!v.length) continue
      out[k] = compact(v)
      continue
    }
    if (k === 'scale9Grid') {
      // 九宫格参数只保留矩形数值
      const r = ['x', 'y', 'width', 'height'].filter(key => typeof v[key] === 'number')
      if (r.length) out[k] = r
      continue
    }
    if (k === 'layout' && typeof v === 'object') {
      const flat = {}
      for (const [lk, lv] of Object.entries(v)) {
        if (lk === '__class' || lv === '' || lv === null || lv === undefined) continue
        flat[lk] = lv
      }
      if (Object.keys(flat).length) out[k] = flat
      continue
    }
    out[k] = compact(v)
  }
  return out
}

function dumpSkin(inst) {
  // 每个具名 skinPart 独立导出一棵树，避免共享引用被去重丢失
  const strip = (v, seen, depth) => {
    if (v == null) return undefined
    if (typeof v === 'function') return undefined
    if (typeof v !== 'object') return v
    if (depth > 14 || seen.has(v)) return undefined
    seen.add(v)
    if (Array.isArray(v)) return v.map(x => strip(x, seen, depth + 1)).filter(x => x !== undefined)
    const out = {}
    for (const [k, value] of Object.entries(v)) {
      if (k === 'skinParts' || typeof value === 'function') continue
      const s = strip(value, seen, depth + 1)
      if (s === undefined || s === null || s === '') continue
      if (Array.isArray(s) && !s.length) continue
      out[k] = s
    }
    return out
  }
  const parts = {}
  for (const [k, value] of Object.entries(inst)) {
    if (k === 'skinParts' || typeof value === 'function') continue
    const s = strip(value, new WeakSet(), 0)
    if (s !== undefined) parts[k] = s
  }
  const out = {}
  if (inst.width !== undefined) out.width = inst.width
  if (inst.height !== undefined) out.height = inst.height
  out.parts = compact(parts)
  if (inst.skinParts) out.skinParts = inst.skinParts.slice()
  if (inst.elementsContent && Array.isArray(inst.elementsContent) && inst.elementsContent.length)
    out.elementsContent = compact(inst.elementsContent.map(e => strip(e, new WeakSet(), 0)))
  return out
}

function extractSkins() {
  const strJson = JSON.parse(fs.readFileSync(path.join(REF, 'sub/1.8.9/xx_en_str.json'), 'utf8'))
  const skins = {}
  for (const file of ['start.thm.min.js', 'default.thm.min.js']) {
    const ctx = buildThemeContext(strJson.data[0])
    const src = fs.readFileSync(path.join(REF, 'js', file), 'utf8')
    try {
      vm.runInContext(src, ctx, { filename: file })
    }
    catch (e) {
      console.warn(`[skins] ${file} 加载失败：${e.message}`)
      continue
    }
    const paths = ctx.generateEUI.paths || {}
    for (const key of Object.keys(paths)) {
      const clean = key.replace(/^resource\//, '').replace(/\.exml$/, '')
      try {
        skins[clean] = dumpSkin(new paths[key]())
      }
      catch (e) {
        console.warn(`[skins] ${clean} 实例化失败：${e.message}`)
      }
    }
  }
  return skins
}

// ---------- 配置表 ----------
const KEEP_TABLES = [
  'levelExpConfig',
  'heroDataConfig',
  'recruitHeroConfig',
  'skillConfig',
  'buffConfig',
  'itemDataConfig',
  'equipStrengthConfig',
  'equipRefineConfig',
  'equipSetsConfig',
  'equipGemConfig',
  'heroLevUpConfig',
  'heroStarUpConfig',
  'heroStepUpConfig',
  'herofeishengConfig',
  'heroRecruit',
  'heroSeatConfig',
  'heroTacticalConfig',
  'heroWudaoConfig',
  'campaignConfig',
  'chapterRewardConfig',
  'towerConfig',
  'towerGoalConfig',
  'arenaConfig',
  'arenaRankConfig',
  'arenaLuckyConfig',
  'shopConfig',
  'shopListConfig',
  'shopArenaListConfig',
  'shopGDListConfig',
  'unionBaseConfig',
  'unionNoticeConfig',
  'corpsConfig',
  'corpsDonationConfig',
  'corpsSkillConfig',
  'corpsWishConfig',
  'corpsLotteryConfig',
  'MainCityLianshenConfig',
  'MainCityLingchiStudyConfig',
  'MainCityLingchiUpConfig',
  'MainCityGongfaConfig',
  'MainCityLiandanConfig',
  'MainCityLianqiConfig',
  'MainCityLiangongfangConfig',
  'MainCityZhanzhenConfig',
  'MainCityRenmaiConfig',
  'MainCityShugeConfig',
  'MainCityBottleConfig',
  'GongfaBuildingConfig',
  'GongfaChapterConfig',
  'GongfaChapterSkillConfig',
  'GongfaItemConfig',
  'GongfaNewBaseConfig',
  'FuncOpenConfig',
  'funcNoticeOpenConfig',
  'fetterConfig',
  'taskConfig',
  'mainTaskConfig',
  'monsterConfig',
  'bossConfig',
  'mapConfig',
  'cityConfig',
  'loginRewardConfig',
  'loginGiftConfig',
  'signGiftConfig',
  'offlineRewardConfig',
  'mailConfig',
  'titleConfig',
  'vipConfig',
  'rechargeConfig',
  'firstRechargeConfig',
  'limitBuyConfig',
  'exchangeShopConfig',
  'systemParamConfig',
  'allBaseConfig',
  'dailyNoticeConfig',
  'funcNoticeTaskConfig',
  'goalRewardConfig',
  'dragonBones',
].filter(n => true)

const ITEM_FIELDS = ['name', 'quality', 'type', 'subtype', 'icon', 'itemdes', 'maxnum', 'isuse', 'effect', 'sale_money', 'is_sale', 'resolve', 'time_limit']
const MONSTER_FIELDS = ['name', 'quality', 'type', 'head', 'model', 'props', 'skill1', 'skill2', 'ai', 'distance_type', 'att_type']

function pickFields(rows, fields) {
  const out = {}
  for (const [id, row] of Object.entries(rows)) {
    if (!row || typeof row !== 'object') continue
    const picked = {}
    let keep = false
    for (const f of fields) {
      const v = row[f]
      if (v === undefined || v === '' || v === null) continue
      if (Array.isArray(v) && !v.length) continue
      picked[f] = v
      keep = true
    }
    if (keep) out[id] = picked
  }
  return out
}

function trimTable(value) {
  if (Array.isArray(value)) return value.map(trimTable)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      if (v === '' || v === null || v === undefined) continue
      if (Array.isArray(v) && v.length === 0) continue
      out[k] = trimTable(v)
    }
    return out
  }
  return value
}

function extractConfig() {
  const all = readConfigBin(path.join(REF, 'resource/config/config.bin'))
  const out = {}
  for (const name of KEEP_TABLES) {
    if (all[name] === undefined) continue
    let value = all[name]
    if (name === 'itemDataConfig') value = pickFields(value, ITEM_FIELDS)
    if (name === 'monsterConfig') value = pickFields(value, MONSTER_FIELDS)
    if (name === 'heroDataConfig') value = pickFields(value, ['name', 'quality', 'base_props', 'skill1', 'skill2', 'story', 'head', 'model', 'wait', 'att_type', 'hero_type', 'group', 'book_sort', 'wake_show', 'resolve', 'repeat_cost'])
    out[name] = trimTable(value)
  }
  return out
}

// ---------- 输出 ----------
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(value))
  return fs.statSync(file).size
}

function splitSkins(skins) {
  const groups = {}
  for (const [key, value] of Object.entries(skins)) {
    const folder = key.includes('/') ? key.split('/').slice(0, -1).join('/') : '_root'
    ;(groups[folder] ||= {})[key] = value
  }
  const index = []
  let total = 0
  for (const [folder, list] of Object.entries(groups)) {
    const file = `skins/${folder.replace(/[/]/g, '_')}.json`
    total += writeJson(path.join(OUT, file), list)
    index.push({ folder, file: file.replace(/^/, './'), count: Object.keys(list).length })
  }
  const size = writeJson(path.join(OUT, 'skins/index.json'), index.sort((a, b) => b.count - a.count))
  return { index, total: total + size }
}

function splitTables(config) {
  const index = []
  let total = 0
  for (const [name, value] of Object.entries(config)) {
    const file = `tables/${name}.json`
    total += writeJson(path.join(OUT, file), value)
    index.push({ name, file: file.replace(/^/, './'), rows: Array.isArray(value) ? value.length : Object.keys(value).length })
  }
  const size = writeJson(path.join(OUT, 'tables/index.json'), index.sort((a, b) => b.rows - a.rows))
  return { index, total: total + size }
}

const skins = extractSkins()
const skinMeta = splitSkins(skins)
console.log(`skins: ${Object.keys(skins).length} 个皮肤 / ${skinMeta.index.length} 个分组 / ${(skinMeta.total / 1024).toFixed(0)} KB`)

const config = extractConfig()
const tableMeta = splitTables(config)
console.log(`tables: ${Object.keys(config).length} 张 / ${(tableMeta.total / 1024).toFixed(0)} KB`)

const lang = JSON.parse(fs.readFileSync(path.join(REF, 'resource/config/language_main.json'), 'utf8'))
writeJson(path.join(OUT, 'lang.json'), lang)
console.log(`lang: ${Object.keys(lang).length} 条 / ${(fs.statSync(path.join(OUT, 'lang.json')).size / 1024).toFixed(0)} KB`)
