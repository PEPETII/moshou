# 结构优化后基线

- 日期：2026-09-16
- 分支：`refactor/structure-600-lines-20260916`
- 运行形态：纯静态 HTML5 Canvas + Classic JavaScript，无构建工具。

## 1. 已完成的边界

- `index.html` 仅保留 head 元数据、CSS/脚本装配和 body 注入入口。
- 原 head 初始化、视口适配、静态 DOM 模板和加载完成初始化已迁入 `js/bootstrap/`。
- `css/style.css` 与 `css/inline.css` 是兼容加载入口，实际规则按原级联顺序拆到片段文件。
- `CONFIG` 通过 `js/config.js` 建立兼容容器，再由 `js/config/domain-*.js` 和 `js/config/fusion.js` 注册。
- `LEVELS_DATA` 由 `js/levelsData.js` 建立容器，再由 `js/data/levels/part-*.js` 注册。
- `Tower`、`Enemy`、`Game`、`ConquestGame`、`UI` 保留原公开类名和构造方式；职责方法通过 prototype 子模块装配。
- 测试和开发工具分别归档到 `tests/`、`scripts/`，并由 `package.json` 提供命令入口。

## 2. 主要目录责任

| 目录 | 责任 |
|---|---|
| `js/bootstrap/` | 资源预加载、响应式适配、页面 DOM 装配、加载完成初始化 |
| `js/config/` | 炮塔/敌人/视觉/玩法配置和融合配方构建 |
| `js/core/` | Game 的塔操作、波次、场景流程、绘制和运行控制 |
| `js/entities/towers/` | Tower 的攻击、效果、投射物、绘制和 FusionTower |
| `js/entities/enemy/` | Enemy 的状态、死亡、召唤和绘制 |
| `js/data/levels/` | 普通模式关卡数据注册 |
| `js/modes/conquest/` | 征服模式融合、波次、流程和绘制 |
| `js/ui/` | 菜单、图鉴、融合、输入、面板、通知和征服 UI |
| `tests/` / `scripts/` | 自动化检查与开发期工具 |

## 3. 600 行检查结果

本轮生成和修改的 HTML/CSS/JS 文件最高为 598 行（`tests/test-balance.js`）。分支级全量扫描已完成：75 个 HTML/CSS/JS 文件中超 600 行文件为 0 个，最大文件为 598 行。数据文件按注册块拆分，未删除数据、注释或错误处理。

## 4. 兼容约束

- 入口仍采用同步 classic script，拆分文件必须保持 `index.html` 中的依赖顺序。
- `window.CONFIG`、`CONFIG`、`THEMES`、`LEVELS_DATA`、`Tower`、`Enemy`、`Game`、`UI` 和 `ConquestGame` 继续作为兼容访问点。
- 本轮不改变玩法数值、不迁移 ES Modules、不引入构建链。
