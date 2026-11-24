# 封天神魔 · H5重建

基于 [feige996/unibest](https://github.com/feige996/unibest) 4.4.1，使用 Vue 3、TypeScript、uni-app H5、Pinia、UnoCSS。

本项目以 `参考/逆向还原/源码/h5` 的原始 EUI 皮肤和客户端模块为唯一还原依据，**不执行上级 `xiuxian/docs` 中的产品规则**。目标端仅 H5。

## 运行

```powershell
cd E:\code\lijunxi\temp\xiuxian\xiuxian\xiuxian-app
pnpm install --ignore-scripts
pnpm dev:h5
```

开发地址：[http://localhost:5180](http://localhost:5180)。

```powershell
pnpm build:h5
pnpm preview
```

生产预览：[http://localhost:5181](http://localhost:5181)，静态输出为 `dist/build/h5/`。生产目录用 HTTP 服务打开，不要双击 `index.html`。

## 当前实现

- 选区、人/仙/魔/妖创角、姓名/性别选择。
- 原始8项导航：道友、包裹、洞府、战斗、探索、活动、仙城。
- 修炼首页与斗法画面分离；自动战斗、技能、血量/能量、倍速/跳过、结算和通关奖励。
- 六格布阵、单次/十次招募、重复碎片、道友等级/进阶/培养、装备/法宝/仙器配置。
- 道具分类、穿戴、强化、锁定、分解、出售、合成、批量熔炼。
- 道友名称/简介/技能和2501关敌人及阵位来自原客户端配置，接入68位去重招募道友。
- 洞府建筑与灵液池、探索地图11个入口、可左右移动的仙城地图。
- 仙盟加入/创建/捐献/商店/副本、活动签到/在线/成长奖励、邮件、聊天、设置。

布局坐标见 `docs/reference-layout.json`；来源记录见 `docs/unibest-source.json`；开发/验收状态见 `docs/实现清单.md`。

## Mock与素材

无账号服务器、业务HTTP请求、WebSocket或支付SDK。数据存储在当前浏览器的 `localStorage.xiuxian`，刷新恢复，清除站点数据后重置。所有数值、招募概率、战斗结果、跨服对手均为本地 mock；真实服务端规则未还原。

`src/static/game/` 全部为独立绘制SVG，CSS重建边框、卷轴、墨迹、阵位和按钮，系统字体回退；没有导入原项目图片、字体、音频、骨骼或引擎脚本。与原素材保持替代关系，不能称为原画的逐像素复制。

## 验证

```powershell
pnpm type-check
pnpm lint
pnpm test:run
pnpm check:assets
```

`pnpm test:browser` 使用 Edge/Chrome 的 CDP 调试端口9444，对生产预览5181运行实际点击验收，输出截图和JSON报告；需先启动带独立测试profile的无头浏览器。`QA_URL`、`CDP_URL`、`QA_OUT` 可覆盖默认值。

当前版本尚不是所有997个原始皮肤/活动状态的完整一比一复刻。跨服赛季、长期运营活动、动态配置驱动内容、复杂战斗特效和原始数值协议仍需继续逐项还原，已明确列在实现清单中，未用空入口冒充完成。

unibest MIT许可保留于 `LICENSE`；原始说明保留于 `README.unibest.md`。

