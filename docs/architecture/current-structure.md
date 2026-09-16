# 当前结构基线

## 1. 审计范围与方法

- 审计日期：2026-09-16。
- 范围：入口 HTML、CSS、`js/**/*.js`、根目录测试/工具脚本、`package.json`、README、AGENTS 和现有架构/测试文档。
- 行数：使用 UTF-8 `ReadAllLines` 统计；字节数取文件长度；排除 `node_modules`、`midscene_run`、`.git`。
- 结论分级：已确认来自源码或实际命令；推断来自调用链但未运行完整流程；未验证表示当前环境没有浏览器流程证据。
- 本阶段不移动文件、不改业务代码、不改数值、不改脚本加载顺序。

## 2. 当前目录树（结构相关部分）

```text
moshou/
├─ index.html
├─ package.json
├─ README.md
├─ AGENTS.md
├─ generate-posters.js
├─ test-balance.js
├─ test-fusion-recipes.js
├─ css/
│  └─ style.css
├─ js/
│  ├─ config.js
│  ├─ conquestGame.js
│  ├─ conquestLevelsData.js
│  ├─ conquestProgress.js
│  ├─ enemy.js
│  ├─ fusionSystem.js
│  ├─ game.js
│  ├─ inkRenderer.js
│  ├─ inkTrailAnimation.js
│  ├─ levelManager.js
│  ├─ levelsData.js
│  ├─ menuInkBg.js
│  ├─ objectPool.js
│  ├─ particle.js
│  ├─ runtime.js
│  ├─ tower.js
│  ├─ ui.js
│  └─ utils.js
└─ docs/
   ├─ test-results/
   ├─ 工单计划/
   └─ 完成报告/
```

当前尚未建立 `docs/architecture`、`docs/design`、`docs/audits`、`docs/publishing`、`docs/roadmap` 和 `tests`、`scripts` 目标目录；本轮 Phase 0 仅创建架构基线文档目录。

## 3. 文件统计

| 文件 | 行数 | 字节 | >600 | 当前主要职责 |
|---|---:|---:|:---:|---|
| `index.html` | 2627 | 83329 | 是 | 页面结构、内联样式、资源预加载、脚本装配 |
| `css/style.css` | 1849 | 32458 | 是 | 基础、组件、页面和水墨效果样式混合 |
| `js/config.js` | 1240 | 34408 | 是 | 网格、炮塔、敌人、颜色、融合构建、玩法/渲染配置 |
| `js/conquestGame.js` | 1473 | 45262 | 是 | 征服模式实体、循环、输入、融合和 UI 场景 |
| `js/conquestLevelsData.js` | 145 | 4122 | 否 | 征服主题和关卡/波次数据生成 |
| `js/conquestProgress.js` | 280 | 7850 | 否 | 征服进度与 localStorage |
| `js/enemy.js` | 818 | 23264 | 是 | 敌人移动、阻挡、伤害/状态、死亡、绘制 |
| `js/fusionSystem.js` | 220 | 5876 | 否 | 融合注册、查询、校验和预览缓存 |
| `js/game.js` | 1110 | 29979 | 是 | 普通模式生命周期、实体、波次、UI、主循环 |
| `js/inkRenderer.js` | 389 | 10612 | 否 | Canvas 水墨绘制辅助 |
| `js/inkTrailAnimation.js` | 387 | 10388 | 否 | 菜单/实体拖影动画 |
| `js/levelManager.js` | 303 | 8230 | 否 | 普通关卡注册、查询、解锁和缓存 |
| `js/levelsData.js` | 1138 | 47497 | 是 | 普通主题与 50 个关卡数据 |
| `js/menuInkBg.js` | 450 | 13274 | 否 | 菜单水墨背景效果 |
| `js/objectPool.js` | 270 | 4921 | 否 | 通用、敌人、炮塔、投射物对象池 |
| `js/particle.js` | 160 | 3944 | 否 | 粒子实体与粒子系统 |
| `js/runtime.js` | 166 | 4200 | 否 | RuntimeIndexes、静态 Canvas 层、调试覆盖层 |
| `js/tower.js` | 2736 | 88074 | 是 | Tower、攻击/投射物/状态/绘制、FusionTower |
| `js/ui.js` | 2340 | 80101 | 是 | 菜单、HUD、面板、输入、融合、征服 UI |
| `js/utils.js` | 148 | 4339 | 否 | 坐标、距离、拖拽和通用数学函数 |
| `generate-posters.js` | 44 | 1559 | 否 | Playwright 海报生成工具 |
| `test-balance.js` | 598 | 20616 | 否 | 数值平衡输出；失败不设置非零退出码 |
| `test-fusion-recipes.js` | 96 | 3341 | 否 | VM 加载配置并检查融合配方 |

超限文件共 9 个：`index.html`、`css/style.css`、`js/config.js`、`js/conquestGame.js`、`js/enemy.js`、`js/game.js`、`js/levelsData.js`、`js/tower.js`、`js/ui.js`。数据量大的 `levelsData.js` 应按关卡/模式分拆，不应机械删减内容。

## 4. 已确认的结构事实

### 4.1 入口职责混合

- `index.html:10-198` 为资源加载、移动端缩放和横屏逻辑。
- `index.html:200-202` 加载字体，`203` 加载 `css/style.css`。
- `index.html:204-2067` 是大段内联 CSS；`2417`、`2420`、`2488` 还有 3 处行内 `style` 属性。
- `index.html:2069-2567` 是静态 DOM；`2572-2589` 是普通同步脚本；`2591-2624` 是资源预加载和初始化逻辑。
- `index.html:2616-2617` 条件调用 `window.initGame()`，当前源码审计未找到 `initGame` 定义；普通模式实际由 `js/game.js:1108-1110` 的 `load` 监听创建 `window.gameInstance`。

### 4.2 全局和重复基础设施

- Classic script 依赖顶层 `const CONFIG`、`THEMES`、`LEVELS_DATA` 等跨脚本可见符号；没有 import/export 边界。
- `js/config.js:2-6` 读取 `window.CONFIG`，但源码中没有对应的 `window.CONFIG = CONFIG` 赋值；测试 VM 因没有 `window` 会失败。
- `js/utils.js:27-29` 与 `js/runtime.js:15-19` 都提供 `distanceSq`，存在重复基础函数。
- `js/objectPool.js:168-185` 定义 `ProjectilePool`；`js/game.js:49` 创建普通模式池，`PoolManager` 当前没有确认到实际消费者。

### 4.3 模式和数据分布

- 普通模式数据位于 `js/levelsData.js:7-1133`，由 `js/levelManager.js:41-49` 读取。
- 征服数据位于 `js/conquestLevelsData.js:5-145`，进度由 `js/conquestProgress.js:5-280` 管理。
- `ConquestEnemy` 是 `Enemy` 的薄子类；普通塔防与 conquest 共享 `CONFIG`、渲染、粒子、Tower/Enemy/FusionSystem 等核心。
- 融合、爆炸、分裂和输入编排在 `game.js` 与 `conquestGame.js` 存在重复区域，后续需先确认公共协议再提取。

## 5. 已确认 / 推断 / 未验证

### 已确认

- 文件行数、字节数、超限清单和脚本引用均来自当前源码。
- `index.html` 仍同时承担页面骨架、内联 CSS、资源装配和初始化。
- `tower.js`、`ui.js`、`game.js`、`conquestGame.js`、`config.js` 和 `levelsData.js` 是主要结构风险点。
- 工作区开始前 `git status --short` 无输出；本阶段只新增 Phase 0 文档。

### 推断

- 若直接改变 classic script 顺序或改为 `defer`/module，可能破坏跨脚本顶层符号和 `CONFIG.FUSION_TOWERS` 初始化顺序；依据见 `index.html:2572-2589`、`js/config.js:987-1240`、`js/fusionSystem.js:154-156`。
- `config`、`tower`、`ui` 和 `game` 拆分需要保留兼容外壳，否则会扩大一次性调用方迁移范围。

### 未验证

- 浏览器真实渲染、computed style、移动/窄屏、字体失败降级、Canvas z-index 和完整菜单循环。
- 这些未验证项不得在 Phase 1/2 完成报告中写成已通过，除非有真实浏览器证据。
