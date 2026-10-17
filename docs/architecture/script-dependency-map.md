# 脚本依赖图与加载顺序

> 本文于 2026-09-28 对照当前 `index.html` 复核。`index.html` 的脚本标签是加载顺序的事实来源；本页按职责分组，未逐项抄录全部标签。

## 1. 加载阶段

项目使用普通同步 `<script src>`，没有 `defer`、`async` 或 `type="module"`。入口与主要加载阶段如下：

1. **启动与页面装配**：`js/bootstrap/resource-loader.js`、`device-profile.js`、`viewport.js`、`page-markup.js`；随后按顺序加载音频模块 `js/audio.js`（核心）、`audio-cues.js`（短音效）、`audio-bgm.js`（背景音乐）、`audio-director.js`（场景导演）。
2. **配置与普通关卡数据**：`js/config.js`、`js/config/domain-01.js`、`domain-02.js`、`domain-03.js`、`fusion.js`；随后加载 `utils.js`、`runtime.js`、`levelsData.js`、`js/data/levels/part-*.js` 和 `export.js`。
3. **公共实体与系统**：先加载渲染/粒子、`tower.js` 及 `js/entities/towers/` 扩展、`enemy.js` 及 `js/entities/enemy/` 扩展，再加载对象池、关卡管理、融合系统和水墨动画。
4. **UI 与普通模式**：先加载 `ui.js` 及 `js/ui/` 扩展，再加载 `game.js` 及 `js/core/` 扩展。
5. **征服模式与收尾初始化**：加载征服数据、进度、`conquestGame.js`、`js/modes/conquest/` 扩展，最后加载 `js/bootstrap/init.js`。

完整次序请直接查看 [index.html](../../index.html)。

## 2. 关键依赖约束

- `CONFIG` 容器和领域配置必须先于依赖配置的工具、实体、系统与 UI 加载；融合配方在 `js/config/fusion.js` 中构建，必须先于 `js/fusionSystem.js`。
- `LEVELS_DATA` 及普通关卡注册必须先于 `js/levelManager.js`。
- `Tower`、`Enemy`、`UI`、`Game` 和 `ConquestGame` 的基础脚本先于对应的 prototype 扩展模块。
- 征服模式扩展依赖已加载的公共实体、征服关卡数据和进度模块。
- 经典脚本共享全局符号。调整脚本标签或移动职责时，必须保持提供者先于消费者，并检查 `index.html` 的实际顺序。

## 3. 当前职责入口

| 职责 | 实现位置 |
|---|---|
| 配置与融合配方 | `js/config.js`、`js/config/` |
| 普通关卡数据 | `js/levelsData.js`、`js/data/levels/` |
| Game 编排 | `js/game.js`、`js/core/` |
| Tower 与 Enemy | `js/tower.js`、`js/entities/towers/`、`js/enemy.js`、`js/entities/enemy/` |
| 程序化音效与 BGM | `js/audio.js`、`js/audio-cues.js`、`js/audio-bgm.js`、`js/audio-director.js` |
| UI | `js/ui.js`、`js/ui/` |
| 征服模式 | `js/conquest*.js`、`js/modes/conquest/` |

更完整的职责边界见 [当前结构基线](current-structure.md)。

## 4. 验证入口

- `npm test`：运行行数检查、平衡与融合检查，以及征服触屏、拖拽放置和墨迹寿命相关检查。
- 单项脚本入口见根目录 `package.json`；执行结果以当次命令输出为准。
