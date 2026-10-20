# AI 编码代理指令 (Agent Instructions)

这份指南用于帮助 AI 编码代理理解《墨守成规》项目的结构、规范和工作流程。

## 核心原则

- **纯静态前端**：这是一个基于 HTML5 Canvas + JavaScript 的纯前端项目。**严禁引入任何构建工具（如 Webpack/Vite）或 TypeScript**，除非用户明确要求。
- **水墨风格塔防**：游戏采用中国水墨风格（浓墨、淡墨、朱砂红），通过代码实现墨晕、拖影等特效。
- **单文件入口**：游戏唯一入口是 [index.html](index.html) (Canvas 视口固定为 960x432；地图比视口宽，靠镜头横向滚动：每格 72px，塔防 26 列 × 6 行，征服 22 列 × 6 行)。
- **当前玩法：字形弹道（2026-10-19 起，2026-10-20 扩充）**：商店与征服召唤池有十二座单字塔——火、水、土、木、金、风、炮、雷、冰、弓、山、剑（`CONFIG.ACTIVE_TOWERS`），另有三座只能融合得到的合字塔——炎（火+火）、林（木+木）、焚（林+火）。每座塔都是笔画写出的字形弹道，普攻消耗笔画、写回即冷却，蓄满自动放大招；山是唯一路径塔（有生命、挡路）。融合：选中素材塔，另一份素材在相邻 8 格内，在信息面板点「合」，配方集中在 `CONFIG.FUSION`（[js/config/fusion.js](js/config/fusion.js)），校验与结算在 [js/core/fusion.js](js/core/fusion.js)；图鉴有炮塔志、妖异录、合字图鉴三页，合字全部开放。敌人只有尸、鬼、巨，连续刷怪（开局前选敌潮「稀/常/潮」，默认「潮」），限时坚守 `HOLD_SECONDS` 秒获胜；塔防、征服各 2 关；没有升级系统。2026-10-20 前的 32 座旧单字塔与旧攻击链已删除（留档 [docs/legacy-towers.md](docs/legacy-towers.md)），现有金风炮雷冰弓山剑是按字形结构重建的新实现，与旧版无关。
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

`test:balance` 现为「实验护栏」，只断言结构（十五座字形塔配置齐全、三档密度单调、集中常量存在），不再断言平衡数值（决策 D12：本阶段不做数值平衡）。`test:glyph` 串跑 `test-glyph-battle.js`（火水土木与打击反馈）、`test-glyph-towers.js`（十一座新塔）、`test-fusion.js`（融合）。

统一测试命令：`npm test`（含 `check:line-count`）、`npm run test:balance`、`test:damage`、`test:frame`、`test:pool`、`test:levels`、`test:camera`、`test:path`、`test:glyph` 等，完整清单见 `package.json`。

## 架构与核心文件

在修改代码前，请先查阅真实实现，文档可能滞后。数值与行为始终以**代码为准**。

- **全局配置**：[js/config.js](js/config.js)、[js/config/domain-01.js](js/config/domain-01.js)、[js/config/domain-02.js](js/config/domain-02.js)、[js/config/domain-03.js](js/config/domain-03.js)、[js/config/glyph-battle.js](js/config/glyph-battle.js)（连续刷怪、敌潮三档、坚守、打击反馈等字形弹道集中配置）、[js/config/glyphs.js](js/config/glyphs.js)（火、水、土、木笔画与招式参数，及全部字形塔配色与通用 `applyGlyphMoves`）、[js/config/glyphs-ext.js](js/config/glyphs-ext.js)（金风炮雷冰弓山剑）、[js/config/glyphs-fusion.js](js/config/glyphs-fusion.js)（合字笔画由素材字组合生成，及炎林焚招式参数）和 [js/config/fusion.js](js/config/fusion.js)（融合配方、冷却、相邻范围）共同建立运行时 `CONFIG`，包含炮塔、敌人、颜色等配置。游戏数值应集中在配置中，禁止在散落的模块中写死常量。
- **主控制器**：[js/game.js](js/game.js) 及 js/core/。管理游戏主循环、状态机以及所有实体列表。
- **核心实体**：
  - 炮塔：[js/tower.js](js/tower.js) 及 js/entities/towers/（`misc.js` 重置/更新/出售、`effects.js` 受击、`rendering-basic.js` 绘制入口）。塔的攻击由 `js/glyph/` 的字形组件接管（无升级）；`Tower` 的方法统一定义在 js/entities/towers/misc.js。
  - 敌人：[js/enemy.js](js/enemy.js) 及 js/entities/enemy/。处理移动、寻路、扣血和死亡分裂。
- **系统模块**：
  - **字形弹道**：`js/glyph/`（brush 笔刷、fx 特效与打击反馈、adapter 接入正式 `Tower`/`Enemy`、glyph-tower 通用笔画消耗/蓄力、kit 新塔共用工具（落点、沿路取敌、飞行笔画绘制）、每塔一个招式文件、system 调度与 `GlyphSystem.IMPLS` 注册表）。新增字形塔：配置三件套（`TOWERS` 条目、`GLYPHS` 笔画、招式参数经 `applyGlyphMoves` 注入）+ `js/glyph/<type>.js`（`update`/`cast`/`updateShot`/`drawShot`）+ 在 `IMPLS` 登记 + `index.html` 与 `tests/helpers/glyph-env.js` 加载。
  - **融合**：[js/core/fusion.js](js/core/fusion.js)（配方查询、校验、结算，塔防与征服共用）、[js/ui/fusion-panel.js](js/ui/fusion-panel.js)（信息面板合成区）、[js/ui/codex-fusion.js](js/ui/codex-fusion.js)（合字图鉴）。
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
- [融合塔设计提案](docs/fusion-tower-designs.md)（2026-10-19 前旧融合系统的历史快照，与现行炎、林、焚三条配方无关）
- [十一塔与融合系统工单](docs/工单计划/2026-10-20-十一塔与融合系统.md)（现行十五座字形塔与融合的设计表）
- [字形弹道玩法引入工单与总报告](docs/工单计划/2026-10-19-字形弹道玩法引入/00-总览.md)
