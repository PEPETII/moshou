// 字形弹道：笔画数据与火、水、土、木的招式参数（工单 05；土、木于 2026-10-20 接入）
//
// 加载顺序：必须在 glyph-battle.js 之后（要用 GLYPH_SCALE）。
// 笔画坐标为 0..100 字身坐标（y 向下），w = [起笔, 行笔, 收笔] 笔宽。数组顺序即笔顺。
// 招式参数分三类（见 GLYPH_MOVES_RAW 的注释）：时间、伤害、概率照搬原型；
// 像素量乘 GLYPH_SCALE；chargePerSec、chargePerHit 照搬。
// 乘完的结果写到 CONFIG.TOWERS[type].glyph，同时把 range（格）和 size 同步给 Tower。
Object.assign(CONFIG, {
  GLYPHS: {
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
    // 土：上与下两横短长分明，竖穿过中轴；三笔即整字，笔画少而重
    earth: {
      char: '土',
      strokes: [
        { id: 'hengTop', name: '横', pts: [[25, 27], [39, 25], [57, 26], [76, 28]], w: [7, 6, 6] },
        { id: 'shu', name: '竖', pts: [[50, 17], [50, 38], [50, 60], [50, 83]], w: [9, 8, 7] },
        { id: 'hengBottom', name: '横', pts: [[13, 81], [33, 79], [57, 79], [87, 77]], w: [6, 7, 9] },
      ],
    },
    // 木：一横一竖立干，撇捺左右分披；笔顺固定为横、竖、撇、捺
    wood: {
      char: '木',
      strokes: [
        { id: 'heng', name: '横', pts: [[19, 26], [38, 24], [62, 25], [83, 27]], w: [8, 7, 7] },
        { id: 'shu', name: '竖', pts: [[50, 9], [50, 34], [50, 62], [50, 93]], w: [10, 9, 7] },
        { id: 'pie', name: '撇', pts: [[56, 45], [46, 59], [32, 74], [14, 91]], w: [8, 7, 2] },
        { id: 'na', name: '捺', pts: [[60, 47], [70, 61], [82, 77], [93, 89]], w: [4, 8, 11] },
      ],
    },
  },

  GLYPH_COLORS: {
    paper: '#f2ecdf',
    ink: '#1d1b18',
    inkSoft: '#6b6458',
    fire: '#c2412b',
    fireHot: '#f08a3c',
    fireGlow: 'rgba(240,120,50,0.55)',
    water: '#2e5f80',
    waterLight: '#6f9bb8',
    waterGlow: 'rgba(80,140,180,0.5)',
    waterWash: 'rgba(60,110,145,0.18)',
    earth: '#8a6a3f',
    earthLight: '#c2a06a',
    earthGlow: 'rgba(190,150,90,0.5)',
    earthWash: 'rgba(120,92,58,0.18)',
    wood: '#4f6f4a',
    woodLight: '#86a06e',
    woodGlow: 'rgba(110,150,90,0.5)',
    woodWash: 'rgba(80,110,70,0.18)',
    seal: '#b4473a',
  },

  // 新塔放下时的初始蓄力（和原型一致）与「写出整字」的动画
  GLYPH_TOWER: {
    startCharge: 0.35,
    startTimer: 0.5,
    introDelayStep: 0.16,    // 第 i 笔延后 i × 此值秒开始写
    introDuration: 0.32,     // 每笔写出所需秒数
    ringRadius: 0.66,        // 圆相蓄力环半径 / 塔身
    ringWidth: 4,
  },
});

// 原型 TOWER_CFG 的全部招式参数（原型舞台 960×540，像素量需乘 GLYPH_SCALE）。
// 带 [px] 标记的是像素量；其余照搬。
const GLYPH_MOVES_RAW = {
  fire: {
    range: 235,              // [px]
    sparkInterval: 0.3, sparkDamage: [9, 14], dotRewrite: 0.32,
    sparkSpeed: 520,         // [px] 追踪终速
    sparkSpeed0: 280,        // [px] 出手初速
    sparkAccel: 900,         // [px] 加速度
    sparkSeek: 260,          // [px] 目标丢失后重新搜索的半径
    sparkSize: 1.35,         // 火星笔画相对塔身的大小（比例，不缩放）
    critChance: 0.15, critMul: 2.2,
    burnDuration: 2.6,       // 火星命中的灼烧时长；焚额外 +1，焦土每跳 1.2
    markIgniteTime: 1.2,
    chargePerSec: 0.12, chargePerHit: 0.012,
    bombFlight: 0.62,
    bombArc: 150,            // [px]
    bombDamage: 85,
    bombRadius: 125,         // [px]
    bombCrit: 0.25, bombCritMul: 1.6, bombEdgeFalloff: 0.35,
    bombIgnite: 3,           // 爆炸附加的灼烧层数
    markDuration: 3.2,
    markRadius: 100,         // [px]
    markGlyph: 200,          // [px] 火字焦土的字号
    markDps: 26, markTick: 0.3,
    rewriteAll: 1.4,
    landMinS: 150,           // [px] 落点至少离入口这么远
    landStep: 16,            // [px] 沿路采样间距
    landRangeMul: 1.15,      // 落点限制在射程的这个倍数以内
  },
  water: {
    range: 215,              // [px]
    jetInterval: 0.82, jetDamage: [6, 9], shuRewrite: 0.5,
    jetWidth: 18,            // [px]
    jetKnock: 8,             // [px]
    jetReach: 70,            // [px] 水柱比目标多伸出的长度
    jetChargeCap: 3,         // 单发水箭最多按几个命中计充能
    wetDuration: 2.2,
    chargePerSec: 0.08, chargePerHit: 0.02,
    waveSpeed: 420,          // [px]
    waveTime: 1.05,
    waveLead: 40,            // [px] 浪头涌起处在最前敌人前方多远
    waveFloor: 80,           // [px] 塔防倒卷的里程下限，不把敌人推出画面
    waveMinTravel: 60,       // [px] 浪头至少要有这么长的倒卷空间才值得放（否则 cast 返回 false）
    waveCatchBack: 4,        // [px]
    waveCatchFront: 50,      // [px]
    waveCarryOff: [8, 48],   // [px]
    waveGlyph: 130,          // [px] 浪头字号
    waveTrail: 160,          // [px] 浪后水痕长度
    waveCatchDamage: 6, waveEndDamage: 16, waveStun: 0.55,
    rewriteSides: 1.2,
  },
  // 土：短射程、慢节奏、重控场。普攻只掷出上横（一笔），大招三笔整字下砸并留陷坑
  earth: {
    range: 210,              // [px]
    slabInterval: 1.05, slabDamage: [22, 28], slabRewrite: 0.6,
    slabSpeed: 620,          // [px] 石片直线速度
    slabRadius: 18,          // [px] 命中判定半径
    slabKnock: 5,            // [px] 命中时的轻微外推
    slabSplash: 52,          // [px] 碎石溅射半径
    slabSplashDamage: 12,
    chargePerSec: 0.1, chargePerHit: 0.025,
    quakeFlight: 0.72,       // 整字下砸的飞行时间
    quakeArc: 120,           // [px] 抛物高度
    quakeDamage: 56,
    quakeRadius: 110,        // [px]
    quakeEdgeFalloff: 0.35,
    quakeStun: 0.8,
    quakeKnock: 12,          // [px] 落点向外的推力
    pitDuration: 2.6,        // 地面「土」字陷坑持续秒数
    pitRadius: 95,           // [px]
    pitDps: 25, pitTick: 0.4,
    pitStun: 0.25,           // 每跳把敌人按住的时间，表现为陷在坑里
    pitGlyph: 150,           // [px] 陷坑字形的字号
    rewriteAll: 1.5,         // 三笔写回的总时长
    landMinS: 120,           // [px] 落点至少离入口这么远
    landStep: 16,            // [px] 沿路采样间距
    landRangeMul: 1.2,       // 落点限制在射程的这个倍数以内
  },
  // 木：中速穿透。普攻只掷出撇笔（一笔木刺），大招四笔整字掷出后炸成一圈木刺
  wood: {
    range: 215,              // [px]
    shardInterval: 0.55, shardDamage: [9, 13], shardRewrite: 0.5,
    shardSpeed: 640,         // [px] 木刺直线速度
    shardRadius: 16,         // [px] 命中判定半径
    shardPierce: 3,          // 单发木刺最多结算几个目标
    shardKnock: 4,           // [px] 每次命中的轻推
    chargePerSec: 0.09, chargePerHit: 0.018,
    burstFlight: 0.65,       // 整字掷出的飞行时间
    burstArc: 130,           // [px] 抛物高度
    burstDamage: 60,
    burstRadius: 120,        // [px]
    burstEdgeFalloff: 0.35,
    burstKnock: 14,          // [px] 落点向外的推力
    rewriteAll: 1.2,         // 四笔写回的总时长
    landMinS: 140,           // [px] 落点至少离入口这么远
    landStep: 16,            // [px] 沿路采样间距
    landRangeMul: 1.15,      // 落点限制在射程的这个倍数以内
  },
};

(function applyGlyphMoves() {
  const S = CONFIG.GLYPH_SCALE;
  const PX_KEYS = {
    fire: ['range', 'sparkSpeed', 'sparkSpeed0', 'sparkAccel', 'sparkSeek', 'bombArc', 'bombRadius',
      'markRadius', 'markGlyph', 'landMinS', 'landStep'],
    water: ['range', 'jetWidth', 'jetKnock', 'jetReach', 'waveSpeed', 'waveLead', 'waveFloor',
      'waveMinTravel', 'waveCatchBack', 'waveCatchFront', 'waveGlyph', 'waveTrail'],
    earth: ['range', 'slabSpeed', 'slabRadius', 'slabKnock', 'slabSplash', 'quakeArc', 'quakeRadius',
      'quakeKnock', 'pitRadius', 'pitGlyph', 'landMinS', 'landStep'],
    wood: ['range', 'shardSpeed', 'shardRadius', 'shardKnock', 'burstArc', 'burstRadius', 'burstKnock',
      'landMinS', 'landStep'],
  };
  for (const type of Object.keys(GLYPH_MOVES_RAW)) {
    const cfg = Object.assign({}, GLYPH_MOVES_RAW[type]);
    for (const key of PX_KEYS[type]) cfg[key] *= S;
    if (cfg.waveCarryOff) cfg.waveCarryOff = cfg.waveCarryOff.map((v) => v * S);
    const tower = CONFIG.TOWERS[type];
    if (!tower) continue;
    tower.glyph = cfg;
    tower.size = tower.size || 68;
    tower.range = cfg.range / CONFIG.CELL_SIZE; // 格，供射程圈与说明复用
  }
})();
