# Phase 2 工单：JavaScript 核心模块拆分

## 任务目标

对项目最主要的结构风险——超大 JS 文件和隐式全局依赖——进行渐进式治理，同时保持原生 JavaScript 和现有游戏行为。

## 前置条件

- Phase 0 基线完成。
- Phase 1 已稳定或至少 HTML/CSS 结构不再大范围变动。
- 已知真实脚本加载顺序。
- 已保存重构前测试结果。

## 总体策略

禁止一次性重写。

顺序建议：

```text
config → tower → ui → game → enemy → conquest/data
```

原因：先处理数据边界，再处理巨大实体与 UI，最后收缩 Game 编排器。

## A. config.js 拆分

### 目标

```text
js/config/
├─ gameplay.js
├─ towers.js
├─ enemies.js
├─ fusion.js
├─ colors.js
└─ config.js
```

### 兼容要求

继续向现有调用方暴露：

```js
window.CONFIG
```

调用方不需要在第一轮全部修改。

### 禁止

- 不调整数值。
- 不重命名配置 key。
- 不改变默认值。

## B. tower.js 拆分

建议按职责逐步提取：

```text
js/entities/towers/
├─ Tower.js
├─ FusionTower.js
├─ towerTargeting.js
├─ towerCombat.js
├─ towerProjectiles.js
├─ towerStatusEffects.js
├─ towerRendering.js
└─ fusionSkillExecutor.js
```

实际文件名应以真实代码职责为准，不要求机械照搬。

### 必须重点保护

- 山塔特殊放置/阻挡逻辑；
- projectile pool；
- target 生命周期；
- 状态效果；
- 融合塔组件关系；
- 攻击动画；
- 渲染顺序。

## C. ui.js 拆分

建议目标：

```text
js/ui/
├─ UI.js
├─ inputController.js
├─ hudController.js
├─ towerPanel.js
├─ fusionDialog.js
├─ menuController.js
└─ modalController.js
```

### 事件治理要求

每个事件监听器必须有明确 owner。

需要明确：
- bind；
- unbind/destroy；
- 是否允许重复初始化；
- touch passive 选项；
- menu → game → menu 循环后是否重复触发。

## D. game.js 收缩

`Game` 最终只负责：
- 生命周期；
- 当前关卡/模式编排；
- 系统调度；
- update/draw 主循环；
- 高层状态切换。

逐步移出：
- 可独立的战斗细节；
- UI 细节；
- 纯数据操作；
- progression 细节；
- 可由 LevelManager/Runtime 管理的逻辑。

## E. enemy.js

按实际规模决定是否拆：
- movement/path；
- status effects；
- damage/death；
- rendering；
- special abilities。

不要为了目录整齐强制拆成大量小文件。

## F. conquest 模式

明确普通塔防与 conquest：
- 共享哪些 core/entities/systems；
- conquest 独有状态；
- conquest 独有数据；
- progression 存储边界。

禁止复制一套 Tower/Enemy 逻辑形成第二套核心系统。

## 脚本加载策略

第一轮继续普通 `<script>`：

- 明确加载顺序；
- 避免循环依赖；
- 新模块挂载到明确 namespace/global；
- 不在本工单同时迁移所有文件到 ES Modules。

待本阶段完成后再评估：

```html
<script type="module">
```

原生 ES Modules 可作为后续独立工单，不需要 Vite/Webpack。

## 每个子拆分的执行模板

1. 阅读真实代码区域。
2. 列出其读写的全局变量。
3. 新建目标文件。
4. 原样迁移职责。
5. 通过参数/明确接口替代隐式耦合。
6. 保留临时兼容入口。
7. 修改脚本加载。
8. 运行 smoke + 自动测试。
9. 确认无回归后删除旧实现。
10. 提交。

一次只迁移一个职责。

## 验收标准

- [ ] `config.js` 不再承载所有配置领域。
- [ ] `tower.js` 降至 600 行以内或已完全由职责模块替代。
- [ ] `ui.js` 降至 600 行以内或已完全由职责模块替代。
- [ ] `game.js` 回归编排职责。
- [ ] `enemy.js` 满足 600 行限制。
- [ ] conquest 与通用核心边界明确。
- [ ] 不存在新增的 >600 行代码文件。
- [ ] 无双向循环依赖。
- [ ] 原有测试全部通过。
- [ ] 主菜单→游戏→菜单→再次游戏无重复监听问题。
- [ ] 完成报告记录所有兼容层，便于下一阶段清理。
