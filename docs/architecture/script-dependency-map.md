# 脚本依赖图与加载顺序

## 1. 真实加载顺序

来源：`index.html:2572-2589`。所有脚本都是普通同步 `<script src>`，当前没有 `defer`、`async` 或 `type="module"`。

```text
config
  → utils
  → runtime
  → levelsData
  → inkRenderer
  → particle
  → tower
  → enemy
  → objectPool
  → levelManager
  → fusionSystem
  → menuInkBg
  → inkTrailAnimation
  → ui
  → game
  → conquestLevelsData
  → conquestProgress
  → conquestGame
  → index.html 内联 ResourceLoader 回调
```

## 2. 提供者、消费者与顺序约束

下表记录主要全局符号，不宣称替代完整静态调用图。

| 顺序 | 脚本 | 主要提供 | 已确认的主要消费者/约束 |
|---:|---|---|---|
| 1 | `js/config.js` | `CONFIG`；构建 `CONFIG.FUSION_TOWERS`、`CONFIG.FUSION_EVOLUTION_RECIPES` | `utils`、实体、系统、UI、模式均读取；融合构建必须在 `fusionSystem` 前完成 |
| 2 | `js/utils.js` | `distance`、`distanceSq`、`gridToPixel`、`pixelToGrid`、`lerp`、`clamp`、拖拽函数 | 依赖 `CONFIG.CELL_SIZE`；实体和 UI 使用坐标/数学函数 |
| 3 | `js/runtime.js` | `gridKey`、`distanceSq`、`isAliveEnemy`、`RuntimeIndexes`、`StaticCanvasLayer`、`DebugStatsOverlay` | `Game` 创建运行时设施；静态层调用 Game 绘制方法 |
| 4 | `js/levelsData.js` | `THEMES`、`LEVELS_DATA` | `LevelManager` 读取；UI/Game 间接使用关卡数据 |
| 5 | `js/inkRenderer.js` | `InkRenderer` | `Game`、`ConquestGame` 创建并调用 |
| 6 | `js/particle.js` | `Particle`、`ParticleSystem` | `Game`、`Tower`、`Enemy`、`ConquestGame` 使用 |
| 7 | `js/tower.js` | `Tower`、`FusionSkillExecutor`、`FusionTower` | 依赖 `CONFIG`、坐标函数、Game 的实体列表/池；`Game`、`UI`、`ConquestGame` 创建 |
| 8 | `js/enemy.js` | `Enemy` | 依赖 `CONFIG`、坐标函数、Game；`Game` 和 `ConquestEnemy` 创建 |
| 9 | `js/objectPool.js` | `ObjectPool`、`EnemyPool`、`TowerPool`、`ProjectilePool`、`PoolManager`、`poolManager` | `Game` 明确创建 `ProjectilePool`；其他池的实际消费者需后续复核 |
| 10 | `js/levelManager.js` | `LevelManager`、`levelManager` | 依赖 `LEVELS_DATA`；Game/UI 通过全局管理器查询 |
| 11 | `js/fusionSystem.js` | `FusionSystem`、`fusionSystem` | 依赖 `CONFIG.FUSION_TOWERS`；Game/UI/Conquest 通过全局系统融合和预览 |
| 12 | `js/menuInkBg.js` | `MENU_EFFECT_MODES`、`MenuInkBackground` | `UI`/Game 创建菜单背景效果 |
| 13 | `js/inkTrailAnimation.js` | 拖影颜色和 `InkTrailAnimation` | UI/实体动画调用；直接写元素样式 |
| 14 | `js/ui.js` | `UI` | 依赖 DOM、`CONFIG`、`levelManager`、`fusionSystem`、Game/Conquest 全局入口 |
| 15 | `js/game.js` | `Game`、`window.gameInstance`（load 时创建） | 依赖前述实体/系统/UI；拥有普通模式主循环和高层切换 |
| 16 | `js/conquestLevelsData.js` | `CONQUEST_THEMES`、`generateWaves`、`generateLevel`、`CONQUEST_LEVELS_DATA` | `conquestProgress`、`ConquestGame` 读取 |
| 17 | `js/conquestProgress.js` | `ConquestProgressManager`、`conquestProgress` | 依赖 `localStorage`；Conquest UI/Game 使用 |
| 18 | `js/conquestGame.js` | `ConquestEnemy`、`ConquestGame`、`window.conquestGame`（load 时创建） | 依赖 `Enemy`、`CONFIG`、渲染/粒子/Tower/FusionSystem、Conquest 数据和 DOM |

## 3. 关键依赖链

```text
CONFIG
 ├─→ utils（CELL_SIZE）
 ├─→ Tower / Enemy / ConquestGame（数值、颜色、玩法）
 └─→ config 内部融合构建
       └─→ fusionSystem.registerBatch(CONFIG.FUSION_TOWERS)

utils + runtime + renderer + particle + objectPool
 └─→ Game
      ├─→ UI
      ├─→ Tower / Enemy / LevelManager / FusionSystem
      └─→ update / draw / mode transition

levelsData → LevelManager → Game/UI
conquestLevelsData → conquestProgress / ConquestGame
Game ↔ UI
Game ↔ Tower ↔ Enemy
Game ↔ ConquestGame（通过 window.gameInstance / window.conquestGame 的场景交叉引用）
```

## 4. 已确认的依赖风险

1. **配置初始化顺序**：`js/config.js:987-1240` 在同一脚本中构建融合配方；`js/fusionSystem.js:154-156` 立即注册，因此不能把融合注册提前。
2. **Classic script 隐式共享**：顶层 `const`/`class`/`function` 被后续脚本直接使用，没有显式 import/export；首轮拆分不得同时迁移 ES Modules。
3. **`CONFIG` 兼容入口**：`js/config.js:2-6` 读取 `window.CONFIG`，但没有确认到写回；测试 VM 没有 `window` 会在配置执行前失败。拆分必须避免重复声明顶层 `const CONFIG`，并保留兼容访问策略。
4. **重复基础函数**：`utils.js:27-29` 与 `runtime.js:15-19` 都定义 `distanceSq`；后续只能在确认所有调用方后合并。
5. **运行时回调**：`Game` 和 `ConquestGame` 都在 `load` 上创建实例，入口内联脚本另有 `ResourceLoader.onComplete` 对 `window.initGame` 的条件调用；初始化语义需要在 Phase 1/2 中保持。
6. **双向对象引用**：Tower 读取 Game 的实体列表和 projectile pool，Enemy 通过 Game 处理阻挡/核心/实体移除，UI 直接调用 Game 方法并读取内部列表；应先设计上下文接口再拆文件。

## 5. 迁移规则

- 第一轮保持普通同步脚本，明确新文件的加载位置；不使用 `defer`、`async` 或 module。
- 一次只迁移一个职责，保留旧构造/全局兼容入口；验证通过后才删除旧实现。
- 每次修改入口加载顺序后，运行 `node --check`、自动测试和最小浏览器 smoke；无法运行浏览器时必须记录未验证。
- 回滚以最近一次职责迁移为单位，恢复旧文件和原 `<script>` 顺序。
