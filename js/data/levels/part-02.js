// 普通模式关卡数据注册
Object.assign(LEVELS_DATA, {
  "3-5": {
    id: "3-5",
    name: "炼狱",
    theme: 3,
    difficulty: 25,
    startInk: 700,
    coreHp: 35,
    path: [
      {x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:5,y:0},{x:6,y:0},{x:7,y:0},{x:8,y:0},{x:9,y:0},
      {x:9,y:1},{x:9,y:2},{x:9,y:3},{x:9,y:4},{x:9,y:5},{x:9,y:6},{x:9,y:7},{x:9,y:8},
      {x:10,y:8},{x:11,y:8},{x:12,y:8},{x:13,y:8},{x:14,y:8},{x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"superGiant",count:4,delay:2200},{type:"ironArmor",count:8,delay:1200}]},
      {enemies:[{type:"giant",count:10,delay:900},{type:"superGiant",count:4,delay:2000}]},
      {enemies:[{type:"ironArmor",count:10,delay:1000},{type:"superGiant",count:4,delay:1800},{type:"overlord",count:2,delay:4000}]}
    ],
    unlocks: []
  },
  "3-6": {
    id: "3-6",
    name: "爆炎",
    theme: 3,
    difficulty: 26,
    startInk: 750,
    coreHp: 38,
    path: [
      {x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},{x:6,y:4},{x:7,y:4},{x:8,y:4},{x:9,y:4},
      {x:9,y:3},{x:9,y:2},{x:9,y:1},{x:9,y:0},
      {x:10,y:0},{x:11,y:0},{x:12,y:0},{x:13,y:0},{x:14,y:0},{x:15,y:0},{x:16,y:0},{x:17,y:0},{x:18,y:0},{x:19,y:0}
    ],
    core: {x:19,y:0},
    waves: [
      {enemies:[{type:"superGiant",count:5,delay:2000},{type:"ironArmor",count:10,delay:1000}]},
      {enemies:[{type:"giant",count:12,delay:800},{type:"superGiant",count:5,delay:1800}]},
      {enemies:[{type:"ironArmor",count:12,delay:900},{type:"superGiant",count:5,delay:1600},{type:"overlord",count:2,delay:3500}]}
    ],
    unlocks: []
  },
  "3-7": {
    id: "3-7",
    name: "焚心",
    theme: 3,
    difficulty: 27,
    startInk: 800,
    coreHp: 40,
    path: [
      {x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:5,y:2},{x:6,y:2},{x:7,y:2},{x:8,y:2},{x:9,y:2},{x:10,y:2},
      {x:10,y:3},{x:10,y:4},{x:10,y:5},{x:10,y:6},
      {x:11,y:6},{x:12,y:6},{x:13,y:6},{x:14,y:6},{x:15,y:6},{x:16,y:6},{x:17,y:6},{x:18,y:6},{x:19,y:6}
    ],
    core: {x:19,y:6},
    waves: [
      {enemies:[{type:"superGiant",count:6,delay:1800},{type:"ironArmor",count:12,delay:900}]},
      {enemies:[{type:"giant",count:15,delay:700},{type:"superGiant",count:6,delay:1600}]},
      {enemies:[{type:"ironArmor",count:15,delay:800},{type:"superGiant",count:6,delay:1400},{type:"overlord",count:3,delay:3000}]}
    ],
    unlocks: []
  },
  "3-8": {
    id: "3-8",
    name: "熔炉",
    theme: 3,
    difficulty: 28,
    startInk: 850,
    coreHp: 42,
    path: [
      {x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},
      {x:5,y:3},{x:5,y:2},{x:5,y:1},{x:5,y:0},
      {x:6,y:0},{x:7,y:0},{x:8,y:0},{x:9,y:0},{x:10,y:0},{x:11,y:0},{x:12,y:0},{x:13,y:0},{x:14,y:0},
      {x:14,y:1},{x:14,y:2},{x:14,y:3},{x:14,y:4},{x:14,y:5},{x:14,y:6},{x:14,y:7},{x:14,y:8},
      {x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"superGiant",count:7,delay:1600},{type:"ironArmor",count:15,delay:800}]},
      {enemies:[{type:"giant",count:18,delay:600},{type:"superGiant",count:7,delay:1400}]},
      {enemies:[{type:"ironArmor",count:18,delay:700},{type:"superGiant",count:7,delay:1200},{type:"overlord",count:3,delay:2800}]}
    ],
    unlocks: []
  },
  "3-9": {
    id: "3-9",
    name: "业火",
    theme: 3,
    difficulty: 29,
    startInk: 900,
    coreHp: 45,
    path: [
      {x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:5,y:1},{x:6,y:1},{x:7,y:1},{x:8,y:1},{x:9,y:1},
      {x:9,y:2},{x:9,y:3},{x:9,y:4},{x:9,y:5},{x:9,y:6},{x:9,y:7},{x:9,y:8},
      {x:10,y:8},{x:11,y:8},{x:12,y:8},{x:13,y:8},{x:14,y:8},{x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"superGiant",count:8,delay:1400},{type:"ironArmor",count:18,delay:700}]},
      {enemies:[{type:"giant",count:20,delay:550},{type:"superGiant",count:8,delay:1200}]},
      {enemies:[{type:"ironArmor",count:20,delay:600},{type:"superGiant",count:8,delay:1100},{type:"overlord",count:4,delay:2500}]}
    ],
    unlocks: []
  },
  "3-10": {
    id: "3-10",
    name: "涅槃",
    theme: 3,
    difficulty: 30,
    startInk: 1000,
    coreHp: 50,
    path: [
      {x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},{x:6,y:4},{x:7,y:4},{x:8,y:4},{x:9,y:4},
      {x:9,y:3},{x:9,y:2},
      {x:10,y:2},{x:11,y:2},{x:12,y:2},{x:13,y:2},{x:14,y:2},
      {x:14,y:3},{x:14,y:4},{x:14,y:5},{x:14,y:6},
      {x:15,y:6},{x:16,y:6},{x:17,y:6},{x:18,y:6},{x:19,y:6}
    ],
    core: {x:19,y:6},
    waves: [
      {enemies:[{type:"superGiant",count:10,delay:1200},{type:"ironArmor",count:20,delay:600}]},
      {enemies:[{type:"giant",count:25,delay:500},{type:"superGiant",count:10,delay:1000}]},
      {enemies:[{type:"ironArmor",count:25,delay:550},{type:"superGiant",count:10,delay:1000},{type:"overlord",count:5,delay:2200}]}
    ],
    unlocks: []
  },

  // ========== 主题4: 玄冰 (控制策略) ==========
  "4-1": {
    id: "4-1",
    name: "霜降",
    theme: 4,
    difficulty: 31,
    startInk: 500,
    coreHp: 25,
    path: [
      {x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5},{x:5,y:5},{x:6,y:5},{x:7,y:5},{x:8,y:5},{x:9,y:5},
      {x:10,y:5},{x:11,y:5},{x:12,y:5},{x:13,y:5},{x:14,y:5},{x:15,y:5},{x:16,y:5},{x:17,y:5},{x:18,y:5},{x:19,y:5}
    ],
    core: {x:19,y:5},
    waves: [
      {enemies:[{type:"ghost",count:8,delay:800},{type:"swiftGhost",count:3,delay:1200}]},
      {enemies:[{type:"swiftGhost",count:5,delay:700},{type:"shadow",count:4,delay:1000}]},
      {enemies:[{type:"ghost",count:12,delay:500},{type:"swiftGhost",count:6,delay:700},{type:"split",count:4,delay:900}]}
    ],
    unlocks: []
  },
  "4-2": {
    id: "4-2",
    name: "冰封",
    theme: 4,
    difficulty: 32,
    startInk: 550,
    coreHp: 28,
    path: [
      {x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:5,y:2},{x:6,y:2},{x:7,y:2},
      {x:7,y:3},{x:7,y:4},{x:7,y:5},{x:7,y:6},{x:7,y:7},{x:7,y:8},
      {x:8,y:8},{x:9,y:8},{x:10,y:8},{x:11,y:8},{x:12,y:8},{x:13,y:8},{x:14,y:8},{x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"swiftGhost",count:6,delay:600},{type:"ghost",count:10,delay:700}]},
      {enemies:[{type:"shadow",count:6,delay:800},{type:"swiftGhost",count:7,delay:600}]},
      {enemies:[{type:"ghost",count:15,delay:450},{type:"swiftGhost",count:8,delay:550},{type:"split",count:5,delay:750}]}
    ],
    unlocks: []
  },
  "4-3": {
    id: "4-3",
    name: "雪崩",
    theme: 4,
    difficulty: 33,
    startInk: 600,
    coreHp: 30,
    path: [
      {x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:5,y:1},{x:6,y:1},{x:7,y:1},{x:8,y:1},{x:9,y:1},
      {x:9,y:2},{x:9,y:3},{x:9,y:4},{x:9,y:5},{x:9,y:6},{x:9,y:7},{x:9,y:8},
      {x:10,y:8},{x:11,y:8},{x:12,y:8},{x:13,y:8},{x:14,y:8},{x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"swiftGhost",count:8,delay:550},{type:"ghost",count:12,delay:600}]},
      {enemies:[{type:"shadow",count:8,delay:700},{type:"swiftGhost",count:9,delay:500}]},
      {enemies:[{type:"ghost",count:18,delay:400},{type:"swiftGhost",count:10,delay:500},{type:"split",count:6,delay:650}]}
    ],
    unlocks: []
  },
  "4-4": {
    id: "4-4",
    name: "凛冬",
    theme: 4,
    difficulty: 34,
    startInk: 650,
    coreHp: 32,
    path: [
      {x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},
      {x:5,y:3},{x:5,y:2},{x:5,y:1},
      {x:6,y:1},{x:7,y:1},{x:8,y:1},{x:9,y:1},{x:10,y:1},{x:11,y:1},{x:12,y:1},{x:13,y:1},{x:14,y:1},
      {x:14,y:2},{x:14,y:3},{x:14,y:4},{x:14,y:5},{x:14,y:6},{x:14,y:7},{x:14,y:8},
      {x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"swiftGhost",count:10,delay:500},{type:"shadow",count:8,delay:650}]},
      {enemies:[{type:"ghost",count:20,delay:350},{type:"swiftGhost",count:10,delay:450}]},
      {enemies:[{type:"shadow",count:10,delay:600},{type:"swiftGhost",count:12,delay:400},{type:"ironArmor",count:4,delay:1000}]}
    ],
    unlocks: []
  },
  "4-5": {
    id: "4-5",
    name: "极寒",
    theme: 4,
    difficulty: 35,
    startInk: 700,
    coreHp: 35,
    path: [
      {x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:5,y:0},{x:6,y:0},{x:7,y:0},{x:8,y:0},{x:9,y:0},
      {x:9,y:1},{x:9,y:2},{x:9,y:3},{x:9,y:4},{x:9,y:5},{x:9,y:6},{x:9,y:7},{x:9,y:8},
      {x:10,y:8},{x:11,y:8},{x:12,y:8},{x:13,y:8},{x:14,y:8},{x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"swiftGhost",count:12,delay:450},{type:"ghost",count:15,delay:500}]},
      {enemies:[{type:"shadow",count:12,delay:550},{type:"swiftGhost",count:12,delay:400}]},
      {enemies:[{type:"ghost",count:25,delay:300},{type:"swiftGhost",count:15,delay:350},{type:"split",count:8,delay:500}]}
    ],
    unlocks: []
  },
  "4-6": {
    id: "4-6",
    name: "冰狱",
    theme: 4,
    difficulty: 36,
    startInk: 750,
    coreHp: 38,
    path: [
      {x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},{x:6,y:4},{x:7,y:4},{x:8,y:4},{x:9,y:4},
      {x:9,y:3},{x:9,y:2},{x:9,y:1},{x:9,y:0},
      {x:10,y:0},{x:11,y:0},{x:12,y:0},{x:13,y:0},{x:14,y:0},{x:15,y:0},{x:16,y:0},{x:17,y:0},{x:18,y:0},{x:19,y:0}
    ],
    core: {x:19,y:0},
    waves: [
      {enemies:[{type:"swiftGhost",count:15,delay:400},{type:"shadow",count:10,delay:550}]},
      {enemies:[{type:"ghost",count:30,delay:280},{type:"swiftGhost",count:15,delay:350}]},
      {enemies:[{type:"shadow",count:15,delay:500},{type:"swiftGhost",count:18,delay:320},{type:"ironArmor",count:6,delay:800}]}
    ],
    unlocks: []
  },
  "4-7": {
    id: "4-7",
    name: "霜冻",
    theme: 4,
    difficulty: 37,
    startInk: 800,
    coreHp: 40,
    path: [
      {x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:5,y:2},{x:6,y:2},{x:7,y:2},{x:8,y:2},{x:9,y:2},{x:10,y:2},
      {x:10,y:3},{x:10,y:4},{x:10,y:5},{x:10,y:6},
      {x:11,y:6},{x:12,y:6},{x:13,y:6},{x:14,y:6},{x:15,y:6},{x:16,y:6},{x:17,y:6},{x:18,y:6},{x:19,y:6}
    ],
    core: {x:19,y:6},
    waves: [
      {enemies:[{type:"swiftGhost",count:18,delay:350},{type:"ghost",count:20,delay:400}]},
      {enemies:[{type:"shadow",count:18,delay:500},{type:"swiftGhost",count:18,delay:300}]},
      {enemies:[{type:"ghost",count:35,delay:250},{type:"swiftGhost",count:20,delay:300},{type:"split",count:10,delay:450}]}
    ],
    unlocks: []
  },
  "4-8": {
    id: "4-8",
    name: "冰河",
    theme: 4,
    difficulty: 38,
    startInk: 850,
    coreHp: 42,
    path: [
      {x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},
      {x:5,y:3},{x:5,y:2},{x:5,y:1},{x:5,y:0},
      {x:6,y:0},{x:7,y:0},{x:8,y:0},{x:9,y:0},{x:10,y:0},{x:11,y:0},{x:12,y:0},{x:13,y:0},{x:14,y:0},
      {x:14,y:1},{x:14,y:2},{x:14,y:3},{x:14,y:4},{x:14,y:5},{x:14,y:6},{x:14,y:7},{x:14,y:8},
      {x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"swiftGhost",count:20,delay:300},{type:"shadow",count:15,delay:450}]},
      {enemies:[{type:"ghost",count:40,delay:220},{type:"swiftGhost",count:20,delay:280}]},
      {enemies:[{type:"shadow",count:20,delay:450},{type:"swiftGhost",count:22,delay:280},{type:"ironArmor",count:8,delay:700}]}
    ],
    unlocks: []
  },
  "4-9": {
    id: "4-9",
    name: "雪暴",
    theme: 4,
    difficulty: 39,
    startInk: 900,
    coreHp: 45,
    path: [
      {x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:5,y:1},{x:6,y:1},{x:7,y:1},{x:8,y:1},{x:9,y:1},
      {x:9,y:2},{x:9,y:3},{x:9,y:4},{x:9,y:5},{x:9,y:6},{x:9,y:7},{x:9,y:8},
      {x:10,y:8},{x:11,y:8},{x:12,y:8},{x:13,y:8},{x:14,y:8},{x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"swiftGhost",count:25,delay:280},{type:"ghost",count:25,delay:350}]},
      {enemies:[{type:"shadow",count:25,delay:400},{type:"swiftGhost",count:25,delay:250}]},
      {enemies:[{type:"ghost",count:45,delay:200},{type:"swiftGhost",count:25,delay:250},{type:"split",count:12,delay:400}]}
    ],
    unlocks: []
  },
  "4-10": {
    id: "4-10",
    name: "永冻",
    theme: 4,
    difficulty: 40,
    startInk: 1000,
    coreHp: 50,
    path: [
      {x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},{x:6,y:4},{x:7,y:4},{x:8,y:4},{x:9,y:4},
      {x:9,y:3},{x:9,y:2},
      {x:10,y:2},{x:11,y:2},{x:12,y:2},{x:13,y:2},{x:14,y:2},
      {x:14,y:3},{x:14,y:4},{x:14,y:5},{x:14,y:6},
      {x:15,y:6},{x:16,y:6},{x:17,y:6},{x:18,y:6},{x:19,y:6}
    ],
    core: {x:19,y:6},
    waves: [
      {enemies:[{type:"swiftGhost",count:30,delay:250},{type:"ghost",count:30,delay:300}]},
      {enemies:[{type:"shadow",count:30,delay:350},{type:"swiftGhost",count:30,delay:220}]},
      {enemies:[{type:"ghost",count:50,delay:180},{type:"swiftGhost",count:30,delay:220},{type:"split",count:15,delay:350}]}
    ],
    unlocks: []
  },

  // ========== 主题5: 终焉 (终极挑战) ==========
  "5-1": {
    id: "5-1",
    name: "末日",
    theme: 5,
    difficulty: 41,
    startInk: 600,
    coreHp: 30,
    path: [
      {x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5},{x:5,y:5},{x:6,y:5},{x:7,y:5},{x:8,y:5},{x:9,y:5},
      {x:10,y:5},{x:11,y:5},{x:12,y:5},{x:13,y:5},{x:14,y:5},{x:15,y:5},{x:16,y:5},{x:17,y:5},{x:18,y:5},{x:19,y:5}
    ],
    core: {x:19,y:5},
    waves: [
      {enemies:[{type:"superGiant",count:2,delay:2500},{type:"ironArmor",count:5,delay:1200}]},
      {enemies:[{type:"overlord",count:1,delay:4000},{type:"superGiant",count:2,delay:2000}]},
      {enemies:[{type:"ironArmor",count:8,delay:1000},{type:"superGiant",count:3,delay:1800},{type:"overlord",count:1,delay:3500}]}
    ],
    unlocks: []
  },
  "5-2": {
    id: "5-2",
    name: "毁灭",
    theme: 5,
    difficulty: 42,
    startInk: 650,
    coreHp: 32,
    path: [
      {x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:5,y:2},{x:6,y:2},{x:7,y:2},
      {x:7,y:3},{x:7,y:4},{x:7,y:5},{x:7,y:6},{x:7,y:7},{x:7,y:8},
      {x:8,y:8},{x:9,y:8},{x:10,y:8},{x:11,y:8},{x:12,y:8},{x:13,y:8},{x:14,y:8},{x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"superGiant",count:3,delay:2200},{type:"ironArmor",count:6,delay:1100}]},
      {enemies:[{type:"overlord",count:2,delay:3500},{type:"superGiant",count:3,delay:1800}]},
      {enemies:[{type:"ironArmor",count:10,delay:900},{type:"superGiant",count:4,delay:1600},{type:"overlord",count:2,delay:3000}]}
    ],
    unlocks: []
  },
  "5-3": {
    id: "5-3",
    name: "混沌",
    theme: 5,
    difficulty: 43,
    startInk: 700,
    coreHp: 35,
    path: [
      {x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:5,y:1},{x:6,y:1},{x:7,y:1},{x:8,y:1},{x:9,y:1},
      {x:9,y:2},{x:9,y:3},{x:9,y:4},{x:9,y:5},{x:9,y:6},{x:9,y:7},{x:9,y:8},
      {x:10,y:8},{x:11,y:8},{x:12,y:8},{x:13,y:8},{x:14,y:8},{x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"superGiant",count:4,delay:2000},{type:"ironArmor",count:8,delay:1000}]},
      {enemies:[{type:"overlord",count:2,delay:3000},{type:"superGiant",count:4,delay:1600}]},
      {enemies:[{type:"ironArmor",count:12,delay:800},{type:"superGiant",count:5,delay:1400},{type:"overlord",count:2,delay:2800}]}
    ],
    unlocks: []
  },
  "5-4": {
    id: "5-4",
    name: "灾变",
    theme: 5,
    difficulty: 44,
    startInk: 750,
    coreHp: 38,
    path: [
      {x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},
      {x:5,y:3},{x:5,y:2},{x:5,y:1},
      {x:6,y:1},{x:7,y:1},{x:8,y:1},{x:9,y:1},{x:10,y:1},{x:11,y:1},{x:12,y:1},{x:13,y:1},{x:14,y:1},
      {x:14,y:2},{x:14,y:3},{x:14,y:4},{x:14,y:5},{x:14,y:6},{x:14,y:7},{x:14,y:8},
      {x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"superGiant",count:5,delay:1800},{type:"ironArmor",count:10,delay:900}]},
      {enemies:[{type:"overlord",count:3,delay:2800},{type:"superGiant",count:5,delay:1400}]},
      {enemies:[{type:"ironArmor",count:15,delay:700},{type:"superGiant",count:6,delay:1200},{type:"overlord",count:3,delay:2500}]}
    ],
    unlocks: []
  },
  "5-5": {
    id: "5-5",
    name: "浩劫",
    theme: 5,
    difficulty: 45,
    startInk: 800,
    coreHp: 40,
    path: [
      {x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:5,y:0},{x:6,y:0},{x:7,y:0},{x:8,y:0},{x:9,y:0},
      {x:9,y:1},{x:9,y:2},{x:9,y:3},{x:9,y:4},{x:9,y:5},{x:9,y:6},{x:9,y:7},{x:9,y:8},
      {x:10,y:8},{x:11,y:8},{x:12,y:8},{x:13,y:8},{x:14,y:8},{x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"superGiant",count:6,delay:1600},{type:"ironArmor",count:12,delay:800}]},
      {enemies:[{type:"overlord",count:3,delay:2500},{type:"superGiant",count:6,delay:1200}]},
      {enemies:[{type:"ironArmor",count:18,delay:600},{type:"superGiant",count:7,delay:1100},{type:"overlord",count:3,delay:2200}]}
    ],
    unlocks: []
  },
  "5-6": {
    id: "5-6",
    name: "天罚",
    theme: 5,
    difficulty: 46,
    startInk: 850,
    coreHp: 42,
    path: [
      {x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},{x:6,y:4},{x:7,y:4},{x:8,y:4},{x:9,y:4},
      {x:9,y:3},{x:9,y:2},{x:9,y:1},{x:9,y:0},
      {x:10,y:0},{x:11,y:0},{x:12,y:0},{x:13,y:0},{x:14,y:0},{x:15,y:0},{x:16,y:0},{x:17,y:0},{x:18,y:0},{x:19,y:0}
    ],
    core: {x:19,y:0},
    waves: [
      {enemies:[{type:"superGiant",count:7,delay:1400},{type:"ironArmor",count:15,delay:700}]},
      {enemies:[{type:"overlord",count:4,delay:2200},{type:"superGiant",count:7,delay:1100}]},
      {enemies:[{type:"ironArmor",count:20,delay:550},{type:"superGiant",count:8,delay:1000},{type:"overlord",count:4,delay:2000}]}
    ],
    unlocks: []
  },
  "5-7": {
    id: "5-7",
    name: "审判",
    theme: 5,
    difficulty: 47,
    startInk: 900,
    coreHp: 45,
    path: [
      {x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:5,y:2},{x:6,y:2},{x:7,y:2},{x:8,y:2},{x:9,y:2},{x:10,y:2},
      {x:10,y:3},{x:10,y:4},{x:10,y:5},{x:10,y:6},
      {x:11,y:6},{x:12,y:6},{x:13,y:6},{x:14,y:6},{x:15,y:6},{x:16,y:6},{x:17,y:6},{x:18,y:6},{x:19,y:6}
    ],
    core: {x:19,y:6},
    waves: [
      {enemies:[{type:"superGiant",count:8,delay:1200},{type:"ironArmor",count:18,delay:600}]},
      {enemies:[{type:"overlord",count:4,delay:2000},{type:"superGiant",count:8,delay:1000}]},
      {enemies:[{type:"ironArmor",count:22,delay:500},{type:"superGiant",count:9,delay:900},{type:"overlord",count:4,delay:1800}]}
    ],
    unlocks: []
  },
  "5-8": {
    id: "5-8",
    name: "湮灭",
    theme: 5,
    difficulty: 48,
    startInk: 950,
    coreHp: 48,
    path: [
      {x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},
      {x:5,y:3},{x:5,y:2},{x:5,y:1},{x:5,y:0},
      {x:6,y:0},{x:7,y:0},{x:8,y:0},{x:9,y:0},{x:10,y:0},{x:11,y:0},{x:12,y:0},{x:13,y:0},{x:14,y:0},
      {x:14,y:1},{x:14,y:2},{x:14,y:3},{x:14,y:4},{x:14,y:5},{x:14,y:6},{x:14,y:7},{x:14,y:8},
      {x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"superGiant",count:9,delay:1100},{type:"ironArmor",count:20,delay:550}]},
      {enemies:[{type:"overlord",count:5,delay:1800},{type:"superGiant",count:9,delay:900}]},
      {enemies:[{type:"ironArmor",count:25,delay:450},{type:"superGiant",count:10,delay:850},{type:"overlord",count:5,delay:1600}]}
    ],
    unlocks: []
  },
  "5-9": {
    id: "5-9",
    name: "归零",
    theme: 5,
    difficulty: 49,
    startInk: 1000,
    coreHp: 50,
    path: [
      {x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:5,y:1},{x:6,y:1},{x:7,y:1},{x:8,y:1},{x:9,y:1},
      {x:9,y:2},{x:9,y:3},{x:9,y:4},{x:9,y:5},{x:9,y:6},{x:9,y:7},{x:9,y:8},
      {x:10,y:8},{x:11,y:8},{x:12,y:8},{x:13,y:8},{x:14,y:8},{x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"superGiant",count:10,delay:1000},{type:"ironArmor",count:22,delay:500}]},
      {enemies:[{type:"overlord",count:5,delay:1600},{type:"superGiant",count:10,delay:850}]},
      {enemies:[{type:"ironArmor",count:28,delay:400},{type:"superGiant",count:11,delay:800},{type:"overlord",count:5,delay:1400}]}
    ],
    unlocks: []
  },
});
