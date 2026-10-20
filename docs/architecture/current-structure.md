# 结构优化后基线

- 日期：2026-09-16
- 分支：`refactor/structure-600-lines-20260916`
- 运行形态：纯静态 HTML5 Canvas + Classic JavaScript，无构建工具。

> 2026-10-19 字形弹道重构后，旧融合系统（`js/fusionSystem.js`、`js/ui/fusion.js`、`js/modes/conquest/fusion.js`、`js/entities/towers/fusion.js` 等）、升级系统与 48px 网格均已移除，新增 `js/glyph/`、`js/core/camera.js`、`js/core/path-track.js`、`js/core/spawner.js`、`js/config/glyph-battle.js`、`js/config/glyphs.js`。
> 2026-10-20 按字形结构重建融合：`js/config/fusion.js`（配方）、`js/core/fusion.js`（校验与结算）、`js/ui/fusion-panel.js`（信息面板合成区）、`js/ui/codex-fusion.js`（合字图鉴）；并新增 `js/config/glyphs-ext.js`、`js/config/glyphs-fusion.js`、`js/glyph/kit.js` 与十一座新塔的招式文件。下文中的其余描述为历史基线。
>
> 本文记录 2026-09-16 的结构重构验收基线。目录职责仍可作导航参考；分支名、文件行数和扫描统计只反映当次状态。当前入口与脚本顺序以 `index.html` 为准。

## 1. 已完成的边界

- `index.html` 仅保留 head 元数据、CSS/脚本装配和 body 注入入口。
- 原 head 初始化、视口适配、静态 DOM 模板和加载完成初始化已迁入 `js/bootstrap/`。
- `css/style.css` 与 `css/inline.css` 是兼容加载入口，实际规则按原级联顺序拆到片段文件。
- `CONFIG` 通过 `js/config.js` 建立兼容容器，再由 `js/config/domain-*.js`、`js/config/glyph-battle.js`、`js/config/glyphs.js`、`js/config/glyphs-ext.js`、`js/config/glyphs-fusion.js`、`js/config/fusion.js`、`js/config/enemies-single.js` / `enemies-multi.js` / `enemies-boss.js`（须在 `glyph-battle.js` 之前加载）、`js/config/control-rules.js`、`js/config/boss-battle.js` 注册。
- `LEVELS_DATA` 由 `js/levelsData.js` 建立容器，再由 `js/data/levels/part-*.js` 注册。
- `Tower`、`Enemy`、`Game`、`ConquestGame`、`UI` 保留原公开类名和构造方式；职责方法通过 prototype 子模块装配。
- 测试和开发工具分别归档到 `tests/`、`scripts/`，并由 `package.json` 提供命令入口；`scripts/check-line-count.js` 作为 600 行自动门禁接入 `npm test`。

## 2. 主要目录责任

| 目录 | 责任 |
|---|---|
| `js/bootstrap/` | 资源预加载、响应式适配、页面 DOM 装配、加载完成初始化 |
| `js/config/` | 炮塔/敌人/视觉/玩法配置，字形弹道集中配置与笔画数据 |
| `js/glyph/` | 字形弹道：笔刷、特效与打击反馈、共用工具 `kit.js`、控制规则 `control-rules.js`（`ControlRules`）、十五座字形塔各一个招式文件、调度与注册表（`system.js`）。山是普通塔，被动「镇」压制敌人能力冷却 |
| `js/core/` | Game 的塔操作、融合（`fusion.js`，征服共用）、波次、场景流程、绘制和运行控制；刷怪编排（`spawn-schedule.js`、`spawner.js`）与首领流程（`boss.js`） |
| `js/entities/towers/` | Tower 的重置、出售、更新入口与受击震动（攻击、投射物与旧塔体绘制已于 2026-10-20 随 32 座下架塔删除） |
| `js/entities/enemy/` | Enemy 的状态、死亡、召唤和绘制；`segments.js` 多字分段与伤害管线，`abilities/` 20 种新敌人的能力实现（`registry.js` 调度） |
| `js/data/levels/` | 普通模式关卡数据注册：`part-01～04.js` 各一个主题，共 4 主题 × 5 关（含 roster / heavy / elites / boss / surges 编排字段） |
| `js/modes/conquest/` | 征服模式刷怪、流程和绘制 |
| `js/ui/` | 菜单、图鉴（妖异录含 23 种敌人与能力说明、合字图鉴）、敌潮选择（含本关敌人预览）、输入、面板与合成区、通知、首领血条（`boss-bar.js`）、新敌人初见提示（`enemy-hint.js`）和征服 UI |
| `tests/` / `scripts/` | 自动化检查与开发期工具 |

## 3. 600 行检查结果

本轮生成和修改的 HTML/CSS/JS 文件最高为 598 行（`tests/test-balance.js`）。分支级全量扫描已完成：76 个 HTML/CSS/JS 文件中超 600 行文件为 0 个，最大文件为 598 行。数据文件按注册块拆分，未删除数据、注释或错误处理。

## 4. 兼容约束

- 入口仍采用同步 classic script，拆分文件必须保持 `index.html` 中的依赖顺序。
- `window.CONFIG`、`CONFIG`、`THEMES`、`LEVELS_DATA`、`Tower`、`Enemy`、`Game`、`UI` 和 `ConquestGame` 继续作为兼容访问点。
- 本轮不改变玩法数值、不迁移 ES Modules、不引入构建链。


## 5. 扩展注册点

| 扩展内容 | 注册/维护位置 | 约束 |
|---|---|---|
| 炮塔、敌人及领域配置 | `js/config/domain-*.js` | 继续写入 `CONFIG` 兼容容器，不改变全局访问名 |
| 字形弹道招式与数值 | `js/glyph/`、`js/config/glyph-battle.js`、`js/config/glyphs*.js` | 新增塔需补笔画数据与招式参数（经 `applyGlyphMoves` 注入）、招式文件，并在 `GlyphSystem.IMPLS` 登记；数值集中在配置里 |
| 融合配方 | `js/config/fusion.js` | 只改 `CONFIG.FUSION.recipes`；合字塔自身属性在 `domain-02.js` 与 `glyphs-fusion.js` 独立配置 |
| 普通模式关卡 | `js/data/levels/part-*.js`，由 `js/data/levels/export.js` 汇总 | 只新增注册块，不修改 `LEVELS_DATA` 的兼容入口 |
| 征服模式规则 | `js/modes/conquest/` 与既有征服数据文件 | 只放征服独有流程，复用实体和公共系统 |
| 自动检查与开发工具 | `tests/`、`scripts/`、`package.json` | 新增脚本也必须保持不超过600行，并接入可重复命令 |

新增职责优先落在对应注册点和子模块中；不得恢复超长单体文件，不在本边界内引入 ES Modules、TypeScript 或构建链。
