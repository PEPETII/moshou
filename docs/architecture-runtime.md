# 运行时架构与性能约定

本文档说明游戏主循环、渲染缓存、运行时索引和对象池的职责边界。项目仍然是纯静态 HTML5 Canvas + JavaScript，不引入构建工具。

## 主循环

`Game.start()` 使用 `requestAnimationFrame` 驱动更新和绘制。`Game.update(now)` 负责：

- 更新水墨入场动画、炮塔、敌人、光环、全局减速和粒子。
- 在每帧开始与实体清理后刷新存活敌人缓存。
- 将 `deltaTime` 限制在 50ms 内，避免安卓后台切回时出现粒子和动画跳变。

玩法数值以运行时 `CONFIG` 为准；它由 `js/config.js`、`js/config/domain-*.js`、`js/config/glyph-battle.js` 和 `js/config/glyphs.js` 按 `index.html` 顺序共同建立。主循环不写死玩法数值。

## 渲染层

`StaticCanvasLayer` 负责离屏缓存静态画面：

- 背景底色
- 远山
- 网格
- 路径
- 核心
- 关卡标题

静态层只在关卡加载、画布尺寸变化或显式 `invalidate()` 后重建。每帧绘制时先把静态层复制到主 Canvas，再绘制塔、敌人、弹道、粒子、拖拽预览和调试信息。

动态效果不要写入静态层，否则返回菜单、重开关卡或切关后可能残留旧状态。

## 运行时索引

`RuntimeIndexes` 维护两个网格索引和一个存活敌人缓存：

- `towerByCell`：按 `gx,gy` 查询任意炮塔。
- `blockingTowerByCell`：只记录 `tower.onPath && tower.hp > 0` 的阻挡塔。
- `aliveEnemies`：当前可被攻击和范围效果处理的敌人。

以下操作后必须刷新炮塔索引：

- 放置炮塔
- 移除炮塔
- 出售炮塔
- 融合炮塔（`Fusion.perform`：移除两座素材塔后重建索引；征服模式同步 `_towerIndex`）
- 阻挡塔被摧毁

敌人缓存由主循环刷新；手动生成敌人或分裂敌人后也要立即刷新，避免 UI 或即时效果读取到旧数据。

## 对象池

粒子系统使用固定数组池，`acquireParticle()` 只返回空闲粒子，不扩容。

字形塔的弹道与地面效果不走对象池：统一放在 `game.glyphShots`，由 `GlyphSystem.update` 按 `tower.type` 分派给各塔招式的 `updateShot`，`done` 置真后在同帧压缩移除。塔被出售或参与融合后，已发出的弹道照常收尾。新增字形塔时用 `GlyphSystem.push(game, shot)` 发弹道，不要自建列表。

## 调试开关

访问地址追加 `?debug=1` 时启用运行时调试信息：

- FPS
- 炮塔数量
- 敌人数量
- 弹道数量
- 粒子数量

默认 URL 不显示调试层，也不输出移动端缩放日志。
