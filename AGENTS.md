# AI 编码代理指令 (Agent Instructions)

这份指南用于帮助 AI 编码代理理解《墨守成规》项目的结构、规范和工作流程。

## 核心原则

- **纯静态前端**：这是一个基于 HTML5 Canvas + JavaScript 的纯前端项目。**严禁引入任何构建工具（如 Webpack/Vite）或 TypeScript**，除非用户明确要求。
- **水墨风格塔防**：游戏采用中国水墨风格（浓墨、淡墨、朱砂红），通过代码实现墨晕、拖影等特效。
- **单文件入口**：游戏唯一入口是 [index.html](index.html) (Canvas 视口固定为 960x432；地图比视口宽，靠镜头横向滚动：每格 72px，塔防 26 列 × 6 行，征服 22 列 × 6 行)。
- **当前玩法：字形弹道（2026-10-19 起）**：只启用「火」「水」两座塔，表现为笔画写出的字形弹道；敌人只有尸、鬼、巨，连续刷怪（开局前选敌潮「稀/常/潮」，默认「潮」），限时坚守 `HOLD_SECONDS` 秒获胜；塔防、征服各 2 关；已删除融合系统与升级系统；大招只自动释放。其余单字塔已下架（配置与代码保留，但不出现在关卡、商店、征服召唤池和图鉴里，也未维护，随时可能失效）。
- **现行实现优先**：带日期的工单、测试报告和设计提案描述的是当时状态，不自动代表当前功能或当前缺陷；先核对代码与现行架构文档。

## 强制规则（必须遵守）

### 工单计划

每次开始任何开发、修复、重构、UI调整或配置修改任务前，必须先在：

`docs/工单计划/`

创建对应 Markdown 工单。

工单至少包含：

* 任务目标
* 当前问题/背景
* 涉及文件
* 实施步骤
* 风险与注意事项
* 验收标准

没有工单不得直接开始修改代码。

### 完成报告

每次任务完成后，必须在：

`docs/完成报告/`

创建 Markdown 完成报告。

至少记录：

* 实际完成内容
* 修改文件
* 关键实现
* 测试/验证结果
* 未解决问题
* 后续建议

### 代码文件行数限制

所有代码文件原则上必须控制在 **600 行以内**。

如果修改后文件超过 600 行：

* 必须优先进行模块拆分；
* 按职责拆分组件、服务、工具、配置等；
* 不允许通过压缩代码、删除必要注释、合并多条语句等方式规避限制；
* 拆分后必须保证原有功能和行为不变。

对于当前已超过 600 行的历史文件，不做无关的大规模重构；但如果某次任务需要修改该文件，应评估并优先拆分。

## 开发与测试工作流

### 本地运行
可以直接使用静态服务器运行：
```bash
npx serve
```
然后在浏览器访问 `http://localhost:3000`。

### 平衡性测试
如果你修改了数值或平衡性相关的逻辑，**必须**运行平衡性测试：
```bash
npm run test:balance
```
涉及平衡性调整时，数值与行为以实际加载的配置和代码为准。若任务要求同步维护数值文档，使用 [全塔全敌数值平衡规格](docs/full-balance-spec.md) 时须先核对其历史基线数据，不得把其中的旧测试结论当作当前结果。

`test:balance` 现为「实验护栏」，只断言结构（火水配置齐全、三档密度单调、集中常量存在），不再断言平衡数值（决策 D12：本阶段不做数值平衡）。

统一测试命令：`npm test`（含 `check:line-count`）、`npm run test:balance`、`test:damage`、`test:frame`、`test:pool`、`test:levels`、`test:camera`、`test:path`、`test:glyph` 等，完整清单见 `package.json`。

## 架构与核心文件

在修改代码前，请先查阅真实实现，文档可能滞后。数值与行为始终以**代码为准**。

- **全局配置**：[js/config.js](js/config.js)、[js/config/domain-01.js](js/config/domain-01.js)、[js/config/domain-02.js](js/config/domain-02.js)、[js/config/domain-03.js](js/config/domain-03.js)、[js/config/glyph-battle.js](js/config/glyph-battle.js)（连续刷怪、敌潮三档、坚守、打击反馈等字形弹道集中配置）和 [js/config/glyphs.js](js/config/glyphs.js)（火、水笔画数据）共同建立运行时 `CONFIG`，包含炮塔、敌人、颜色等配置。游戏数值应集中在配置中，禁止在散落的模块中写死常量。
- **主控制器**：[js/game.js](js/game.js) 及 js/core/。管理游戏主循环、状态机以及所有实体列表。
- **核心实体**：
  - 炮塔：[js/tower.js](js/tower.js) 及 js/entities/towers/。处理塔的攻击、出售等（无升级）；`Tower` 的方法统一定义在 js/entities/towers/misc.js。
  - 敌人：[js/enemy.js](js/enemy.js) 及 js/entities/enemy/。处理移动、寻路、扣血和死亡分裂。
- **系统模块**：
  - **字形弹道**：`js/glyph/`（brush 笔刷、fx 特效与打击反馈、adapter 接入正式 `Tower`/`Enemy`、glyph-tower 通用笔画消耗/蓄力、fire/water 招式、system 调度）。
  - **路程与刷怪**：[js/core/path-track.js](js/core/path-track.js)（敌人沿里程 `s` 移动）、[js/core/spawner.js](js/core/spawner.js)（连续刷怪、敌潮、坚守计时）。
  - **镜头**：[js/core/camera.js](js/core/camera.js)（横向滚动、屏幕/世界坐标换算；滚轮、键盘、拖拽、边缘滚动）。
  - **关卡系统**：[js/levelManager.js](js/levelManager.js) 和 js/data/levels/。
  - **渲染系统**：[js/inkRenderer.js](js/inkRenderer.js) 和 [js/particle.js](js/particle.js)。负责水墨特效（飞白、墨滴、拖影）。
  - **UI 交互**：[js/ui.js](js/ui.js) 及 js/ui/。
- **测试与工具**：`tests/` 存放 Node 测试，`scripts/` 存放开发工具；根目录不再保留测试/工具入口。

## 关键技术约定

### 坐标与网格系统
- 游戏建立在网格坐标系之上。单位网格大小 `CELL_SIZE = 72` 像素（塔防 26×6，征服 22×6，视口 960×432）；屏幕坐标与世界坐标之间要经过镜头换算（`camera.js`）。
- 通过 `(gx, gy)` 表示网格坐标。
- 坐标转换约定使用工具函数：`gridToPixel()` 和 `pixelToGrid()`。
- 敌人移动依赖路径点数组（`path`）展开成的 `PathTrack`，用沿路里程 `s` 表示位置；征服模式路径为环形回路。

### 路径放置炮塔
- 炮塔的放置位置由配置中的 `onPath` 和关卡的 `placementGrid` 决定；不能假设只有山字塔需要放在路径上。
- 修改放置校验时，以 [js/core/towers.js](js/core/towers.js) 和当前配置为准。

## 重要文档参考

尽量避免复制文档内容，请需要时点击链接查阅：
- [当前结构基线](docs/architecture/current-structure.md)
- [运行时架构](docs/architecture-runtime.md)
- [UI 设计文档](docs/ui-design-spec.md)
- [数值平衡规格历史快照](docs/full-balance-spec.md)
- [融合塔设计提案](docs/fusion-tower-designs.md)（历史快照；融合系统已于 2026-10-19 整套删除）
- [字形弹道玩法引入工单与总报告](docs/工单计划/2026-10-19-字形弹道玩法引入/00-总览.md)
