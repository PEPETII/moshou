// 普通模式关卡数据注册：大关卡二「墨泽 · 水乡」（2-1 ～ 2-5，工单 04）
// 引入双路径与隐身、跳跃类敌人；关底首领翻江倒海克制水、雷组合。
// 双路径关卡里路径 A（下标 0）、B（下标 1）从汇合点起共用后半段，格子重叠是有意设计。
Object.assign(LEVELS_DATA, {
  "2-1": {
    id: "2-1", name: "渡口", theme: 2, difficulty: 6,
    startInk: 450, coreHp: 20, holdSeconds: 150, hpMul: 1.25,
    path: polylineCells([[0,4],[8,4],[8,1],[17,1],[17,3],[25,3]]),
    core: {x:25,y:3},
    desc: "渡口水深，鲛人时沉时浮。看不见的，就把整片水域烧透。",
    roster: [
      { type: 'corpse', weight: 40 }, { type: 'ghost', weight: 20 }, { type: 'bone', weight: 10 },
      { type: 'jiao', weight: 30, from: 10 },
    ],
    heavy: [{ type: 'giant', every: giantEvery(13, 9, 6), first: 20 }],
    unlocks: []
  },
  "2-2": {
    id: "2-2", name: "芦荡", theme: 2, difficulty: 7,
    startInk: 500, coreHp: 20, holdSeconds: 160, hpMul: 1.31,
    path: polylineCells([[0,0],[3,0],[3,5],[9,5],[9,0],[15,0],[15,5],[21,5],[21,2],[25,2]]),
    core: {x:25,y:2},
    desc: "芦荡蛙鸣，一跃三尺。地上的埋伏，它们跳得过去。",
    roster: [
      { type: 'corpse', weight: 35 }, { type: 'ghost', weight: 20 }, { type: 'fox', weight: 10 },
      { type: 'jiao', weight: 15 }, { type: 'frog', weight: 20, from: 15 },
    ],
    heavy: [{ type: 'giant', every: giantEvery(13, 9, 6), first: 20 }],
    elites: [{ type: 'yaksha', at: 90 }],
    unlocks: []
  },
  "2-3": {
    id: "2-3", name: "双桥", theme: 2, difficulty: 8,
    startInk: 550, coreHp: 20, holdSeconds: 170, hpMul: 1.37,
    path: [
      polylineCells([[0,1],[10,1],[10,3],[25,3]]),
      polylineCells([[0,5],[14,5],[14,3],[25,3]]),
    ],
    core: {x:25,y:3},
    desc: "双桥并渡，两头都要守。龟壳坚硬，火能透甲。",
    roster: [
      { type: 'corpse', weight: 35 }, { type: 'ghost', weight: 15 }, { type: 'jiao', weight: 15 },
      { type: 'frog', weight: 15 }, { type: 'turtle', weight: 10, from: 20 }, { type: 'spider', weight: 10 },
    ],
    heavy: [{ type: 'giant', every: giantEvery(14, 10, 7), first: 20 }],
    elites: [{ type: 'yaksha', at: 60, path: 0 }, { type: 'yaksha', at: 120, path: 1 }],
    unlocks: []
  },
  "2-4": {
    id: "2-4", name: "回水湾", theme: 2, difficulty: 9,
    startInk: 600, coreHp: 20, holdSeconds: 180, hpMul: 1.43,
    path: polylineCells([[0,5],[7,5],[7,3],[2,3],[2,0],[16,0],[16,4],[25,4]]),
    core: {x:25,y:4},
    desc: "回水湾里藏着白骨精，看似寻常走尸，切莫轻敌。",
    roster: [
      { type: 'corpse', weight: 30 }, { type: 'ghost', weight: 15 }, { type: 'bone', weight: 15 },
      { type: 'jiao', weight: 15 }, { type: 'frog', weight: 10 }, { type: 'turtle', weight: 10 }, { type: 'fox', weight: 5 },
    ],
    heavy: [{ type: 'giant', every: giantEvery(13, 9, 6), first: 20 }],
    elites: [{ type: 'baigujing', at: 80 }, { type: 'yaksha', at: 140 }],
    unlocks: []
  },
  "2-5": {
    id: "2-5", name: "翻江", theme: 2, difficulty: 10,
    startInk: 650, coreHp: 20, holdSeconds: 195, hpMul: 1.49,
    path: [
      polylineCells([[0,0],[12,0],[12,2],[25,2]]),
      polylineCells([[0,5],[12,5],[12,3],[18,3],[18,2],[25,2]]),
    ],
    core: {x:25,y:2},
    desc: "江海倒悬，水火不容。破其「江」，方能以水制水。",
    roster: [
      { type: 'corpse', weight: 30 }, { type: 'ghost', weight: 15 }, { type: 'jiao', weight: 20 },
      { type: 'frog', weight: 15 }, { type: 'turtle', weight: 10 }, { type: 'bone', weight: 10 },
    ],
    heavy: [{ type: 'giant', every: giantEvery(13, 9, 6), first: 20 }],
    elites: [{ type: 'baigujing', at: 50, path: 1 }],
    boss: { type: 'fanjiangdaohai', at: 110, path: 0 },
    unlocks: []
  },
});
