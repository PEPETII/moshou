# AI 编码代理指令 (Agent Instructions)

这份指南用于帮助 AI 编码代理理解《墨守成规》项目的结构、规范和工作流程。

## 核心原则

- **纯静态前端**：这是一个基于 HTML5 Canvas + JavaScript 的纯前端项目。**严禁引入任何构建工具（如 Webpack/Vite）或 TypeScript**，除非用户明确要求。
- **水墨风格塔防**：游戏采用中国水墨风格（浓墨、淡墨、朱砂红），通过代码实现墨晕、拖影等特效。
- **单文件入口**：游戏唯一入口是 [index.html](index.html) (Canvas 固定大小 800x480)。

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
node test-balance.js
```
测试通过后，请同步检查并更新 [BALANCE_CHANGES.md](BALANCE_CHANGES.md) 和 [README-BALANCE.md](README-BALANCE.md)。

## 架构与核心文件

在修改代码前，请先查阅真实实现，文档可能滞后。数值与行为始终以**代码为准**。

- **全局配置**：**[js/config.js](js/config.js)**。这是最重要的文件，包含所有的炮塔 (`CONFIG.TOWERS`)、敌人 (`CONFIG.ENEMIES`)、融合配方 (`CONFIG.FUSION_TOWERS`) 和颜色配置。**游戏数值必须集中在此，禁止在散落的模块中写死常量。**
- **主控制器**：[js/game.js](js/game.js)。管理游戏主循环、状态机以及所有实体列表。
- **核心实体**：
  - 炮塔：[js/tower.js](js/tower.js)。处理基础塔和融合塔的攻击、升级等。
  - 敌人：[js/enemy.js](js/enemy.js)。处理移动、寻路、扣血和死亡分裂。
- **系统模块**：
  - **融合系统**：[js/fusionSystem.js](js/fusionSystem.js)。处理拖拽融合的特殊合法性校验。
  - **关卡系统**：[js/level.js](js/level.js) 和 [js/levelManager.js](js/levelManager.js)。
  - **渲染系统**：[js/inkRenderer.js](js/inkRenderer.js) 和 [js/particle.js](js/particle.js)。负责水墨特效（飞白、墨滴、拖影）。
  - **UI 交互**：[js/ui.js](js/ui.js)。

## 关键技术约定

### 坐标与网格系统
- 游戏建立在网格坐标系之上。单位网格大小 `CELL_SIZE = 48` 像素。
- 通过 `(gx, gy)` 表示网格坐标。
- 坐标转换约定使用工具函数：`gridToPixel()` 和 `pixelToGrid()`。
- 敌人移动严格依赖路径点数组（`path`）。

### 特殊实体的注意事项
- **山字塔（Mountain Tower）特殊性**：与其他塔不同，山字塔是**唯一**必须放置在**路径（Path）**上的塔。它具有阻挡敌人和反伤特性。在修改塔的放置、路径校验和融合系统时，必须特殊处理山字塔逻辑。

## 重要文档参考

尽量避免复制文档内容，请需要时点击链接查阅：
- [初步需求文档](docs/初步需求文档.md) / [游戏设计文档 (GDD)](docs/GDD.md)
- [数值设计文档](docs/numerical-design-spec.md)
- [炮塔设计文档](docs/tower-design-spec.md)
- [UI 设计文档](docs/ui-design-spec.md)
- AI 旧版指南备忘：[CLAUDE.md](CLAUDE.md)
