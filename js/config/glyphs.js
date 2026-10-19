// 字形弹道：笔画数据与火、水的招式参数（工单 05）
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
};

(function applyGlyphMoves() {
  const S = CONFIG.GLYPH_SCALE;
  const PX_KEYS = {
    fire: ['range', 'sparkSpeed', 'sparkSpeed0', 'sparkAccel', 'sparkSeek', 'bombArc', 'bombRadius',
      'markRadius', 'markGlyph', 'landMinS', 'landStep'],
    water: ['range', 'jetWidth', 'jetKnock', 'jetReach', 'waveSpeed', 'waveLead', 'waveFloor',
      'waveMinTravel', 'waveCatchBack', 'waveCatchFront', 'waveGlyph', 'waveTrail'],
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
