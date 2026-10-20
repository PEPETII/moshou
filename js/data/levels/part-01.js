// 普通模式关卡数据注册：大关卡一「初墨 · 荒村」（1-1 ～ 1-5，工单 03）
//
// 网格：6 行 × 26 列（每格 72px，世界宽 1872px，视口 960px 由镜头横向滚动）。
// 路径由拐点折线展开成逐格路径（相邻拐点必须同行或同列）；多条路径用二维数组。
// 编排字段（roster、heavy、elites、boss、surges、hpMul）的含义见 js/core/spawn-schedule.js 与 js/levelManager.js。
function polylineCells(corners) {
  const cells = [];
  for (let i = 0; i < corners.length; i++) {
    const [x, y] = corners[i];
    if (i === 0) { cells.push({x, y}); continue; }
    const [px, py] = corners[i - 1];
    const dx = Math.sign(x - px);
    const dy = Math.sign(y - py);
    let cx = px, cy = py;
    while (cx !== x || cy !== y) {
      cx += dx; cy += dy;
      cells.push({x: cx, y: cy});
    }
  }
  return cells;
}

// 巨的出现间隔：三档敌潮（稀 / 常 / 潮）
const giantEvery = (sparse, normal, flood) => ({ sparse, normal, flood });

Object.assign(LEVELS_DATA, {
  // ========== 主题1: 初墨 · 荒村（教学：放塔、重敌、骨、狐蛛、夜叉、首领） ==========
  "1-1": {
    id: "1-1", name: "初阵", theme: 1, difficulty: 1,
    startInk: 300, coreHp: 20, holdSeconds: 120, hpMul: 1.0,
    // 左入右出：第 1 行向右 → 在 x=9 拐下 → 第 4 行向右至出口（两个拐角）
    path: polylineCells([[0,1],[9,1],[9,4],[25,4]]),
    core: {x:25,y:4},
    desc: "放下几座字塔，看它们蓄力、出招。坚守到时间结束即可。",
    roster: [{ type: 'corpse', weight: 70 }, { type: 'ghost', weight: 30 }],
    heavy: [],
    unlocks: []
  },
  "1-2": {
    id: "1-2", name: "弯道", theme: 1, difficulty: 2,
    startInk: 350, coreHp: 20, holdSeconds: 135, hpMul: 1.06,
    // 蛇形三段：第 0 行向右（上游，给火）→ 第 2 行向左 → 第 4 行向右（下游，给水）至出口
    path: polylineCells([[0,0],[23,0],[23,2],[2,2],[2,4],[25,4]]),
    core: {x:25,y:4},
    desc: "巨物缓行，血厚难缠。弓对重敌加伤。",
    roster: [{ type: 'corpse', weight: 65 }, { type: 'ghost', weight: 35 }],
    heavy: [{ type: 'giant', every: giantEvery(14, 10, 7), first: 20 }],
    unlocks: []
  },
  "1-3": {
    id: "1-3", name: "古井", theme: 1, difficulty: 3,
    startInk: 400, coreHp: 20, holdSeconds: 150, hpMul: 1.12,
    path: polylineCells([[0,3],[6,3],[6,0],[14,0],[14,5],[20,5],[20,2],[25,2]]),
    core: {x:25,y:2},
    desc: "古井边白骨未寒，散了还会再聚。以火焚之，以雷碎之。",
    roster: [
      { type: 'corpse', weight: 55 }, { type: 'ghost', weight: 25 },
      { type: 'bone', weight: 20, from: 15 },
    ],
    heavy: [{ type: 'giant', every: giantEvery(14, 10, 7), first: 20 }],
    unlocks: []
  },
  "1-4": {
    id: "1-4", name: "乱坟岗", theme: 1, difficulty: 4,
    startInk: 450, coreHp: 20, holdSeconds: 165, hpMul: 1.18,
    path: polylineCells([[0,5],[4,5],[4,1],[11,1],[11,4],[18,4],[18,0],[25,0]]),
    core: {x:25,y:0},
    desc: "坟岗狐影乱窜，蛛丝缠笔。塔不宜聚，聚则同缚。",
    roster: [
      { type: 'corpse', weight: 45 }, { type: 'ghost', weight: 20 }, { type: 'bone', weight: 15 },
      { type: 'fox', weight: 12, from: 20 }, { type: 'spider', weight: 8, from: 40 },
    ],
    heavy: [{ type: 'giant', every: giantEvery(13, 9, 6), first: 20 }],
    elites: [{ type: 'yaksha', at: 70 }, { type: 'yaksha', at: 130 }],
    unlocks: []
  },
  "1-5": {
    id: "1-5", name: "夜行", theme: 1, difficulty: 5,
    startInk: 500, coreHp: 20, holdSeconds: 180, hpMul: 1.24,
    path: polylineCells([[0,2],[5,2],[5,5],[12,5],[12,1],[19,1],[19,4],[25,4]]),
    core: {x:25,y:4},
    desc: "夜深百鬼出行。坚守到天明，并斩下首领，方得太平。",
    // 首领出场后鬼的权重减半：首领自己会召唤鬼，避免鬼太多
    roster: [
      { type: 'corpse', weight: 40 },
      { type: 'ghost', weight: 20, to: 100 }, { type: 'ghost', weight: 10, from: 100 },
      { type: 'bone', weight: 15 }, { type: 'fox', weight: 15 }, { type: 'spider', weight: 10 },
    ],
    heavy: [{ type: 'giant', every: giantEvery(13, 9, 6), first: 20 }],
    elites: [{ type: 'yaksha', at: 45 }],
    boss: { type: 'baiguiyexing', at: 100, path: 0 },
    surges: [{ at: 150, dur: 10, rateMul: 1.4 }],
    unlocks: []
  },
});
