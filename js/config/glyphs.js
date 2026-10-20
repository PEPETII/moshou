// 字形弹道：笔画数据与火、水、土、木的招式参数（工单 05；土、木于 2026-10-20 接入并重做）
//
// 其余八座单字塔见 glyphs-ext.js，合字塔见 glyphs-fusion.js；三份文件都通过本文件的
// applyGlyphMoves 注入 CONFIG.TOWERS[type].glyph。
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
    // 2026-10-20 新塔：主色 / 浅色 / 光晕
    gold: '#a8822a', goldLight: '#dcb85e', goldGlow: 'rgba(220,180,80,0.55)',
    wind: '#5f7d78', windLight: '#a7c1b8', windGlow: 'rgba(150,190,180,0.5)',
    cannon: '#4a3f36', cannonLight: '#8a7a68', cannonGlow: 'rgba(120,100,80,0.45)',
    thunder: '#5a4fa0', thunderLight: '#b7aef0', thunderGlow: 'rgba(160,150,240,0.6)',
    ice: '#4f8fb0', iceLight: '#bfe2f2', iceGlow: 'rgba(170,220,245,0.6)',
    bow: '#7a4a2e', bowLight: '#c09068', bowGlow: 'rgba(190,140,100,0.45)',
    mountain: '#5a5a50', mountainLight: '#9a9a88', mountainGlow: 'rgba(140,140,120,0.45)',
    sword: '#3d4d5c', swordLight: '#a9bccb', swordGlow: 'rgba(170,190,210,0.55)',
    yan: '#d0461f', yanLight: '#ffb057', yanGlow: 'rgba(255,140,60,0.6)',
    lin: '#2f6b3a', linLight: '#7fb27a', linGlow: 'rgba(110,170,100,0.55)',
    fen: '#9c2f1c', fenLight: '#f2984a', fenGlow: 'rgba(240,120,50,0.6)',
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
  // 土（2026-10-20 重做）：范围压制与减速。普攻不出弹道，下横砸地以塔为心震荡一圈；
  // 大招把整字立在敌群最密处成「壁垒」，区域内重度减速并持续碾压，到时崩塌
  earth: {
    range: 165,              // [px] 震荡半径即射程
    poundInterval: 1.15, poundDamage: [10, 14], poundRewrite: 0.7,
    poundChargeCap: 5,       // 单次震荡最多按几个命中计充能
    mireSlow: 0.35, mireDuration: 1.6,   // 泥泞：减速比例与秒数
    chargePerSec: 0.1, chargePerHit: 0.006,
    wallFlight: 0.7,         // 整字飞向落点的时间
    wallArc: 120,            // [px] 抛物高度
    wallDuration: 4,         // 壁垒持续秒数
    wallRadius: 95,          // [px]
    wallSlow: 0.65,          // 壁垒内减速比例
    wallDps: 14, wallTick: 0.4,
    wallGlyph: 150,          // [px] 壁垒字号
    collapseDamage: 45, collapseStun: 0.8,
    rewriteAll: 1.5,         // 三笔写回的总时长
    landMinS: 120,           // [px] 落点至少离入口这么远
    landStep: 16,            // [px] 沿路采样间距
    landRangeMul: 1.3,       // 落点限制在射程的这个倍数以内
  },
  // 木（2026-10-20 重做）：持续生长与蔓延。普攻把撇笔种到最前敌人前方的路上，长成木苗；
  // 大招让藤蔓从落点沿路双向生长，缠住其上敌人
  wood: {
    range: 215,              // [px]
    seedInterval: 0.9, seedRewrite: 0.6,
    seedFlight: 0.4,         // 种子飞行秒数
    seedArc: 50,             // [px]
    seedLead: 30,            // [px] 种在目标前方多远（沿路里程）
    sproutGrow: 0.7,         // 木苗长成所需秒数，长成前不伤人
    sproutLife: 6,           // 木苗存活秒数
    sproutRadius: 26,        // [px]
    sproutDps: 12, sproutTick: 0.4, sproutSlow: 0.25,
    sproutMax: 4,            // 每座塔同时存在的木苗上限，超出则最老的枯萎
    chargePerSec: 0.09, chargePerHit: 0.01,
    vineFlight: 0.6,
    vineArc: 110,            // [px]
    vineGrowSpeed: 160,      // [px/s] 每个方向的生长速度
    vineLength: 170,         // [px] 每个方向最长
    vineDuration: 4.5,
    vineWidth: 26,           // [px] 藤蔓带半宽
    vineSlow: 0.5, vineDps: 16, vineTick: 0.4,
    rewriteAll: 1.3,         // 四笔写回的总时长
    landMinS: 120,           // [px]
    landStep: 16,            // [px]
    landRangeMul: 1.15,
  },
};

// 把招式参数写进 CONFIG.TOWERS[type].glyph：pxKeys 中的像素量乘 GLYPH_SCALE。
// glyphs-ext.js、glyphs-fusion.js 也用它注入新塔，保证十五座塔的字段处理一致。
function applyGlyphMoves(raw, pxKeys) {
  const S = CONFIG.GLYPH_SCALE;
  for (const type of Object.keys(raw)) {
    const cfg = Object.assign({}, raw[type]);
    for (const key of pxKeys[type] || []) cfg[key] *= S;
    if (cfg.waveCarryOff) cfg.waveCarryOff = cfg.waveCarryOff.map((v) => v * S);
    const tower = CONFIG.TOWERS[type];
    if (!tower) continue;
    tower.glyph = cfg;
    tower.size = tower.size || 68;
    tower.range = cfg.range / CONFIG.CELL_SIZE; // 格，供射程圈与说明复用
  }
}

applyGlyphMoves(GLYPH_MOVES_RAW, {
  fire: ['range', 'sparkSpeed', 'sparkSpeed0', 'sparkAccel', 'sparkSeek', 'bombArc', 'bombRadius',
    'markRadius', 'markGlyph', 'landMinS', 'landStep'],
  water: ['range', 'jetWidth', 'jetKnock', 'jetReach', 'waveSpeed', 'waveLead', 'waveFloor',
    'waveMinTravel', 'waveCatchBack', 'waveCatchFront', 'waveGlyph', 'waveTrail'],
  earth: ['range', 'wallArc', 'wallRadius', 'wallGlyph', 'landMinS', 'landStep'],
  wood: ['range', 'seedArc', 'seedLead', 'sproutRadius', 'vineArc', 'vineGrowSpeed', 'vineLength',
    'vineWidth', 'landMinS', 'landStep'],
});
