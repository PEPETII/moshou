# 代码走查报告 - 阶段二：核心游戏循环走查

**项目名称**: 《墨守成规》  
**走查日期**: 2026-04-29  
**走查人员**: AI 代码审查助手  
**审查范围**: 核心游戏循环、状态机、更新渲染分离

---

## 📋 走查摘要

- **检查范围**: 
  - [js/game.js](js/game.js) - 游戏主循环
  - [js/ui.js](js/ui.js) - UI交互
  - [js/inkTrailAnimation.js](js/inkTrailAnimation.js) - 开场动画
  - [js/tower.js](js/tower.js) - 炮塔系统
  - [js/enemy.js](js/enemy.js) - 敌人系统
- **发现问题总数**: 15
- **严重程度分布**: 🔴 严重 4 | 🟠 中等 6 | 🟡 轻微 3 | 💡 建议 2

---

## 🔴 严重问题（必须修复）

### 问题 #1: 游戏循环未正确处理暂停状态

| 项目 | 内容 |
|------|------|
| **描述** | `update()` 在暂停时直接返回，但 `draw()` 仍继续渲染，且 `lastTime` 未更新导致恢复时产生巨大 deltaTime |
| **位置** | [js/game.js:735-768](js/game.js#L735-L768) |
| **复现步骤** | 1. 开始游戏 2. 点击暂停（如果存在）3. 恢复后敌人瞬间移动 |
| **建议修复** | 暂停时也应更新 `lastTime`，或记录暂停开始时间并在恢复时补偿 |

```javascript
// 当前代码（问题）
update(now) {
  if (this.gameEnded || this.paused) return;  // 直接返回，lastTime 未更新
  // ...
  const deltaTime = Math.min(now - this.lastTime, 50);  // 恢复时可能产生巨大差值
  this.lastTime = now;
}

// 建议修复
update(now) {
  if (this.gameEnded) return;
  
  if (this.paused) {
    this.lastTime = now;  // 更新 lastTime 防止累积
    return;
  }
  // ...
}
```

---

### 问题 #2: spawnNextEnemy 使用 setTimeout 造成内存泄漏风险

| 项目 | 内容 |
|------|------|
| **描述** | 游戏结束时未清理待执行的 setTimeout |
| **位置** | [js/game.js:398-419](js/game.js#L398-L419) |
| **复现步骤** | 1. 开始波次 2. 在敌人生成间隔内结束游戏/返回菜单 3. setTimeout 回调仍可能执行 |
| **建议修复** | 保存 timer ID 并在游戏结束时清理，或使用可取消的 Promise |

```javascript
// 当前代码（问题）
spawnNextEnemy() {
  // ...
  if (this.spawnQueue.length > 0) {
    const nextDelay = this.spawnQueue[0].delay;
    setTimeout(() => this.spawnNextEnemy(), nextDelay);  // 未保存引用
  }
}

// 建议修复
constructor() {
  this.spawnTimerId = null;
}

spawnNextEnemy() {
  // ...
  if (this.spawnQueue.length > 0) {
    const nextDelay = this.spawnQueue[0].delay;
    this.spawnTimerId = setTimeout(() => this.spawnNextEnemy(), nextDelay);
  }
}

returnToMenu() {
  if (this.spawnTimerId) {
    clearTimeout(this.spawnTimerId);
    this.spawnTimerId = null;
  }
  // ...
}
```

---

### 问题 #3: UI 事件监听器重复绑定

| 项目 | 内容 |
|------|------|
| **描述** | `setupEventListeners` 中的事件监听器每次切换关卡都会重新绑定，但 `this._eventsBound` 只在构造函数中检查 |
| **位置** | [js/ui.js:973-1110](js/ui.js#L973-L1110) |
| **复现步骤** | 1. 完成一关进入下一关 2. 多次点击画布会发现事件触发多次 |
| **建议修复** | 将 `_eventsBound` 改为静态变量，或在 `destroy()` 中正确解绑事件 |

```javascript
// 当前代码（问题）
constructor(game) {
  if (!this._eventsBound) {  // 实例属性，每次 new UI 都会重置
    this.setupEventListeners();
    this._eventsBound = true;
  }
}

destroy() {
  this._eventsBound = false;  // 只是重置标志，事件处理器未真正解绑
}

// 建议修复：使用静态变量
static _eventsBound = false;

constructor(game) {
  if (!UI._eventsBound) {
    this.setupEventListeners();
    UI._eventsBound = true;
  }
}
```

---

### 问题 #4: 游戏状态未完全重置

| 项目 | 内容 |
|------|------|
| **描述** | `returnToMenu()` 和 `returnToLevelSelect()` 未清理 `particleSystem`、`projectilePool` 等对象的状态 |
| **位置** | [js/game.js:693-717](js/game.js#L693-L717) |
| **复现步骤** | 1. 游戏中产生大量粒子 2. 返回菜单 3. 重新开始游戏，粒子可能残留 |
| **建议修复** | 添加 `particleSystem.clear()` 和 `projectilePool.clear()` 调用 |

```javascript
// 建议修复
returnToMenu() {
  // ...
  this.particleSystem.clear();
  this.projectilePool.clear();
  this.towers = [];
  this.enemies = [];
  this.spawnQueue = [];
  // ...
}
```

---

## 🟠 中等问题（建议修复）

### 问题 #5: 主循环未使用 deltaTime 进行帧率独立更新

| 项目 | 内容 |
|------|------|
| **描述** | 敌人移动、塔攻击冷却等逻辑依赖帧率而非时间 |
| **位置** | [js/game.js:735-768](js/game.js#L735-L768) |
| **影响范围** | 高帧率设备上游戏速度过快，低帧率设备上过慢 |
| **建议修复** | 使用 `deltaTime` 标准化所有时间相关计算 |

---

### 问题 #6: InkTrailAnimation 未正确处理游戏结束

| 项目 | 内容 |
|------|------|
| **描述** | 动画播放期间游戏结束可能导致 `this.game` 为 null 的错误 |
| **位置** | [js/inkTrailAnimation.js:251-322](js/inkTrailAnimation.js#L251-L322) |
| **影响范围** | 玩家在开场动画期间返回菜单可能报错 |
| **建议修复** | 在 `update()` 中添加 `if (!this.game) return` 检查 |

---

### 问题 #7: Tower.updateProjectiles 可能访问已销毁的敌人

| 项目 | 内容 |
|------|------|
| **描述** | 子弹追踪逻辑未检查敌人是否已死亡 |
| **位置** | [js/tower.js](js/tower.js) |
| **影响范围** | 子弹可能追踪已死亡的敌人，导致空引用 |
| **建议修复** | 在追踪逻辑中添加 `enemy.dead` 检查 |

---

### 问题 #8: Enemy.update 中路径越界风险

| 项目 | 内容 |
|------|------|
| **描述** | `this.path[this.pathIndex]` 可能越界 |
| **位置** | [js/enemy.js:181-250](js/enemy.js#L181-L250) |
| **影响范围** | 敌人到达路径终点后可能继续访问数组 |
| **建议修复** | 添加边界检查 `if (this.pathIndex >= this.path.length)` |

---

### 问题 #9: UI 拖拽事件与点击事件冲突

| 项目 | 内容 |
|------|------|
| **描述** | 拖拽融合后可能触发点击事件 |
| **位置** | [js/ui.js:1153-1270](js/ui.js#L1153-L1270) |
| **影响范围** | 拖拽融合后可能同时触发塔的选中 |
| **建议修复** | 在拖拽结束时设置标志位阻止点击事件 |

---

### 问题 #10: 游戏胜利/失败状态未锁定输入

| 项目 | 内容 |
|------|------|
| **描述** | `gameOver` 后仍可放置炮塔、开始波次 |
| **位置** | [js/game.js:578-631](js/game.js#L578-L631) |
| **影响范围** | 游戏结束后仍可操作，导致状态混乱 |
| **建议修复** | 在 `gameOver` 后立即设置 `this.inputLocked = true` |

---

## 🟡 轻微问题（可选修复）

### 问题 #11: lastTime 初始化问题

| 项目 | 内容 |
|------|------|
| **描述** | `lastTime` 初始为 0，第一次 update 时 `now - 0` 会产生巨大 deltaTime |
| **位置** | [js/game.js:39](js/game.js#L39) |
| **建议修复** | 在 `start()` 中初始化 `this.lastTime = performance.now()` |

---

### 问题 #12: spawnQueue 处理异常

| 项目 | 内容 |
|------|------|
| **描述** | `spawnNextEnemy` 中 `this.spawnQueue[0].delay` 可能访问空数组 |
| **位置** | [js/game.js:413-418](js/game.js#L413-L418) |
| **建议修复** | 添加数组长度检查后再访问 |

---

### 问题 #13: 融合系统缓存未清理

| 项目 | 内容 |
|------|------|
| **描述** | `fuseTowers` 后调用 `clearCache()` 但 `canFuse` 的缓存策略不明确 |
| **位置** | [js/game.js:353](js/game.js#L353) |
| **建议修复** | 明确缓存策略，或移除不必要的缓存 |

---

## 💡 改进建议

### 建议 #1: 引入固定时间步长（Fixed Time Step）

| 项目 | 内容 |
|------|------|
| **建议内容** | 将更新逻辑与渲染分离，使用固定时间步长（如 16.67ms）进行物理/游戏逻辑更新 |
| **预期收益** | 消除帧率波动导致的游戏速度不一致，提高可预测性 |
| **实现难度** | 中等 |

---

### 建议 #2: 实现对象池模式

| 项目 | 内容 |
|------|------|
| **建议内容** | 敌人、子弹、粒子等频繁创建销毁的对象使用对象池 |
| **预期收益** | 减少 GC 压力，提高性能稳定性 |
| **实现难度** | 中等 |

---

## 🔄 完整流程模拟

```
1. 页面加载
   └── window.gameInstance = new Game()  [js/game.js:975-976]
       └── 构造函数初始化所有状态
       └── 绑定全局错误监听（正确）✓
       
2. 用户点击"塔防模式"
   └── UI.showThemeSelect()  [js/ui.js:860-886]
       └── 渲染主题选择界面 ✓
       
3. 用户选择关卡
   └── Game.startGame(levelId)  [js/game.js:676-691]
       └── 隐藏菜单，显示游戏容器 ✓
       └── loadLevel() 初始化关卡数据 ✓
       └── inkTrailAnimation.play() 播放开场动画
           └── ⚠️ 问题6: 动画期间返回菜单可能报错
       └── 启动游戏循环 start()
           └── requestAnimationFrame(gameLoop)  [js/game.js:957-965]
           
4. 游戏主循环运行
   └── update(timestamp)  [js/game.js:735-768]
       ├── ⚠️ 问题1: 暂停状态处理不完善
       ├── ⚠️ 问题5: 未使用 deltaTime 进行帧率独立更新
       └── 更新塔、敌人、粒子等状态
   └── draw()  [js/game.js:770-790]
       └── 渲染所有游戏对象 ✓
       
5. 用户点击"开始波次"
   └── Game.startWave()  [js/game.js:362-396]
       └── 初始化 spawnQueue
       └── spawnNextEnemy()  [js/game.js:398-419]
           └── ⚠️ 问题2: setTimeout 未保存引用，无法清理
           
6. 敌人生成并移动
   └── Enemy.update()  [js/enemy.js:181-250]
       └── ⚠️ 问题8: 路径索引可能越界
       
7. 用户拖拽融合炮塔
   └── UI.setupDragAndDrop()  [js/ui.js:1153-1270]
       └── ⚠️ 问题9: 拖拽与点击事件可能冲突
       
8. 波次完成/游戏结束
   └── Game.gameOver()  [js/game.js:578-631]
       └── ⚠️ 问题10: 未锁定输入，用户仍可操作
       
9. 用户返回菜单
   └── Game.returnToMenu()  [js/game.js:693-717]
       └── stop() 取消动画帧 ✓
       └── ⚠️ 问题4: 未清理粒子、子弹池状态
       └── ⚠️ 问题3: UI 事件监听器可能重复绑定
       
10. 用户重新开始游戏
    └── 回到步骤3，但可能存在残留状态
        └── ⚠️ 问题3: 事件重复绑定导致点击触发多次
```

---

## 修复优先级建议

### P0（立即修复）
- 问题 #2: setTimeout 内存泄漏
- 问题 #3: UI 事件重复绑定

### P1（本周修复）
- 问题 #1: 暂停状态处理
- 问题 #4: 状态未完全重置
- 问题 #10: 游戏结束未锁定输入

### P2（下版本修复）
- 问题 #5: 帧率独立更新
- 问题 #6-9: 其他中等问题

### P3（可选）
- 问题 #11-13: 轻微问题
- 建议 #1-2: 架构改进

---

## 附录

### 相关文件清单

| 文件 | 作用 | 代码行数 |
|------|------|----------|
| [js/game.js](js/game.js) | 游戏主循环、状态管理 | ~975 |
| [js/ui.js](js/ui.js) | UI交互、事件处理 | ~2000+ |
| [js/inkTrailAnimation.js](js/inkTrailAnimation.js) | 开场动画 | ~383 |
| [js/tower.js](js/tower.js) | 炮塔逻辑 | ~800+ |
| [js/enemy.js](js/enemy.js) | 敌人逻辑 | ~600+ |

---

*报告生成时间: 2026-04-29*  
*走查工具: AI Code Review Assistant*
