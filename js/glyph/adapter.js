// 字形招式与正式游戏之间的适配层（工单 05）
//
// 原型直接读全局 World.enemies / World.pointAt；正式游戏里这些都挂在 game 上
// （game.enemies、game.runtimeIndexes、敌人自带的 track）。招式代码一律通过这里取数，
// 不再引用任何原型全局，也不新建同名全局变量。
const GlyphWorld = {
  // 圆形范围内的存活敌人：塔防走空间分桶，征服（没有索引）退化为全量扫描
  enemiesInRange(game, x, y, r) {
    const idx = game.runtimeIndexes;
    if (idx && typeof idx.enemiesInRange === 'function') return idx.enemiesInRange(x, y, r);
    const out = [];
    const r2 = r * r;
    for (const e of game.enemies) {
      if (e.dead) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy <= r2) out.push(e);
    }
    return out;
  },

  // 离 (x, y) 最近、且在 r 以内的存活敌人
  // targetableOnly：只选能被单体锁定的（火星追踪）；范围落点不传
  nearestEnemy(game, x, y, r, targetableOnly) {
    let best = null;
    let bestD = r;
    for (const e of this.enemiesInRange(game, x, y, r)) {
      if (targetableOnly && !e.isTargetable()) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  },

  // 本局所有路径的里程表（塔防可能有多条路径，征服是一条环形回路）
  tracks(game) {
    const paths = Array.isArray(game.path[0]) ? game.path : [game.path];
    return paths.map((p) => game.getPathTrack(p));
  },

  // 世界边界（像素）：弹道飞出去太远就自行结束
  bounds(game) {
    const w = game.worldW || (game.COLS ? game.COLS * game.CELL_SIZE : CONFIG.GRID_COLS * CONFIG.CELL_SIZE);
    return { w, h: CONFIG.GRID_ROWS * CONFIG.CELL_SIZE };
  },

  // 统一伤害入口：走 Enemy.hit → takeDamage，奖励墨、击杀音效、统计照常触发
  damage(e, amount, opts) {
    if (e.dead) return;
    e.hit(amount, opts);
    GlyphFX.number(e, amount, opts);
  },
};
