import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const base = process.env.QA_URL || 'http://localhost:5181/'
const cdp = process.env.CDP_URL || 'http://127.0.0.1:9444'
const out = path.resolve(process.env.QA_OUT || 'work/browser-qa')
fs.mkdirSync(out, { recursive: true })
const target = await fetch(`${cdp}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json())
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject) })
let sequence = 0
const pending = new Map()
const errors = []
const failedRequests = []
const foreignRequests = new Set()
ws.addEventListener('message', (event) => {
  const m = JSON.parse(event.data)
  if (m.id) {
    const p = pending.get(m.id)
    if (p) { clearTimeout(p.timer); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result) }
  }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) failedRequests.push({ url: m.params.response.url, status: m.params.response.status })
  if (m.method === 'Network.requestWillBeSent' && /^https?:/.test(m.params.request.url) && !m.params.request.url.startsWith(new URL(base).origin)) foreignRequests.add(m.params.request.url)
})
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)) }, 12000)
    pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }))
  })
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
  return result.result?.value
}
async function click(selector, text = '') {
  const rect = await evaluate(`(() => {
    const elements = [...document.querySelectorAll(${JSON.stringify(selector)})]
    const e = elements.find(e => ${JSON.stringify(text)} ? e.innerText.trim() === ${JSON.stringify(text)} : true)
    if (!e) throw new Error('Missing click target: ' + ${JSON.stringify(selector)} + ' ' + ${JSON.stringify(text)})
    if (e.getAttribute('disabled') !== null || e.disabled) throw new Error('Target disabled: ' + e.innerText)
    e.scrollIntoView({block:'nearest',inline:'nearest'})
    const r = e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}
  })()`)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...rect })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...rect })
  await delay(170)
}
async function drag(fromSelector, toSelector, fromText = '') {
  const rects = await evaluate(`(() => {
    const from = [...document.querySelectorAll(${JSON.stringify(fromSelector)})].find(e => ${JSON.stringify(fromText)} ? e.innerText.includes(${JSON.stringify(fromText)}) : true)
    const to = document.querySelector(${JSON.stringify(toSelector)})
    if (!from || !to) throw new Error('Missing drag target')
    const a = from.getBoundingClientRect()
    const b = to.getBoundingClientRect()
    return { from: { x: a.x + a.width / 2, y: a.y + a.height / 2 }, to: { x: b.x + b.width / 2, y: b.y + b.height / 2 } }
  })()`)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...rects.from })
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...rects.from })
  for (let i = 1; i <= 6; i++) {
    const x = rects.from.x + (rects.to.x - rects.from.x) * i / 6
    const y = rects.from.y + (rects.to.y - rects.from.y) * i / 6
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', button: 'left', buttons: 1, x, y })
    await delay(35)
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...rects.to })
  await delay(260)
}
async function input(selector, value) {
  await evaluate(`(() => { const root=document.querySelector(${JSON.stringify(selector)}); const e=root?.matches('input,textarea')?root:root?.querySelector('input,textarea'); if(!e)throw new Error('Missing input'); e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true})); })()`)
  await delay(80)
}
async function close() {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await delay(120)
}
async function snapshot() { return evaluate(`JSON.parse(localStorage.getItem('xiuxian')).save`) }
async function shot(name) { await evaluate(`document.querySelector('.toast-message')?.setAttribute('style','display:none')`); const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); fs.writeFileSync(path.join(out, `${name}.png`), Buffer.from(image.data, 'base64')) }
const checks = []
async function check(name, fn) { await fn(); checks.push(name); console.log(`PASS ${name}`) }
try {
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 694, deviceScaleFactor: 1, mobile: true })
  await send('Page.navigate', { url: base + '?qa=' + Date.now() }); await delay(1800)
  await evaluate(`localStorage.clear()`)
  await send('Page.reload'); await delay(2500)
  for (let i = 0; i < 30; i++) {
    if (await evaluate(`!!document.querySelector('.source-entry-start')`)) break
    await delay(250)
  }
  await check('选区创角', async () => {
    await shot('01-server'); await click('.source-entry-start'); await input('.source-create-bottom uni-input', '云青尘'); await shot('02-create'); await click('.source-create-start'); await close()
    assert.equal(await evaluate(`document.querySelectorAll('.idle-illustration').length`), 0)
    assert.ok((await evaluate(`document.querySelector('.reference-pass-reward').innerText`)).includes('挂机战斗'))
    assert.equal(await evaluate(`document.querySelectorAll('.reference-challenge').length`), 1)
    await shot('03-main')
  })
  await check('原皮肤主要坐标', async () => {
    const geometry = await evaluate(`(() => { const stage=document.querySelector('.game-stage').getBoundingClientRect();const scale=stage.width/750;const names=['.top-bar','.reference-pass-reward','.reference-main-controls','.reference-challenge','.bottom-nav'];return Object.fromEntries(names.map(s=>{const r=document.querySelector(s).getBoundingClientRect();return[s,{x:(r.x-stage.x)/scale,y:(r.y-stage.y)/scale,w:r.width/scale,h:r.height/scale}]}))})()`)
    assert.ok(Math.abs(geometry['.top-bar'].h - 77) < .2)
    assert.ok(Math.abs(geometry['.reference-pass-reward'].y - 85) < .2)
    assert.ok(Math.abs(geometry['.reference-pass-reward'].w - 364) < .2)
    assert.ok(Math.abs(geometry['.reference-main-controls'].h - 290) < .2)
    assert.ok(Math.abs(geometry['.bottom-nav'].h - 129) < .2)
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.reference-challenge')).transform`), 'none')
    fs.writeFileSync(path.join(out, 'geometry.json'), JSON.stringify(geometry, null, 2))
  })
  await check('斗法与通关奖励', async () => {
    await click('.reference-challenge'); await delay(100)
    assert.equal(await evaluate(`document.querySelectorAll('.reference-combat-info').length`), 0)
    const battleFooter = await evaluate(`(() => { const round=document.querySelector('.reference-round-chip').getBoundingClientRect();const tools=document.querySelector('.reference-combat-tools').getBoundingClientRect();return {roundY:round.y,toolsY:tools.y,roundRight:round.right,toolsLeft:tools.left} })()`); assert.ok(Math.abs(battleFooter.roundY - battleFooter.toolsY) < 2); assert.ok(battleFooter.roundRight < battleFooter.toolsLeft)
    await shot('04-combat'); await click('.reference-combat-tools uni-button', '跳过')
    assert.equal((await snapshot()).cleared, 1)
    await click('.panel-body .primary-button', '继续修行')
    await click('.reference-pass-reward'); await click('.panel-body .small-button', '领取'); await close()
    assert.ok((await snapshot()).claims.includes('pass-1'))
  })
  await check('精简入口与活动导航', async () => {
    assert.equal(await evaluate(`document.querySelectorAll('.reference-forecast, .reference-shortcuts').length`), 0)
    const navLabels = await evaluate(`[...document.querySelectorAll('.nav-item')].map(e=>e.innerText.trim())`); for (const label of ['包裹', '探索', '活动', '战斗']) assert.ok(navLabels.includes(label)); assert.ok(!navLabels.includes('仙盟')); assert.equal(await evaluate(`document.querySelector('.nav-featured').innerText.trim()`), '战斗')
    await shot('05-main-clean')
  })
  await check('道友名录、拖拽与人物详情', async () => {
    await click('.nav-item', '道友'); await shot('07-hero-roster')
    const roster = await evaluate(`(() => ({ scene:!!document.querySelector('.hero-roster-scene'), slots:document.querySelectorAll('[data-formation-slot]').length, cards:document.querySelectorAll('.hero-roster-card').length, immortal:document.body.innerText.includes('仙器配置') }))()`)
    assert.equal(roster.scene, true); assert.equal(roster.slots, 6); assert.ok(roster.cards >= 6); assert.equal(roster.immortal, false)
    await evaluate(`document.querySelector('.hero-formation-slot__remove')?.click()`); await delay(180)
    assert.equal((await snapshot()).formation[1], null)
    await drag('.hero-roster-card', '[data-formation-slot="1"]', '袁洪')
    assert.equal((await snapshot()).formation[1], 'hero-1')

    await delay(320)
    await evaluate(`document.querySelector('.hero-roster-card[aria-label^="袁洪"]')?.click()`); await delay(250)
    assert.equal(await evaluate(`!!document.querySelector('.reference-hero-scene')`), true)
    assert.equal(await evaluate(`document.body.innerText.includes('仙器配置')`), false)
    const heroLayout = await evaluate(`(() => { const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};return{attrs:box('.reference-attributes'),func:box('.source-hero-func'),pill:box('.source-pill-button'),count:document.querySelectorAll('.source-hero-func uni-button').length} })()`)
    assert.equal(heroLayout.count, 4); assert.ok(heroLayout.func.y + heroLayout.func.h < heroLayout.attrs.bottom); assert.ok(heroLayout.func.right <= heroLayout.pill.x)
    const previous=(await snapshot()).heroes[1].level; await click('.source-level-button'); assert.equal((await snapshot()).heroes[1].level, previous+1)
    await click('.nav-item', '包裹'); await click('.bag-tabs uni-button', '装备'); await shot('08-bag'); await click('.bag-item', '1\n碧波宝刀'); await click('.item-actions uni-button', '装备给云青尘'); await close(); assert.ok((await snapshot()).items.find(i=>i.name==='碧波宝刀').equipped)
  })
  await check('洞府与材料副本', async () => {
    await click('.nav-item', '洞府'); await shot('09-abode'); await click('.reference-house', '练功房\n1级')
    if (await evaluate(`[...document.querySelectorAll('.source-building-operations uni-button')].some(e=>e.innerText.trim()==='进')`)) await click('.source-building-operations uni-button', '进')
    const exp=(await snapshot()).wallet.exp; await click('.source-practice-start'); assert.ok((await snapshot()).wallet.exp>exp); await close()
    await click('.nav-item', '探索'); await shot('10-experience'); await click('.ink-map-label', '日常副本'); await click('.panel-body .primary-button', '进入秘境'); await click('.reference-combat-tools uni-button', '跳过'); assert.equal((await snapshot()).daily.material, 1); await close()
  })
  await check('洞府六个原始入口与二级页面', async () => {
    await click('.nav-item', '洞府')
    for (const name of ['炼神', '功法', '灵池', '练功房', '战阵', '书阁']) {
      await click('.reference-house', name+'\n1级')
      if(name!=='炼神' && await evaluate(`[...document.querySelectorAll('.source-building-operations uni-button')].some(e=>e.innerText.trim()==='进')`)) await click('.source-building-operations uni-button','进')
      assert.equal(await evaluate(`document.querySelectorAll('.source-building-page').length`),1)
      await shot('building-'+name)
      await close()
    }
  })
  await check('仙盟加入捐献', async () => {
    await click('.nav-item', '仙城'); await click('.reference-city-map .ink-map-label', '仙盟'); await shot('11-union-list'); await click('.source-union-row .source-small'); await shot('12-union'); assert.equal((await snapshot()).union, '青云仙盟')
    await click('.reference-union-bottom uni-button', '仙盟建设'); await click('.panel-body .primary-button', '捐献'); assert.equal((await snapshot()).wallet.contribution, 100); await close()
  })
  await check('签到与邮件附件', async () => {
    await click('.nav-item', '活动')
    assert.equal(await evaluate(`document.querySelectorAll('.reference-welfare-categories').length`), 0)
    const activityTabs = await evaluate(`(() => { const e=document.querySelector('.welfare-tabs');return {count:e.querySelectorAll('uni-button').length,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth} })()`); assert.equal(activityTabs.count, 9); assert.ok(activityTabs.scrollWidth > activityTabs.clientWidth)
    await shot('13-welfare'); await click('.sign-grid uni-button.selected'); assert.ok((await snapshot()).claims.some(c=>c.includes(':sign-')))
    await click('.nav-item', '仙城'); await shot('14-city'); await click('.ink-map-label', '邮件'); await click('.mail-row'); const previous=(await snapshot()).wallet.jade; await click('.panel-body .primary-button', '领取附件'); assert.equal((await snapshot()).wallet.jade,previous+300); await close()
  })
  await check('本地传音与刷新恢复', async () => {
    await click('.chat-ticker'); await input('.chat-compose uni-input', '青云山下，一同问道。'); await click('.chat-compose .primary-button'); assert.equal((await snapshot()).chats.at(-1).text,'青云山下，一同问道。'); await close()
    const previous=await snapshot();await send('Page.reload');await delay(1000);await close();const current=await snapshot();assert.equal(current.wallet.jade, previous.wallet.jade);assert.equal(current.heroes[0].level, previous.heroes[0].level)
  })
  await check('375/390/750宽度适配', async () => {
    for(const [width,height] of [[375,667],[390,844],[750,1334]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await delay(1200);await close();await click('.nav-item','战斗');await shot(`15-layout-${width}`)
      const bounds=await evaluate(`(()=>{const r=document.querySelector('.game-shell').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,vw:innerWidth,vh:innerHeight}})()`)
      assert.ok(bounds.x>=-.5&&bounds.y>=-.5&&bounds.w<=bounds.vw+.5&&bounds.h<=bounds.vh+.5,JSON.stringify(bounds))
    }
  })
  assert.deepEqual(errors,[])
  assert.deepEqual(failedRequests.filter(x=>!x.url.endsWith('favicon.ico')),[])
  assert.equal(foreignRequests.size,0)
  const report={passed:checks.length,checks,errors,failedRequests,foreignRequests:[...foreignRequests],base}
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2))
  console.log(JSON.stringify(report,null,2))
}
catch(error){await shot('failure').catch(()=>{});fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({message:error.message,stack:error.stack,checks,errors,failedRequests,foreignRequests:[...foreignRequests]},null,2));console.error(error);process.exitCode=1}
finally { ws.close() }











