// 普通模式关卡数据注册：大关卡三「铁砚 · 关隘」（3-1 ～ 3-5，工单 05）
// 主题是重甲与地形限制：岩石格（specialTerrain，不能建造）压缩建塔空间。
// 岩石格与路径格重叠时以路径为准（rocks 直接过滤掉路径格）。

// 矩形岩石区：xs、ys 为列、行的取值列表
function rockCells(xs, ys, pathCells) {
  const onPath = new Set((pathCells || []).map((c) => `${c.x},${c.y}`));
  const out = [];
  for (const y of ys) for (const x of xs) if (!onPath.has(`${x},${y}`)) out.push({ x, y, type: 'rock' });
  return out;
}
const rangeOf = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

const P31 = polylineCells([[0,2],[8,2],[8,3],[17,3],[17,2],[25,2]]);
const P32 = polylineCells([[0,1],[6,1],[6,4],[13,4],[13,1],[20,1],[20,4],[25,4]]);
const P33A = polylineCells([[0,0],[9,0],[9,2],[25,2]]);
const P33B = polylineCells([[0,5],[9,5],[9,2],[25,2]]);
const P35 = polylineCells([[0,3],[10,3],[10,0],[16,0],[16,5],[22,5],[22,3],[25,3]]);

Object.assign(LEVELS_DATA, {
  "3-1": {
    id: "3-1", name: "隘口", theme: 3, difficulty: 11,
    startInk: 550, coreHp: 20, holdSeconds: 160, hpMul: 1.55,
    path: P31, core: {x:25,y:2},
    specialTerrain: rockCells(rangeOf(10, 15), [0, 5], P31),
    desc: "关隘狭窄，来者披甲。小刀刮不动铁皮，先以金破其甲。",
    roster: [
      { type: 'corpse', weight: 35 }, { type: 'ghost', weight: 15 }, { type: 'bone', weight: 10 },
      { type: 'kai', weight: 20, from: 10 }, { type: 'fox', weight: 10 }, { type: 'turtle', weight: 10 },
    ],
    heavy: [{ type: 'giant', every: giantEvery(12, 8, 6), first: 20 }],
    elites: [{ type: 'yaksha', at: 100 }],
    unlocks: []
  },
  "3-2": {
    id: "3-2", name: "栈道", theme: 3, difficulty: 12,
    startInk: 600, coreHp: 20, holdSeconds: 170, hpMul: 1.61,
    path: P32, core: {x:25,y:4},
    specialTerrain: rockCells(rangeOf(0, 25), [0, 5], P32),
    desc: "栈道临崖，无处落脚。骑者冲关，须以水风挫其锋。",
    roster: [
      { type: 'corpse', weight: 30 }, { type: 'ghost', weight: 15 }, { type: 'kai', weight: 15 },
      { type: 'rider', weight: 20, from: 15 }, { type: 'frog', weight: 10 }, { type: 'jiao', weight: 10 },
    ],
    heavy: [{ type: 'giant', every: giantEvery(12, 8, 6), first: 20 }],
    elites: [{ type: 'baigujing', at: 90 }],
    unlocks: []
  },
  "3-3": {
    id: "3-3", name: "双关", theme: 3, difficulty: 13,
    startInk: 650, coreHp: 20, holdSeconds: 180, hpMul: 1.67,
    path: [P33A, P33B], core: {x:25,y:2},
    specialTerrain: rockCells(rangeOf(0, 3), [2, 3], [...P33A, ...P33B]),
    desc: "两关并守，巫者在后。擒贼先擒王，治病先除巫。",
    roster: [
      { type: 'corpse', weight: 30 }, { type: 'ghost', weight: 10 }, { type: 'kai', weight: 15 },
      { type: 'rider', weight: 15 }, { type: 'shaman', weight: 15, from: 20 }, { type: 'bone', weight: 15 },
    ],
    heavy: [{ type: 'giant', every: giantEvery(12, 8, 6), first: 20 }],
    elites: [{ type: 'puppet', at: 70, path: 0 }, { type: 'puppet', at: 140, path: 1 }],
    unlocks: []
  },
  "3-4": {
    id: "3-4", name: "千嶂", theme: 3, difficulty: 14,
    startInk: 700, coreHp: 20, holdSeconds: 190, hpMul: 1.73,
    path: polylineCells([[0,4],[3,4],[3,1],[8,1],[8,4],[13,4],[13,1],[18,1],[18,4],[23,4],[23,1],[25,1]]),
    core: {x:25,y:1},
    desc: "千嶂叠翠，镇墓兽出。墓开之时，群尸涌出。",
    roster: [
      { type: 'corpse', weight: 25 }, { type: 'ghost', weight: 10 }, { type: 'kai', weight: 15 },
      { type: 'rider', weight: 15 }, { type: 'shaman', weight: 10 }, { type: 'turtle', weight: 10 }, { type: 'spider', weight: 15 },
    ],
    heavy: [{ type: 'giant', every: giantEvery(12, 8, 6), first: 20 }],
    elites: [{ type: 'zhenmushou', at: 80 }, { type: 'baigujing', at: 150 }],
    unlocks: []
  },
  "3-5": {
    id: "3-5", name: "铜墙", theme: 3, difficulty: 15,
    startInk: 750, coreHp: 20, holdSeconds: 210, hpMul: 1.79,
    path: P35, core: {x:25,y:3},
    specialTerrain: rockCells(rangeOf(11, 15), [2, 3], P35),
    desc: "铜墙铁壁，箭矢难入。破甲为先，以地火攻其后。",
    roster: [
      { type: 'corpse', weight: 25 }, { type: 'ghost', weight: 10 }, { type: 'kai', weight: 20 },
      { type: 'rider', weight: 15 }, { type: 'shaman', weight: 15 }, { type: 'turtle', weight: 15 },
    ],
    heavy: [{ type: 'giant', every: giantEvery(12, 8, 6), first: 20 }],
    elites: [{ type: 'puppet', at: 60 }],
    boss: { type: 'tongqiangtiebi', at: 115, path: 0 },
    unlocks: []
  },
});
