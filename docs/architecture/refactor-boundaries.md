# 重构边界与责任表

## 1. 核心对象责任表

| 对象/模块 | 当前已确认职责 | 不应继续承担的职责 | 目标边界 |
|---|---|---|---|
| `Game` (`js/game.js`) | 普通模式状态、实体列表、关卡/波次、放置/融合、HUD 更新、主循环、绘制、场景切换、完成进度 | 具体战斗策略、UI 细节、纯数据转换、所有 progression 细节 | `js/core/game.js` + `core` 生命周期/调度；系统通过明确上下文接入 |
| `UI` (`js/ui.js`) | 菜单/图鉴、HUD、塔面板、输入/拖拽、融合对话框、通知、conquest UI | 直接持有大量 Game 内部状态、所有场景规则、跨模式编排 | `js/ui/` 下 controller；`UI` 保留兼容外壳；每个 controller 自己 bind/unbind/destroy |
| `Tower` / `FusionTower` (`js/tower.js`) | 生命周期、升级、目标选择、攻击、投射物、状态、光环、特殊技能、融合、绘制 | Game 主循环编排、DOM 操作、配置生成 | `js/entities/towers/`；保留 Tower/FusionTower 构造和兼容方法 |
| `Enemy` (`js/enemy.js`) | 路径移动、山塔阻挡、伤害/状态、死亡/分裂/召唤、到达核心、绘制 | 直接决定 UI 结构或模式专属编排 | `js/entities/enemy/`；按实际职责最小拆分 |
| `FusionSystem` (`js/fusionSystem.js`) | 配方注册、组件索引、预览缓存、墨水/路径/进化校验 | 创建实体、扣墨水、操作 DOM | `js/systems/fusion/`；校验通过上下文接口读取状态 |
| `LevelManager` (`js/levelManager.js`) | 普通关卡 registry、主题、解锁、缓存、数据读取 | 关卡数据本体、Canvas 绘制、模式专属规则 | `js/systems/level/` + `js/data/levels/` |
| `RuntimeIndexes` (`js/runtime.js`) | 炮塔/阻挡格索引、存活敌人索引 | 玩法规则、实体生命周期拥有权 | `js/core/runtime.js` 或 `js/shared/runtimeIndexes.js` |
| `InkRenderer` (`js/inkRenderer.js`) | Canvas 水墨绘制辅助 | 关卡和模式状态管理 | `js/rendering/ink/` |
| `ConquestGame` (`js/conquestGame.js`) | conquest 画布、环形路径、召唤/自动波次、专属场景、进度和输入 | 第二套完整 Tower/Enemy 核心、普通模式公共规则 | `js/modes/conquest/`；只保留模式独有规则，复用 core/entities/systems |
| 配置/数据 | `CONFIG`、普通/征服关卡数据、融合定义 | 复杂匿名业务行为、模式控制流程 | `js/config/`、`js/data/`；数据注册与行为分离 |

## 2. 已确认的关键调用链

### 普通模式

```text
window load
  → new Game()                         js/game.js:1108-1110
     → new UI(this)                     js/game.js:43-44
     → new ParticleSystem()             js/game.js:48
     → new ProjectilePool()             js/game.js:49
     → new RuntimeIndexes(this)         js/game.js:50
     → new StaticCanvasLayer(this)      js/game.js:51
     → new DebugStatsOverlay(this)      js/game.js:52
  → start/update/draw                   js/game.js:1080-1088
```

### 融合

```text
config buildFusionConfig
  → CONFIG.FUSION_TOWERS                 js/config.js:987-1240
  → fusionSystem.registerBatch           js/fusionSystem.js:154-156
  → UI/Game/Conquest canFuse/fuse        ui.js、game.js、conquestGame.js
  → new FusionTower(type, gx, gy, game)   tower.js:2380+
```

### 山塔路径/阻挡

```text
CONFIG tower.onPath
  → Game placement validation             game.js:274-288
  → RuntimeIndexes blocking index         runtime.js:37-43
  → Enemy.checkBlocking                   enemy.js:390-415
```

这条协议必须作为一个整体迁移；不得只移动 Tower 的绘制或 Enemy 的 `checkBlocking`。

## 3. 重点拆分边界

### config

- 可拆：gameplay/ink、towers、enemies、colors、fusion builder。
- 必须保留：顶层 `CONFIG` 兼容访问、原 key/默认值/数值、融合构建在基础数据之后完成。
- 风险：classic script 下重复声明 `const CONFIG`，或让 `fusionSystem` 早于配方生成。

### tower

- 可拆：targeting、combat、projectiles、status effects、rendering、fusion skill。
- `Tower` 兼容外壳继续拥有构造、update、draw、升级等公开方法。
- `FusionTower` 不是普通配置对象；`tower.js:2349-2733` 的融合技能和组件关系需单独验证。
- `ProjectilePool` 的 reset 契约必须明确，避免旧 `burn/slow/type/elementType` 字段残留。

### ui

- 可拆：菜单、HUD、塔面板、融合对话框、输入、Modal、conquest UI。
- `js/ui.js:61-106` 会重建塔选择 DOM；`1995-1997` 可再次触发。重建后必须可追踪旧监听器。
- `destroy()`、`bind()`、`unbind()` 的 owner 必须清晰；必须回归菜单 → 游戏 → 菜单 → 再次游戏。

### game/enemy/conquest

- `Game` 只保留高层生命周期和调度；纯数据、战斗策略和 UI 细节移到系统/控制器。
- `Enemy` 的状态更新与伤害/死亡跨越多个区域，不可按方法名孤立搬迁。
- conquest 复用 Enemy/Tower/FusionSystem，但独有路径、召唤、波次、进度和场景 UI 必须留在 mode 层。
- conquest 融合调用 `js/conquestGame.js:493-510` 没有向 `FusionSystem` 传入 path；`fusionSystem.js:167-191` 在没有 path 时跳过路径校验，属于须专门验证的语义风险，不在 Phase 0 修复。

## 4. 阶段化回滚边界

| 批次 | 单位 | 回滚内容 |
|---|---|---|
| Phase 1 | 一组 HTML/CSS 职责 | 恢复 `index.html` 对应样式块、CSS 引用和新增样式文件 |
| P2-A | 配置领域 | 恢复 `js/config.js` 与原脚本标签；保持旧 `CONFIG` |
| P2-B | Tower 一个职责 | 恢复 `js/tower.js` 和对应加载顺序；保留其他已验证批次 |
| P2-C | UI 一个 controller | 恢复 `js/ui.js` 及其入口绑定；清理新增 controller 引用 |
| P2-D/E/F | Game/Enemy/Conquest 一个职责 | 恢复对应原文件和调用方；不跨批次删除兼容层 |
| Phase 3 | 测试/工具/文档路径迁移 | 恢复旧路径和引用，不修改游戏实现 |

## 5. 未验证项

- 真实浏览器中 DOM ID 缺失、`initGame` 条件调用、样式覆盖、z-index、字体降级和事件泄漏的实际表现。
- conquest 山塔/融合语义分叉是否会在可达流程中发生。
- `PoolManager` 未使用是否为历史遗留或隐藏调用。

这些项目在对应实施阶段必须通过浏览器或最小复现验证；Phase 0 只建立边界，不修复。
