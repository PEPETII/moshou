// 普通模式关卡数据注册：大关卡四「焚卷 · 终章」（4-1 ～ 4-5，工单 06）
// 终章：敌人开始反制塔（魇压蓄力、瘴减伤、饕吞噬成长），出现三路进攻，把前三个主题的敌人混编。
const ALL_SINGLES = ['bone', 'fox', 'spider', 'jiao', 'frog', 'turtle', 'kai', 'rider', 'shaman', 'nightmare', 'miasma', 'glutton'];

Object.assign(LEVELS_DATA, {
  "4-1": {
    id: "4-1", name: "余烬", theme: 4, difficulty: 16,
    startInk: 650, coreHp: 20, holdSeconds: 170, hpMul: 1.90,
    path: polylineCells([[0,0],[5,0],[5,4],[11,4],[11,1],[25,1]]),
    core: {x:25,y:1},
    desc: "余烬未冷，梦魇缠身。笔势被压，先以长弓点其要害。",
    // 权重按压力指数护栏（工单 11 §7）从初值 30/15/10/10/10/25 调整为 12/6/12/28/9/37：4-1 的 P 不低于 3-5 的 0.85 倍
    roster: [
      { type: 'corpse', weight: 12 }, { type: 'ghost', weight: 6 }, { type: 'bone', weight: 12 },
      { type: 'kai', weight: 28 }, { type: 'fox', weight: 9 }, { type: 'nightmare', weight: 37, from: 10 },
    ],
    heavy: [{ type: 'giant', every: giantEvery(12, 8, 5), first: 20 }],
    elites: [{ type: 'yaksha', at: 90 }],
    unlocks: []
  },
  "4-2": {
    id: "4-2", name: "焦土", theme: 4, difficulty: 17,
    startInk: 700, coreHp: 20, holdSeconds: 180, hpMul: 1.96,
    path: [
      polylineCells([[0,1],[14,1],[14,3],[25,3]]),
      polylineCells([[0,4],[8,4],[8,5],[20,5],[20,3],[25,3]]),
    ],
    core: {x:25,y:3},
    desc: "焦土瘴起，刀箭不入。一阵风来，雾散妖现。",
    roster: [
      { type: 'corpse', weight: 25 }, { type: 'ghost', weight: 15 }, { type: 'jiao', weight: 10 },
      { type: 'rider', weight: 10 }, { type: 'shaman', weight: 10 }, { type: 'nightmare', weight: 10 },
      { type: 'miasma', weight: 20, from: 15 },
    ],
    heavy: [{ type: 'giant', every: giantEvery(12, 8, 5), first: 20 }],
    elites: [{ type: 'puppet', at: 70, path: 1 }, { type: 'baigujing', at: 140, path: 0 }],
    unlocks: []
  },
  "4-3": {
    id: "4-3", name: "断简", theme: 4, difficulty: 18,
    startInk: 750, coreHp: 20, holdSeconds: 190, hpMul: 2.02,
    path: [
      polylineCells([[0,2],[6,2],[6,0],[18,0],[18,2],[25,2]]),
      polylineCells([[0,4],[22,4],[22,2],[25,2]]),
    ],
    core: {x:25,y:2},
    desc: "断简残编，饕餮贪食。它吃得越多，越难收拾。",
    roster: [
      { type: 'corpse', weight: 25 }, { type: 'ghost', weight: 10 }, { type: 'frog', weight: 10 },
      { type: 'turtle', weight: 10 }, { type: 'miasma', weight: 10 }, { type: 'nightmare', weight: 10 },
      { type: 'glutton', weight: 15, from: 20 }, { type: 'bone', weight: 10 },
    ],
    heavy: [{ type: 'giant', every: giantEvery(12, 8, 5), first: 20 }],
    elites: [{ type: 'zhenmushou', at: 80 }, { type: 'yaksha', at: 150, path: 1 }],
    unlocks: []
  },
  "4-4": {
    id: "4-4", name: "劫火", theme: 4, difficulty: 19,
    startInk: 800, coreHp: 20, holdSeconds: 200, hpMul: 2.08,
    path: [
      polylineCells([[0,0],[14,0],[14,2],[25,2]]),
      polylineCells([[0,3],[18,3],[18,2],[25,2]]),
      polylineCells([[0,5],[20,5],[20,2],[25,2]]),
    ],
    core: {x:25,y:2},
    desc: "劫火三路齐至，前面学过的，都用上。",
    // 尸、鬼合计约占 30%，十二种新单字敌人各占 5.5
    roster: [
      { type: 'corpse', weight: 20 }, { type: 'ghost', weight: 10 },
      ...ALL_SINGLES.map((type) => ({ type, weight: 5.5 })),
    ],
    heavy: [{ type: 'giant', every: giantEvery(11, 7, 5), first: 20 }],
    elites: [
      { type: 'yaksha', at: 40, path: 2 }, { type: 'puppet', at: 80, path: 1 },
      { type: 'baigujing', at: 120, path: 0 }, { type: 'zhenmushou', at: 160, path: 0 },
    ],
    unlocks: []
  },
  "4-5": {
    id: "4-5", name: "万劫", theme: 4, difficulty: 20,
    startInk: 850, coreHp: 20, holdSeconds: 225, hpMul: 2.14,
    path: [
      polylineCells([[0,1],[7,1],[7,4],[15,4],[15,1],[22,1],[22,3],[25,3]]),
      polylineCells([[0,5],[15,5],[15,1],[22,1],[22,3],[25,3]]),
    ],
    core: {x:25,y:3},
    desc: "万劫不复，天劫封笔。阵势不散，笔墨不绝。",
    roster: [
      { type: 'corpse', weight: 20 }, { type: 'ghost', weight: 10 }, { type: 'bone', weight: 10 },
      { type: 'rider', weight: 10 }, { type: 'shaman', weight: 10 }, { type: 'nightmare', weight: 10 },
      { type: 'miasma', weight: 10 }, { type: 'glutton', weight: 10 }, { type: 'kai', weight: 10 },
    ],
    heavy: [{ type: 'giant', every: giantEvery(11, 7, 5), first: 20 }],
    elites: [{ type: 'zhenmushou', at: 60, path: 1 }],
    boss: { type: 'wanjiebufu', at: 120, path: 0 },
    surges: [{ at: 90, dur: 10, rateMul: 1.5 }, { at: 200, dur: 10, rateMul: 1.5 }],
    unlocks: []
  },
});
