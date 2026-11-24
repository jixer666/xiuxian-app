# AGENTS.md — xiuxian-app 开发规则

> 本文件是本仓库的 AI/开发者执行规则。工程习惯参考 `resume-app` 的实际代码与配置，并结合 `xiuxian-app` 的 H5 游戏项目边界重新整理。只借鉴工程方法，不移植简历业务、数据结构或接口。

## 1. 项目边界

- 技术栈：uni-app H5 + Vue 3 + TypeScript + Vite 5 + Pinia + UnoCSS。
- 目标端只有 H5；桌面浏览器优先，同时兼容移动端 H5。
- 视觉与玩法唯一依据：`参考/逆向还原/源码/h5` 下的原始 EUI 皮肤和客户端模块。上级 `xiuxian/docs` 的产品规则不作为本项目规格。
- 当前无真实账号、HTTP、WebSocket、支付或服务端战斗；数据为 `localStorage` mock。不要在未要求时假装后端已完成。
- 不以“全部一比一完成”描述当前状态；未实现内容必须继续记录在 `docs/实现清单.md`。

## 2. 硬性规则

1. **生成物不手改**：`src/pages.json`、`src/manifest.json`、`src/types/auto-import.d.ts`、`src/types/uni-pages.d.ts` 由配置或插件生成。修改源配置：`pages.config.ts`、`manifest.config.ts`、`vite.config.ts`。
2. **SFC 顺序固定**：`<script setup lang="ts">` → `<template>` → `<style>`。ESLint 的 `vue/block-order` 已强制此顺序。
3. **页面用 `definePage` 声明**：页面配置写在页面 SFC 的 `definePage` 宏中，放在 imports 之后、状态与函数之前；页面私有组件放同目录 `components/`，不会被当成路由。
4. **禁止新增 `any`**：外部数据用 `unknown` 接收并在边界校验；类型导入使用 `import type`。
5. **业务状态统一走 Pinia**：跨页面共享或需要持久化的状态放 `src/store/`，业务组件不要直接写 `localStorage`。
6. **真实边界必须校验**：HTTP 响应、`uni.getStorageSync`、存档导入、URL 参数、第三方回调都属于不可信输入；组件 props 和 store 内部类型可信，不重复做无效校验。
7. **请求必须分层**：未来接入服务端时，页面/组件只调用 `src/api/*`，`src/api/*` 只调用统一 HTTP 封装，业务层禁止直接 `uni.request`、拼 URL 或手写 token。
8. **提示统一收口**：页面使用现有 `game.notify()` / `toast` 机制；若后续新增通用 toast，只允许一个全局实现，禁止在业务中散落原生 `uni.showToast`。
9. **坐标体系不可随意替换**：游戏画面以 750×1334 设计坐标为基准，通过 `.game-shell` 等比缩放；不要改成另一套百分比坐标或逐控件响应式重排。
10. **素材必须原创替代**：不得复制参考项目的图片、字体、音频、骨骼或引擎代码；新增素材放 `src/static/game/`，并接受 `pnpm check:assets` 审计。

## 3. 目录职责

```text
src/
├── api/                 # mock/API 适配层，页面不直接请求
├── components/game/     # 游戏场景、面板、通用游戏组件
├── game/
│   ├── data.ts          # 静态数据、配置映射、构造器
│   ├── data/            # 原始配置、皮肤和语言数据
│   ├── engine.ts        # 纯游戏规则、战斗结算、存档校验
│   ├── types.ts         # 领域类型
│   ├── skills.ts        # 技能定义
│   └── sound.ts         # H5 合成音效
├── hooks/               # 可复用组合式函数
├── pages/               # 约定式路由页面
├── static/game/         # 原创 SVG 图标与背景
├── store/               # Pinia 状态与业务动作
└── style/               # 全局游戏皮肤
    ├── game.scss        # 布局、基础组件、动画
    └── reference.scss   # 参考皮肤补充样式
```

- 页面只负责编排和交互，复杂规则放 `src/game/engine.ts`，可复用 UI 放 `src/components/game/`。
- 大段配置、候选池、地图、英雄和物品模板放 `src/game/`，不要塞进 SFC。
- 共享视觉样式放 `src/style/`；页面一次性样式才考虑组件内 scoped style。

## 4. Vue 与 uni-app 规则

- 使用 `<script setup lang="ts">` 和组合式 API；页面命名组件时可加 `defineOptions({ name: '...' })`。
- Vue/uni-app API 虽有 auto-import，但新代码优先显式 import，保持依赖可读；同一文件内不要混用两种风格。
- 模板只使用 uni-app 组件：`view`、`text`、`image`、`button`、`input`、`scroll-view` 等，不写 `div`、`span`、`section`。
- `v-for` 必须有稳定 `:key`；不要在模板中执行复杂计算，派生值放 `computed`。
- 不直接修改 props；父子交互使用 emit 或 store action。
- 定时器、窗口监听、指针监听必须在 `onUnmounted` 清理。
- `window`、`document`、`AudioContext` 等 H5 API 必须放在 `// #ifdef H5` 内；清理逻辑同样包裹。
- 条件编译只用于平台差异；本项目的其他端差异不应提前引入。

## 5. TypeScript 与领域数据

- 开启 `strict`，不要用类型断言掩盖结构错误；确实需要 narrowing 时先用守卫缩小类型。
- 对象形状用 `interface`，并沿用项目习惯加 `I` 前缀，如 `IGameSave`、`IBattle`、`IHero`；联合类型用 `type`。
- 非简单函数写明参数和返回类型；公开 store action、engine 函数必须显式返回类型。
- 领域类型只放 `src/game/types.ts`，业务常量与构造器放 `src/game/data.ts`。
- 修改存档结构时同步更新：`IGameSave`、`initialSave()`、`validateSave()`、持久化路径和迁移/兼容逻辑。
- 战斗、奖励、升级等可测试规则必须是确定性函数；随机逻辑通过显式 seed 推进，不在组件里直接随机。

## 6. 状态与持久化

- store 使用 Pinia setup 写法：`defineStore('name', () => { ... })`。
- 只有必须跨页面或刷新恢复的状态才持久化；当前游戏存档只持久化 `save`。
- 持久化统一通过 `pinia-plugin-persistedstate`，不手写业务状态的 `uni.setStorageSync` 同步。
- store action 负责校验资源、扣费、发奖、推进战斗和提示；组件不复制这些规则。
- 游戏循环和异步结果必须可暂停、可恢复、可清理，避免重复计时器或重复结算。

## 7. 请求与错误处理（未来接后端时）

- 调用链固定为：页面/组件 → `src/api/*` → `src/http/*` → `uni.request`。
- API 入参与响应必须有明确类型；HTTP 响应通过封装拆包后再进入业务层。
- 错误按 `Auth`、`Business`、`Http`、`Network` 分类处理；401 与登录态失效由请求层统一处理。
- 业务层不手动注入 `Authorization`，不重复判断 401。
- 环境地址放 `env/`，禁止在业务代码中硬编码服务端地址。

## 8. UI、样式与素材

- 视觉母题：**水墨纸感**。保留米色纸面、轻微纤维、发丝墨线、克制的墨色层级和宋/楷标题。
- 去掉朱砂印章、印章轮廓、盖章式按钮/标签和盖章动效；不使用朱砂红作为主题色或大面积装饰色。
- 业务品质色只用于数据语义，不升级为全局主题色。
- 尺寸继续使用参考皮肤设计坐标。新增布局若必须适配，优先通过统一 `scale` 和少量 CSS 变量解决，不逐元素改坐标。
- 样式优先级：复用现有语义类 → 在 `src/style/` 增加共享皮肤类 → 组件 scoped 样式。简单工具布局可以使用 UnoCSS，但游戏皮肤不要散落大量原子类。
- 内联 `style` 只用于运行时计算的缩放、位置、进度或颜色；静态视觉写进 SCSS。
- 图标统一走 `GameIcon` 和 `src/static/game/*.svg`，不要用 emoji 或临时图标库替代。
- 保持 `prefers-reduced-motion` 支持；新增动画必须有清理和降级路径。
- 验收至少覆盖 375px、390px、750px 宽度；页面不应出现横向溢出、遮挡或不可点击控件。

## 9. 测试与验收

提交前必须通过：

```bash
pnpm type-check
pnpm lint
pnpm test:run
pnpm check:assets
```

涉及真实交互或布局时再运行：

```bash
pnpm build:h5
pnpm preview
pnpm test:browser
```

- 修改战斗、奖励、升级、存档规则时，同步补 `src/game/game.test.ts` 或新增领域测试。
- 修改布局坐标时，优先复用 `docs/reference-layout.json` 的断言与浏览器验收。
- 没有实际运行成功的命令，不得声称已通过。
- 使用 conventional commits：`feat:`、`fix:`、`docs:`、`style:`、`refactor:`、`perf:`、`test:`、`chore:`。

## 10. 任务完成清单

- [ ] 已确认改动依据来自 `参考/逆向还原/源码/h5`，而非上级无效文档。
- [ ] 未手改生成文件。
- [ ] SFC 顺序、类型、组件与目录职责符合本文件。
- [ ] 业务状态和存档迁移规则已同步。
- [ ] 样式仍符合水墨纸感，未重新引入朱砂印章。
- [ ] 已运行要求的验证命令，并如实报告结果。