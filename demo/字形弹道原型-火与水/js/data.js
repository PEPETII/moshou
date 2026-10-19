// 字形弹道原型 v2：字形数据与全部可调参数
// 笔画坐标为 0..100 字身坐标（y 向下），w = [起笔, 行笔, 收笔] 笔宽
const STAGE = { W: 960, H: 540 };

const GLYPHS = {
  fire: {
    char: '火',
    strokes: [
      { id: 'dotL', name: '左点', pts: [[21, 35], [26, 42], [31, 52]], w: [7, 10, 5] },
      { id: 'dotR', name: '右点', pts: [[81, 29], [75, 39], [67, 50]], w: [6, 9, 4] },
      { id: 'pie', name: '撇', pts: [[51, 8], [52, 28], [50, 50], [39, 71], [15, 92]], w: [10, 9, 2] },
      { id: 'na', name: '捺', pts: [[50, 48], [59, 62], [73, 79], [92, 93]], w: [4, 8, 12] },
    ],
  },
  water: {
    char: '水',
    strokes: [
      { id: 'shu', name: '竖钩', pts: [[50, 5], [51, 28], [51, 56], [51, 84], [50, 90], [42, 83]], w: [10, 8, 5] },
      { id: 'hengpie', name: '横撇', pts: [[13, 34], [27, 33], [41, 35], [32, 52], [12, 73]], w: [7, 8, 3] },
      { id: 'pie', name: '撇', pts: [[81, 22], [71, 35], [59, 46]], w: [8, 7, 3] },
      { id: 'na', name: '捺', pts: [[57, 43], [66, 59], [78, 76], [93, 89]], w: [4, 7, 11] },
    ],
  },
};

// 招式参数：时间单位秒，距离单位为舞台像素（舞台 960×540）
const TOWER_CFG = {
  fire: {
    x: 300, y: 190, size: 92, range: 235,
    // 普攻：两点轮流化作火星
    sparkInterval: 0.3, sparkDamage: [9, 14], sparkSpeed: 520, dotRewrite: 0.32,
    critChance: 0.15, critMul: 2.2,
    burnDps: 5, burnMaxStacks: 4, burnDuration: 2.6,
    // 大招「焚」：整字掷出
    chargePerSec: 0.12, chargePerHit: 0.012,
    bombFlight: 0.62, bombArc: 150, bombDamage: 85, bombRadius: 125,
    markDuration: 3.2, markRadius: 100, markDps: 26, rewriteAll: 1.4,
  },
  water: {
    x: 545, y: 352, size: 92, range: 215,
    // 普攻：竖钩化作水箭
    jetInterval: 0.82, jetDamage: [6, 9], jetWidth: 18, jetKnock: 8, shuRewrite: 0.5,
    wetSlow: 0.3, wetDuration: 2.2,
    // 大招「潮」：三笔化浪，沿路径倒卷
    chargePerSec: 0.08, chargePerHit: 0.02,
    waveSpeed: 420, waveTime: 1.05, waveCatchDamage: 6, waveEndDamage: 16,
    waveStun: 0.55, rewriteSides: 1.2,
  },
};

const ENEMY_TYPES = {
  corpse: { char: '尸', hp: 40, speed: 46, size: 30, weight: 1 },
  ghost: { char: '鬼', hp: 22, speed: 82, size: 28, weight: 1, float: true },
  giant: { char: '巨', hp: 300, speed: 25, size: 48, weight: 4 },
};

// 敌潮三档：每秒生成数；巨尸按固定间隔出场
const DENSITY = {
  sparse: { rate: 1.6, giantEvery: 14 },
  normal: { rate: 3.4, giantEvery: 9 },
  flood: { rate: 6.5, giantEvery: 5 },
};

const ENEMY_CAP = 140;

// 路径：从左上入，蛇行三段，从右下出
const PATH_POINTS = [
  [-40, 108], [705, 108], [705, 270], [255, 270], [255, 432], [1000, 432],
];

const COMBO_MARKS = [
  { at: 25, text: '一气呵成' },
  { at: 60, text: '势如破竹' },
  { at: 120, text: '所向披靡' },
];

const COLORS = {
  paper: '#f2ecdf',
  ink: '#1d1b18',
  inkSoft: '#6b6458',
  path: 'rgba(120,110,96,0.16)',
  fire: '#c2412b',
  fireHot: '#f08a3c',
  fireGlow: 'rgba(240,120,50,0.55)',
  water: '#2e5f80',
  waterLight: '#6f9bb8',
  waterWash: 'rgba(60,110,145,0.18)',
  seal: '#b4473a',
  plain: '#77716a',
};

const FONT_BRUSH = "'Ma Shan Zheng', 'KaiTi', 'STKaiti', serif";
