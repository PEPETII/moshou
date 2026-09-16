# 结构重构基线结果

## 1. 基线范围

- 日期：2026-09-16。
- 工作区：`E:\news-game\moshou`。
- 目的：记录结构重构前的可重复命令结果和已知限制。
- 本阶段：不改变游戏行为，不移动代码，不改变脚本加载顺序。

## 2. 工作区和静态检查

| 检查 | 结果 | 证据 |
|---|---|---|
| 开始前工作区 | 通过 | `git status --short --untracked-files=all` 无输出，退出码 0 |
| JavaScript 语法 | 通过 | 对 `js/` 18 个 `.js` 逐文件执行 `node --check`；`NODE_CHECK_FAILED=0`，退出码 0 |
| 入口脚本引用 | 通过 | 从 `index.html` 提取 18 个 `script src`，逐一检查存在；`SCRIPT_REF_MISSING=0` |
| 页面实际浏览器流程 | 未验证 | 当前环境没有可用浏览器句柄；未能验证渲染、console、交互和响应式 |

## 3. Node 测试基线

### `node test-balance.js`

- 进程退出码：`0`。
- 输出结论：总体“需要进一步调整”，不能把退出码 0 解读为全部通过。
- 已通过输出：伤害塔达标率 `105.6%`；敌人达标率 `90.0%`。
- 未通过输出：辅助塔达标率 `20.0%`；战斗节奏达标率 `42.9%`；融合价值达标率 `0.0%`。
- 已确认原因：`test-balance.js:564-595` 只打印结果，没有在失败时设置非零退出码。
- 处理：作为既有数值基线记录，不在结构重构中修复。

### `node test-fusion-recipes.js`

- 进程退出码：`1`。
- 原始错误：`ReferenceError: window is not defined`。
- 调用链：`test-fusion-recipes.js:5-8` 创建空 VM sandbox 并执行 `js/config.js`；`js/config.js:2-6` 直接访问 `window.CONFIG`。
- 处理：作为既有测试可执行性问题记录，不在结构重构中顺手修复。

## 4. 代理补充验证（未由主代理复核）

Phase 0 官方基线代理报告：曾启动临时静态服务，`http://127.0.0.1:3000` 的入口、CSS 和 18 个脚本共 20 个请求返回 200，失败请求数为 0；浏览器 smoke 因环境没有浏览器句柄未执行。

该结果是代理报告，不作为主代理已复核的浏览器功能证据。后续实施阶段仍需重新启动服务并执行真实页面 smoke。

## 5. 结构事实摘要

- 真实同步脚本顺序见 [script-dependency-map.md](../architecture/script-dependency-map.md)。
- 文件行数、字节数和超限清单见 [current-structure.md](../architecture/current-structure.md)。
- 核心责任与迁移边界见 [refactor-boundaries.md](../architecture/refactor-boundaries.md)。
- 当前超限重点：`index.html` 2627 行、`css/style.css` 1849 行、`js/config.js` 1240 行、`js/conquestGame.js` 1473 行、`js/enemy.js` 818 行、`js/game.js` 1110 行、`js/levelsData.js` 1138 行、`js/tower.js` 2736 行、`js/ui.js` 2340 行。

## 6. 基线限制

- 没有 Playwright 配置和可执行 `*.spec.*`/`*.test.*` 用例；`npx playwright test --list` 的代理结果为 `Error: No tests found`、退出码 1。
- 没有完整浏览器 smoke、视觉截图或移动端实机证据。
- 数值测试和融合测试存在既有失败/退出码不一致；后续报告必须与本基线区分，不能声称结构改动导致或修复这些问题，除非有前后对比证据。
