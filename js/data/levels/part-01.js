// 普通模式关卡数据注册
Object.assign(LEVELS_DATA, {
  // ========== 主题1: 初墨 (基础教学) ==========
  "1-1": {
    id: "1-1",
    name: "初阵",
    theme: 1,
    difficulty: 1,
    startInk: 300,
    coreHp: 20,
    path: [
      {x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5},
      {x:5,y:5},{x:6,y:5},{x:7,y:5},{x:8,y:5},{x:9,y:5},
      {x:10,y:5},{x:11,y:5},{x:12,y:5},{x:13,y:5},{x:14,y:5},
      {x:15,y:5},{x:16,y:5},{x:17,y:5},{x:18,y:5},{x:19,y:5}
    ],
    core: {x:19,y:5},
    waves: [
      {enemies:[{type:"corpse",count:3,delay:2000},{type:"ghost",count:1,delay:2500},{type:"armor",count:1,delay:3000}]},
      {enemies:[{type:"corpse",count:3,delay:1500},{type:"split",count:2,delay:2000},{type:"giant",count:1,delay:2500}]},
      {enemies:[{type:"corpse",count:3,delay:1000},{type:"ghost",count:2,delay:1500},{type:"giant",count:1,delay:2000},{type:"superGiant",count:1,delay:3000},{type:"overlord",count:1,delay:4000}]}
    ],
    unlocks: []
  },
  "1-2": {
    id: "1-2",
    name: "弯道",
    theme: 1,
    difficulty: 2,
    startInk: 400,
    coreHp: 20,
    path: [
      {x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},
      {x:5,y:2},{x:6,y:2},{x:7,y:2},
      {x:7,y:3},{x:7,y:4},{x:7,y:5},{x:7,y:6},{x:7,y:7},{x:7,y:8},
      {x:8,y:8},{x:9,y:8},{x:10,y:8},{x:11,y:8},{x:12,y:8},
      {x:13,y:8},{x:14,y:8},{x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"corpse",count:4,delay:1500}]},
      {enemies:[{type:"corpse",count:3,delay:1000},{type:"ghost",count:2,delay:2000}]},
      {enemies:[{type:"corpse",count:4,delay:1000},{type:"giant",count:1,delay:2500}]},
      {enemies:[{type:"ghost",count:3,delay:1500},{type:"corpse",count:3,delay:1000},{type:"giant",count:1,delay:3000}]}
    ],
    unlocks: ["wood"]
  },
  "1-3": {
    id: "1-3",
    name: "蛇行",
    theme: 1,
    difficulty: 3,
    startInk: 500,
    coreHp: 25,
    path: [
      {x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},
      {x:5,y:2},{x:6,y:2},{x:7,y:2},{x:8,y:2},{x:9,y:2},{x:10,y:2},{x:11,y:2},
      {x:11,y:3},{x:11,y:4},{x:11,y:5},
      {x:10,y:5},{x:9,y:5},{x:8,y:5},{x:7,y:5},{x:6,y:5},{x:5,y:5},{x:4,y:5},{x:3,y:5},
      {x:3,y:6},{x:3,y:7},{x:3,y:8},
      {x:4,y:8},{x:5,y:8},{x:6,y:8},{x:7,y:8},{x:8,y:8},{x:9,y:8},{x:10,y:8},
      {x:11,y:8},{x:12,y:8},{x:13,y:8},{x:14,y:8},{x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"corpse",count:5,delay:1000}]},
      {enemies:[{type:"corpse",count:3,delay:1000},{type:"ghost",count:2,delay:1500}]},
      {enemies:[{type:"armor",count:2,delay:2000},{type:"corpse",count:4,delay:800},{type:"giant",count:1,delay:2500}]},
      {enemies:[{type:"ghost",count:3,delay:1000},{type:"armor",count:2,delay:2000},{type:"giant",count:1,delay:3000}]}
    ],
    unlocks: ["gold"]
  },
  "1-4": {
    id: "1-4",
    name: "岔路",
    theme: 1,
    difficulty: 4,
    startInk: 500,
    coreHp: 25,
    path: [
      {x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:5,y:1},{x:6,y:1},{x:7,y:1},{x:8,y:1},{x:9,y:1},
      {x:9,y:2},{x:9,y:3},{x:9,y:4},{x:9,y:5},{x:9,y:6},{x:9,y:7},
      {x:10,y:7},{x:11,y:7},{x:12,y:7},{x:13,y:7},{x:14,y:7},{x:15,y:7},{x:16,y:7},{x:17,y:7},{x:18,y:7},{x:19,y:7}
    ],
    core: {x:19,y:7},
    waves: [
      {enemies:[{type:"corpse",count:5,delay:1000},{type:"ghost",count:3,delay:1500}]},
      {enemies:[{type:"armor",count:3,delay:2000},{type:"split",count:2,delay:1500},{type:"ghost",count:2,delay:1000}]},
      {enemies:[{type:"shadow",count:2,delay:2000},{type:"armor",count:3,delay:1500},{type:"giant",count:1,delay:3000}]},
      {enemies:[{type:"ghost",count:4,delay:800},{type:"ironArmor",count:2,delay:2500},{type:"giant",count:2,delay:3000}]}
    ],
    unlocks: ["thunder", "drum", "moat"]
  },
  "1-5": {
    id: "1-5",
    name: "回环",
    theme: 1,
    difficulty: 5,
    startInk: 600,
    coreHp: 25,
    path: [
      {x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},{x:6,y:4},
      {x:6,y:3},{x:6,y:2},{x:6,y:1},
      {x:7,y:1},{x:8,y:1},{x:9,y:1},{x:10,y:1},{x:11,y:1},{x:12,y:1},{x:13,y:1},
      {x:13,y:2},{x:13,y:3},{x:13,y:4},{x:13,y:5},{x:13,y:6},{x:13,y:7},{x:13,y:8},
      {x:14,y:8},{x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"corpse",count:6,delay:800},{type:"ghost",count:3,delay:1200}]},
      {enemies:[{type:"armor",count:3,delay:1500},{type:"split",count:3,delay:1200},{type:"shadow",count:2,delay:2000}]},
      {enemies:[{type:"ironArmor",count:2,delay:2000},{type:"ghost",count:4,delay:800},{type:"giant",count:2,delay:2500}]},
      {enemies:[{type:"shadow",count:3,delay:1500},{type:"ironArmor",count:3,delay:2000},{type:"superGiant",count:1,delay:4000}]},
      {enemies:[{type:"swiftGhost",count:3,delay:1000},{type:"ironArmor",count:2,delay:2000},{type:"giant",count:2,delay:2500},{type:"overlord",count:1,delay:5000}]}
    ],
    unlocks: ["poison", "wind", "banner", "wall", "healer", "zither"]
  },
  "1-6": {
    id: "1-6",
    name: "峡谷",
    theme: 1,
    difficulty: 6,
    startInk: 600,
    coreHp: 30,
    path: [
      {x:0,y:8},{x:1,y:8},{x:2,y:8},{x:3,y:8},
      {x:3,y:7},{x:3,y:6},{x:3,y:5},{x:3,y:4},{x:3,y:3},{x:3,y:2},{x:3,y:1},
      {x:4,y:1},{x:5,y:1},{x:6,y:1},{x:7,y:1},{x:8,y:1},{x:9,y:1},{x:10,y:1},{x:11,y:1},
      {x:11,y:2},{x:11,y:3},{x:11,y:4},{x:11,y:5},{x:11,y:6},{x:11,y:7},{x:11,y:8},
      {x:12,y:8},{x:13,y:8},{x:14,y:8},{x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"corpse",count:8,delay:600},{type:"ghost",count:4,delay:1000}]},
      {enemies:[{type:"shadow",count:4,delay:1200},{type:"armor",count:4,delay:1500}]},
      {enemies:[{type:"ironArmor",count:3,delay:1800},{type:"split",count:4,delay:1000},{type:"giant",count:2,delay:2500}]},
      {enemies:[{type:"swiftGhost",count:4,delay:800},{type:"shadow",count:3,delay:1500},{type:"superGiant",count:1,delay:3000}]},
      {enemies:[{type:"ironArmor",count:4,delay:1200},{type:"swiftGhost",count:3,delay:1000},{type:"giant",count:2,delay:2000},{type:"overlord",count:1,delay:5000}]}
    ],
    unlocks: ["light", "bell", "talisman", "lantern", "detonator"]
  },
  "1-7": {
    id: "1-7",
    name: "迷阵",
    theme: 1,
    difficulty: 7,
    startInk: 700,
    coreHp: 30,
    path: [
      {x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},
      {x:4,y:3},{x:4,y:2},{x:4,y:1},
      {x:5,y:1},{x:6,y:1},{x:7,y:1},{x:8,y:1},
      {x:8,y:2},{x:8,y:3},{x:8,y:4},{x:8,y:5},{x:8,y:6},{x:8,y:7},{x:8,y:8},
      {x:9,y:8},{x:10,y:8},{x:11,y:8},
      {x:11,y:7},{x:11,y:6},{x:11,y:5},
      {x:12,y:5},{x:13,y:5},{x:14,y:5},{x:15,y:5},
      {x:15,y:6},{x:15,y:7},{x:15,y:8},
      {x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"corpse",count:8,delay:500},{type:"ghost",count:5,delay:800}]},
      {enemies:[{type:"shadow",count:5,delay:1000},{type:"ironArmor",count:3,delay:1800},{type:"split",count:4,delay:800}]},
      {enemies:[{type:"swiftGhost",count:5,delay:600},{type:"giant",count:2,delay:2500},{type:"superGiant",count:1,delay:4000}]},
      {enemies:[{type:"ironArmor",count:4,delay:1200},{type:"shadow",count:4,delay:1000},{type:"giant",count:2,delay:2000},{type:"overlord",count:1,delay:5000}]}
    ],
    unlocks: ["dark", "frost", "mirror", "trap", "soul", "wheel"]
  },
  "1-8": {
    id: "1-8",
    name: "天堑",
    theme: 1,
    difficulty: 8,
    startInk: 800,
    coreHp: 35,
    path: [
      {x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:5,y:0},{x:6,y:0},{x:7,y:0},{x:8,y:0},{x:9,y:0},
      {x:9,y:1},{x:9,y:2},{x:9,y:3},{x:9,y:4},
      {x:10,y:4},{x:11,y:4},{x:12,y:4},
      {x:12,y:5},{x:12,y:6},{x:12,y:7},{x:12,y:8},
      {x:13,y:8},{x:14,y:8},{x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"corpse",count:10,delay:400},{type:"ghost",count:6,delay:600}]},
      {enemies:[{type:"ironArmor",count:4,delay:1500},{type:"shadow",count:5,delay:1000},{type:"split",count:5,delay:600}]},
      {enemies:[{type:"swiftGhost",count:6,delay:500},{type:"giant",count:3,delay:2000},{type:"superGiant",count:1,delay:3500}]},
      {enemies:[{type:"ironArmor",count:5,delay:1000},{type:"swiftGhost",count:4,delay:800},{type:"shadow",count:4,delay:1200},{type:"overlord",count:1,delay:5000}]},
      {enemies:[{type:"superGiant",count:2,delay:3000},{type:"ironArmor",count:5,delay:1000},{type:"swiftGhost",count:5,delay:600},{type:"overlord",count:1,delay:6000}]}
    ],
    unlocks: ["star", "formation", "bunker", "shadow", "parasite"]
  },
  "1-9": {
    id: "1-9",
    name: "终焉",
    theme: 1,
    difficulty: 9,
    startInk: 1000,
    coreHp: 40,
    path: [
      {x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},
      {x:3,y:3},{x:3,y:2},{x:3,y:1},{x:3,y:0},
      {x:4,y:0},{x:5,y:0},{x:6,y:0},{x:7,y:0},{x:8,y:0},{x:9,y:0},{x:10,y:0},
      {x:10,y:1},{x:10,y:2},{x:10,y:3},{x:10,y:4},{x:10,y:5},{x:10,y:6},{x:10,y:7},{x:10,y:8},
      {x:11,y:8},{x:12,y:8},{x:13,y:8},
      {x:13,y:7},{x:13,y:6},{x:13,y:5},
      {x:14,y:5},{x:15,y:5},{x:16,y:5},{x:17,y:5},
      {x:17,y:6},{x:17,y:7},{x:17,y:8},
      {x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"corpse",count:12,delay:300},{type:"ghost",count:8,delay:500}]},
      {enemies:[{type:"ironArmor",count:5,delay:1200},{type:"shadow",count:6,delay:800},{type:"split",count:6,delay:500}]},
      {enemies:[{type:"swiftGhost",count:8,delay:400},{type:"giant",count:3,delay:2000},{type:"superGiant",count:2,delay:3000}]},
      {enemies:[{type:"ironArmor",count:6,delay:800},{type:"shadow",count:5,delay:1000},{type:"giant",count:3,delay:1500},{type:"overlord",count:1,delay:5000}]},
      {enemies:[{type:"superGiant",count:3,delay:2500},{type:"ironArmor",count:6,delay:800},{type:"swiftGhost",count:6,delay:400},{type:"overlord",count:2,delay:5000}]}
    ],
    unlocks: ["time"]
  },
  "1-10": {
    id: "1-10",
    name: "归元",
    theme: 1,
    difficulty: 10,
    startInk: 1200,
    coreHp: 50,
    path: [
      {x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},
      {x:5,y:3},{x:5,y:2},{x:5,y:1},
      {x:6,y:1},{x:7,y:1},{x:8,y:1},{x:9,y:1},{x:10,y:1},
      {x:10,y:2},{x:10,y:3},{x:10,y:4},{x:10,y:5},{x:10,y:6},{x:10,y:7},{x:10,y:8},
      {x:11,y:8},{x:12,y:8},{x:13,y:8},{x:14,y:8},
      {x:14,y:7},{x:14,y:6},{x:14,y:5},{x:14,y:4},{x:14,y:3},{x:14,y:2},{x:14,y:1},
      {x:15,y:1},{x:16,y:1},{x:17,y:1},{x:18,y:1},{x:19,y:1}
    ],
    core: {x:19,y:1},
    waves: [
      {enemies:[{type:"corpse",count:15,delay:250},{type:"ghost",count:10,delay:400}]},
      {enemies:[{type:"armor",count:8,delay:1000},{type:"split",count:6,delay:600},{type:"shadow",count:5,delay:800}]},
      {enemies:[{type:"ironArmor",count:6,delay:1200},{type:"swiftGhost",count:6,delay:500},{type:"giant",count:4,delay:2000}]},
      {enemies:[{type:"shadow",count:8,delay:600},{type:"ironArmor",count:6,delay:1000},{type:"superGiant",count:2,delay:3500}]},
      {enemies:[{type:"swiftGhost",count:10,delay:400},{type:"ironArmor",count:8,delay:800},{type:"giant",count:5,delay:1800},{type:"overlord",count:2,delay:6000}]}
    ],
    unlocks: ["xinZhongYan", "ruFengSiZhen"]
  },

  // ========== 主题2: 风林 (速度挑战) ==========
  "2-1": {
    id: "2-1",
    name: "疾风",
    theme: 2,
    difficulty: 11,
    startInk: 400,
    coreHp: 20,
    path: [
      {x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},{x:6,y:4},{x:7,y:4},{x:8,y:4},{x:9,y:4},
      {x:10,y:4},{x:11,y:4},{x:12,y:4},{x:13,y:4},{x:14,y:4},{x:15,y:4},{x:16,y:4},{x:17,y:4},{x:18,y:4},{x:19,y:4}
    ],
    core: {x:19,y:4},
    waves: [
      {enemies:[{type:"ghost",count:5,delay:1200},{type:"swiftGhost",count:2,delay:2000}]},
      {enemies:[{type:"ghost",count:6,delay:1000},{type:"swiftGhost",count:3,delay:1500}]},
      {enemies:[{type:"swiftGhost",count:5,delay:800},{type:"ghost",count:4,delay:1000},{type:"shadow",count:2,delay:2000}]}
    ],
    unlocks: []
  },
  "2-2": {
    id: "2-2",
    name: "骤雨",
    theme: 2,
    difficulty: 12,
    startInk: 450,
    coreHp: 22,
    path: [
      {x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:5,y:2},{x:6,y:2},{x:7,y:2},
      {x:7,y:3},{x:7,y:4},{x:7,y:5},{x:7,y:6},
      {x:8,y:6},{x:9,y:6},{x:10,y:6},{x:11,y:6},{x:12,y:6},{x:13,y:6},{x:14,y:6},{x:15,y:6},{x:16,y:6},{x:17,y:6},{x:18,y:6},{x:19,y:6}
    ],
    core: {x:19,y:6},
    waves: [
      {enemies:[{type:"swiftGhost",count:4,delay:1000},{type:"ghost",count:5,delay:1200}]},
      {enemies:[{type:"swiftGhost",count:6,delay:800},{type:"shadow",count:3,delay:1500}]},
      {enemies:[{type:"ghost",count:8,delay:600},{type:"swiftGhost",count:4,delay:800},{type:"split",count:3,delay:1200}]}
    ],
    unlocks: []
  },
  "2-3": {
    id: "2-3",
    name: "穿林",
    theme: 2,
    difficulty: 13,
    startInk: 500,
    coreHp: 25,
    path: [
      {x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:5,y:1},{x:6,y:1},{x:7,y:1},
      {x:7,y:2},{x:7,y:3},{x:7,y:4},{x:7,y:5},{x:7,y:6},{x:7,y:7},{x:7,y:8},
      {x:8,y:8},{x:9,y:8},{x:10,y:8},{x:11,y:8},{x:12,y:8},{x:13,y:8},{x:14,y:8},{x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"swiftGhost",count:5,delay:900},{type:"ghost",count:6,delay:1000}]},
      {enemies:[{type:"swiftGhost",count:7,delay:700},{type:"shadow",count:4,delay:1200}]},
      {enemies:[{type:"ghost",count:10,delay:500},{type:"swiftGhost",count:5,delay:700},{type:"split",count:4,delay:1000}]}
    ],
    unlocks: []
  },
  "2-4": {
    id: "2-4",
    name: "追影",
    theme: 2,
    difficulty: 14,
    startInk: 550,
    coreHp: 25,
    path: [
      {x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},
      {x:5,y:3},{x:5,y:2},
      {x:6,y:2},{x:7,y:2},{x:8,y:2},{x:9,y:2},{x:10,y:2},{x:11,y:2},
      {x:11,y:3},{x:11,y:4},{x:11,y:5},{x:11,y:6},{x:11,y:7},{x:11,y:8},
      {x:12,y:8},{x:13,y:8},{x:14,y:8},{x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"shadow",count:5,delay:1000},{type:"swiftGhost",count:4,delay:800}]},
      {enemies:[{type:"swiftGhost",count:6,delay:700},{type:"shadow",count:5,delay:900},{type:"ghost",count:6,delay:800}]},
      {enemies:[{type:"shadow",count:7,delay:800},{type:"swiftGhost",count:6,delay:600},{type:"ironArmor",count:2,delay:2000}]}
    ],
    unlocks: []
  },
  "2-5": {
    id: "2-5",
    name: "迅击",
    theme: 2,
    difficulty: 15,
    startInk: 600,
    coreHp: 28,
    path: [
      {x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:5,y:0},{x:6,y:0},{x:7,y:0},{x:8,y:0},{x:9,y:0},
      {x:9,y:1},{x:9,y:2},{x:9,y:3},{x:9,y:4},{x:9,y:5},{x:9,y:6},{x:9,y:7},{x:9,y:8},
      {x:10,y:8},{x:11,y:8},{x:12,y:8},{x:13,y:8},{x:14,y:8},{x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"swiftGhost",count:8,delay:600},{type:"shadow",count:5,delay:800}]},
      {enemies:[{type:"ghost",count:12,delay:400},{type:"swiftGhost",count:6,delay:600}]},
      {enemies:[{type:"shadow",count:8,delay:700},{type:"swiftGhost",count:7,delay:500},{type:"split",count:5,delay:800}]},
      {enemies:[{type:"swiftGhost",count:10,delay:500},{type:"ironArmor",count:3,delay:1500},{type:"giant",count:2,delay:2000}]}
    ],
    unlocks: []
  },
  "2-6": {
    id: "2-6",
    name: "风刃",
    theme: 2,
    difficulty: 16,
    startInk: 650,
    coreHp: 30,
    path: [
      {x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},
      {x:4,y:3},{x:4,y:2},{x:4,y:1},
      {x:5,y:1},{x:6,y:1},{x:7,y:1},{x:8,y:1},{x:9,y:1},{x:10,y:1},{x:11,y:1},{x:12,y:1},{x:13,y:1},{x:14,y:1},
      {x:14,y:2},{x:14,y:3},{x:14,y:4},{x:14,y:5},{x:14,y:6},{x:14,y:7},{x:14,y:8},
      {x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"swiftGhost",count:10,delay:500},{type:"shadow",count:6,delay:700}]},
      {enemies:[{type:"ghost",count:15,delay:350},{type:"swiftGhost",count:8,delay:500}]},
      {enemies:[{type:"shadow",count:10,delay:600},{type:"swiftGhost",count:8,delay:450},{type:"ironArmor",count:4,delay:1200}]},
      {enemies:[{type:"swiftGhost",count:12,delay:400},{type:"split",count:6,delay:600},{type:"giant",count:3,delay:1800}]}
    ],
    unlocks: []
  },
  "2-7": {
    id: "2-7",
    name: "闪击",
    theme: 2,
    difficulty: 17,
    startInk: 700,
    coreHp: 30,
    path: [
      {x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:5,y:2},{x:6,y:2},{x:7,y:2},{x:8,y:2},{x:9,y:2},{x:10,y:2},
      {x:10,y:3},{x:10,y:4},{x:10,y:5},{x:10,y:6},
      {x:11,y:6},{x:12,y:6},{x:13,y:6},{x:14,y:6},{x:15,y:6},{x:16,y:6},{x:17,y:6},{x:18,y:6},{x:19,y:6}
    ],
    core: {x:19,y:6},
    waves: [
      {enemies:[{type:"swiftGhost",count:12,delay:400},{type:"ghost",count:10,delay:500}]},
      {enemies:[{type:"shadow",count:10,delay:600},{type:"swiftGhost",count:8,delay:450}]},
      {enemies:[{type:"swiftGhost",count:15,delay:350},{type:"ironArmor",count:5,delay:1000},{type:"split",count:6,delay:500}]},
      {enemies:[{type:"ghost",count:20,delay:300},{type:"swiftGhost",count:10,delay:400},{type:"superGiant",count:1,delay:3000}]}
    ],
    unlocks: []
  },
  "2-8": {
    id: "2-8",
    name: "飓风",
    theme: 2,
    difficulty: 18,
    startInk: 750,
    coreHp: 32,
    path: [
      {x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},
      {x:5,y:3},{x:5,y:2},{x:5,y:1},{x:5,y:0},
      {x:6,y:0},{x:7,y:0},{x:8,y:0},{x:9,y:0},{x:10,y:0},{x:11,y:0},{x:12,y:0},{x:13,y:0},{x:14,y:0},
      {x:14,y:1},{x:14,y:2},{x:14,y:3},{x:14,y:4},{x:14,y:5},{x:14,y:6},{x:14,y:7},{x:14,y:8},
      {x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"swiftGhost",count:15,delay:350},{type:"shadow",count:8,delay:500}]},
      {enemies:[{type:"ghost",count:25,delay:250},{type:"swiftGhost",count:10,delay:400}]},
      {enemies:[{type:"shadow",count:12,delay:500},{type:"swiftGhost",count:12,delay:350},{type:"ironArmor",count:5,delay:1000}]},
      {enemies:[{type:"swiftGhost",count:15,delay:300},{type:"split",count:8,delay:450},{type:"giant",count:4,delay:1500}]}
    ],
    unlocks: []
  },
  "2-9": {
    id: "2-9",
    name: "风暴",
    theme: 2,
    difficulty: 19,
    startInk: 800,
    coreHp: 35,
    path: [
      {x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:5,y:1},{x:6,y:1},{x:7,y:1},{x:8,y:1},{x:9,y:1},
      {x:9,y:2},{x:9,y:3},{x:9,y:4},{x:9,y:5},{x:9,y:6},{x:9,y:7},{x:9,y:8},
      {x:10,y:8},{x:11,y:8},{x:12,y:8},{x:13,y:8},{x:14,y:8},{x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"swiftGhost",count:18,delay:300},{type:"ghost",count:15,delay:400}]},
      {enemies:[{type:"shadow",count:15,delay:450},{type:"swiftGhost",count:12,delay:350}]},
      {enemies:[{type:"swiftGhost",count:20,delay:280},{type:"ironArmor",count:6,delay:800},{type:"split",count:8,delay:400}]},
      {enemies:[{type:"ghost",count:30,delay:200},{type:"swiftGhost",count:15,delay:300},{type:"superGiant",count:2,delay:2500}]}
    ],
    unlocks: []
  },
  "2-10": {
    id: "2-10",
    name: "风眼",
    theme: 2,
    difficulty: 20,
    startInk: 900,
    coreHp: 40,
    path: [
      {x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},{x:6,y:4},{x:7,y:4},{x:8,y:4},{x:9,y:4},
      {x:9,y:3},{x:9,y:2},
      {x:10,y:2},{x:11,y:2},{x:12,y:2},{x:13,y:2},{x:14,y:2},
      {x:14,y:3},{x:14,y:4},{x:14,y:5},{x:14,y:6},
      {x:15,y:6},{x:16,y:6},{x:17,y:6},{x:18,y:6},{x:19,y:6}
    ],
    core: {x:19,y:6},
    waves: [
      {enemies:[{type:"swiftGhost",count:20,delay:250},{type:"shadow",count:12,delay:400}]},
      {enemies:[{type:"ghost",count:35,delay:180},{type:"swiftGhost",count:15,delay:300}]},
      {enemies:[{type:"swiftGhost",count:25,delay:250},{type:"shadow",count:15,delay:350},{type:"ironArmor",count:8,delay:700}]},
      {enemies:[{type:"swiftGhost",count:20,delay:220},{type:"split",count:10,delay:350},{type:"giant",count:5,delay:1200}]},
      {enemies:[{type:"swiftGhost",count:25,delay:200},{type:"superGiant",count:2,delay:2000},{type:"overlord",count:1,delay:4000}]}
    ],
    unlocks: []
  },

  // ========== 主题3: 火山 (高伤害输出) ==========
  "3-1": {
    id: "3-1",
    name: "熔岩",
    theme: 3,
    difficulty: 21,
    startInk: 500,
    coreHp: 25,
    path: [
      {x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5},{x:5,y:5},{x:6,y:5},{x:7,y:5},{x:8,y:5},{x:9,y:5},
      {x:10,y:5},{x:11,y:5},{x:12,y:5},{x:13,y:5},{x:14,y:5},{x:15,y:5},{x:16,y:5},{x:17,y:5},{x:18,y:5},{x:19,y:5}
    ],
    core: {x:19,y:5},
    waves: [
      {enemies:[{type:"armor",count:5,delay:1500},{type:"ironArmor",count:2,delay:2500}]},
      {enemies:[{type:"giant",count:2,delay:2000},{type:"armor",count:6,delay:1200}]},
      {enemies:[{type:"ironArmor",count:4,delay:1800},{type:"superGiant",count:1,delay:3500}]}
    ],
    unlocks: []
  },
  "3-2": {
    id: "3-2",
    name: "炎流",
    theme: 3,
    difficulty: 22,
    startInk: 550,
    coreHp: 28,
    path: [
      {x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:5,y:2},{x:6,y:2},{x:7,y:2},
      {x:7,y:3},{x:7,y:4},{x:7,y:5},{x:7,y:6},{x:7,y:7},{x:7,y:8},
      {x:8,y:8},{x:9,y:8},{x:10,y:8},{x:11,y:8},{x:12,y:8},{x:13,y:8},{x:14,y:8},{x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"giant",count:3,delay:1800},{type:"armor",count:5,delay:1200}]},
      {enemies:[{type:"ironArmor",count:5,delay:2000},{type:"giant",count:3,delay:1500}]},
      {enemies:[{type:"superGiant",count:2,delay:3000},{type:"ironArmor",count:4,delay:1800}]}
    ],
    unlocks: []
  },
  "3-3": {
    id: "3-3",
    name: "火海",
    theme: 3,
    difficulty: 23,
    startInk: 600,
    coreHp: 30,
    path: [
      {x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:5,y:1},{x:6,y:1},{x:7,y:1},{x:8,y:1},{x:9,y:1},
      {x:9,y:2},{x:9,y:3},{x:9,y:4},{x:9,y:5},{x:9,y:6},{x:9,y:7},{x:9,y:8},
      {x:10,y:8},{x:11,y:8},{x:12,y:8},{x:13,y:8},{x:14,y:8},{x:15,y:8},{x:16,y:8},{x:17,y:8},{x:18,y:8},{x:19,y:8}
    ],
    core: {x:19,y:8},
    waves: [
      {enemies:[{type:"ironArmor",count:6,delay:1800},{type:"giant",count:4,delay:1500}]},
      {enemies:[{type:"superGiant",count:2,delay:2800},{type:"ironArmor",count:5,delay:1500}]},
      {enemies:[{type:"giant",count:6,delay:1200},{type:"superGiant",count:2,delay:2500},{type:"overlord",count:1,delay:5000}]}
    ],
    unlocks: []
  },
  "3-4": {
    id: "3-4",
    name: "焚天",
    theme: 3,
    difficulty: 24,
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
      {enemies:[{type:"superGiant",count:3,delay:2500},{type:"ironArmor",count:6,delay:1500}]},
      {enemies:[{type:"giant",count:8,delay:1000},{type:"superGiant",count:3,delay:2200}]},
      {enemies:[{type:"ironArmor",count:8,delay:1200},{type:"superGiant",count:3,delay:2000},{type:"overlord",count:1,delay:4500}]}
    ],
    unlocks: []
  },
});
