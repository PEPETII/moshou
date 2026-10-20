// 字形弹道：金、风、炮、雷、冰、弓、山、剑八座单字塔的笔画与招式参数（2026-10-20）
//
// 加载顺序：glyphs.js 之后（复用 applyGlyphMoves 与 GLYPH_SCALE）。
// 约定与火、水完全一致：笔画为 0..100 字身坐标、w = [起笔, 行笔, 收笔]；
// 招式参数里带 [px] 的是原型舞台像素量，由 applyGlyphMoves 乘 GLYPH_SCALE。
Object.assign(CONFIG.GLYPHS, {
  // 金：人字头、两横、竖、两点、底横；两横即普攻的回旋刃
  gold: {
    char: '金',
    strokes: [
      { id: 'pie', name: '撇', pts: [[50, 6], [40, 18], [26, 32], [10, 44]], w: [8, 7, 2] },
      { id: 'na', name: '捺', pts: [[50, 8], [62, 20], [76, 32], [92, 42]], w: [4, 7, 10] },
      { id: 'heng1', name: '横', pts: [[30, 44], [45, 43], [60, 43], [71, 44]], w: [6, 6, 6] },
      { id: 'heng2', name: '横', pts: [[26, 60], [42, 59], [60, 59], [75, 60]], w: [6, 6, 6] },
      { id: 'shu', name: '竖', pts: [[50, 44], [50, 58], [50, 72], [50, 86]], w: [8, 7, 6] },
      { id: 'dianL', name: '点', pts: [[32, 68], [35, 73], [38, 79]], w: [5, 7, 4] },
      { id: 'dianR', name: '撇', pts: [[68, 67], [64, 73], [60, 79]], w: [6, 7, 3] },
      { id: 'hengB', name: '横', pts: [[12, 89], [36, 88], [64, 88], [90, 87]], w: [6, 7, 9] },
    ],
  },
  // 风：外框一撇一横折斜钩，内里一撇一点；内里两笔轮流化作扇形风刃
  wind: {
    char: '风',
    strokes: [
      { id: 'pie', name: '撇', pts: [[30, 12], [30, 40], [27, 68], [12, 92]], w: [8, 7, 2] },
      { id: 'hzxg', name: '横折斜钩', pts: [[30, 12], [52, 11], [72, 12], [73, 40], [78, 70], [90, 90], [92, 80]], w: [7, 7, 5] },
      { id: 'pieIn', name: '撇', pts: [[62, 36], [55, 48], [46, 58], [36, 68]], w: [7, 6, 2] },
      { id: 'dian', name: '点', pts: [[44, 44], [52, 54], [60, 64], [66, 72]], w: [4, 6, 7] },
    ],
  },
  // 炮：左火旁、右包；火旁的左点是炮弹，「包」的五笔就是大招的五发连珠
  cannon: {
    char: '炮',
    strokes: [
      { id: 'dian', name: '点', pts: [[12, 34], [15, 40], [18, 47]], w: [5, 7, 4] },
      { id: 'piedian', name: '撇', pts: [[34, 30], [31, 37], [27, 44]], w: [5, 6, 3] },
      { id: 'pie', name: '撇', pts: [[24, 14], [24, 40], [21, 64], [8, 86]], w: [8, 7, 2] },
      { id: 'dianB', name: '点', pts: [[24, 58], [29, 66], [35, 74]], w: [4, 6, 6] },
      { id: 'baoPie', name: '撇', pts: [[56, 10], [52, 20], [46, 30], [40, 38]], w: [7, 6, 2] },
      { id: 'hzg', name: '横折钩', pts: [[52, 22], [70, 21], [88, 22], [88, 50], [86, 78], [80, 86], [74, 80]], w: [6, 7, 5] },
      { id: 'hz', name: '横折', pts: [[52, 38], [63, 37], [74, 38], [73, 54]], w: [6, 6, 6] },
      { id: 'heng', name: '横', pts: [[52, 54], [62, 54], [73, 54]], w: [6, 6, 6] },
      { id: 'swg', name: '竖弯钩', pts: [[52, 38], [52, 60], [53, 80], [66, 86], [88, 86], [95, 78]], w: [7, 6, 5] },
    ],
  },
  // 雷：上雨下田；雨中四点是普攻的电弧来源
  thunder: {
    char: '雷',
    strokes: [
      { id: 'heng', name: '横', pts: [[24, 8], [40, 7], [60, 7], [76, 8]], w: [6, 6, 6] },
      { id: 'shuL', name: '竖', pts: [[16, 20], [16, 30], [16, 42]], w: [6, 6, 5] },
      { id: 'hzg', name: '横折钩', pts: [[16, 20], [50, 19], [84, 20], [84, 34], [83, 44], [78, 40]], w: [6, 6, 5] },
      { id: 'shuM', name: '竖', pts: [[50, 12], [50, 30], [50, 46]], w: [6, 6, 5] },
      { id: 'd1', name: '点', pts: [[28, 27], [31, 30], [34, 33]], w: [4, 5, 3] },
      { id: 'd2', name: '点', pts: [[28, 36], [31, 39], [34, 42]], w: [4, 5, 3] },
      { id: 'd3', name: '点', pts: [[64, 27], [67, 30], [70, 33]], w: [4, 5, 3] },
      { id: 'd4', name: '点', pts: [[64, 36], [67, 39], [70, 42]], w: [4, 5, 3] },
      { id: 'tShu', name: '竖', pts: [[22, 52], [22, 72], [23, 94]], w: [7, 6, 6] },
      { id: 'tHz', name: '横折', pts: [[22, 52], [50, 51], [78, 52], [78, 72], [77, 94]], w: [6, 6, 6] },
      { id: 'tHeng', name: '横', pts: [[24, 72], [50, 72], [76, 72]], w: [5, 5, 5] },
      { id: 'tShuM', name: '竖', pts: [[50, 52], [50, 72], [50, 93]], w: [6, 6, 5] },
      { id: 'tHengB', name: '横', pts: [[22, 93], [50, 93], [78, 93]], w: [6, 6, 7] },
    ],
  },
  // 冰：两点水加「水」；竖钩化作冰凌
  ice: {
    char: '冰',
    strokes: [
      { id: 'dian', name: '点', pts: [[12, 26], [17, 31], [22, 37]], w: [5, 7, 4] },
      { id: 'ti', name: '提', pts: [[10, 74], [16, 64], [24, 52]], w: [6, 5, 2] },
      { id: 'shu', name: '竖钩', pts: [[63, 5], [63.7, 28], [63.7, 56], [63.7, 84], [63, 90], [57.7, 83]], w: [9, 7, 5] },
      { id: 'hengpie', name: '横撇', pts: [[38.6, 34], [47.8, 33], [57, 35], [51, 52], [37.9, 73]], w: [6, 7, 3] },
      { id: 'pie', name: '撇', pts: [[83.5, 22], [76.9, 35], [68.9, 46]], w: [7, 6, 3] },
      { id: 'na', name: '捺', pts: [[67.6, 43], [73.6, 59], [81.5, 76], [91.4, 89]], w: [4, 6, 10] },
    ],
  },
  // 弓：横折、横、竖折折钩；中间一横就是搭在弦上的箭
  bow: {
    char: '弓',
    strokes: [
      { id: 'hz', name: '横折', pts: [[24, 12], [48, 11], [72, 12], [72, 30], [71, 44]], w: [7, 7, 6] },
      { id: 'heng', name: '横', pts: [[28, 44], [48, 43], [71, 44]], w: [6, 6, 6] },
      { id: 'szzg', name: '竖折折钩', pts: [[28, 44], [27, 58], [28, 64], [54, 63], [76, 64], [74, 82], [68, 94], [56, 88]], w: [7, 7, 5] },
    ],
  },
  // 山：中竖、竖折、右竖；三笔即三根石刺
  mountain: {
    char: '山',
    strokes: [
      { id: 'shu', name: '竖', pts: [[50, 10], [50, 40], [50, 66], [50, 84]], w: [9, 8, 7] },
      { id: 'sz', name: '竖折', pts: [[18, 38], [18, 60], [18, 84], [50, 84], [82, 84]], w: [7, 7, 7] },
      { id: 'shuR', name: '竖', pts: [[82, 38], [82, 60], [82, 86]], w: [7, 7, 6] },
    ],
  },
  // 剑：左佥右刂；刂的竖是剑气，竖钩是大招的飞剑
  sword: {
    char: '剑',
    strokes: [
      { id: 'pie', name: '撇', pts: [[32, 6], [25, 18], [16, 30], [6, 40]], w: [7, 6, 2] },
      { id: 'na', name: '捺', pts: [[32, 8], [40, 20], [48, 32], [58, 40]], w: [4, 6, 8] },
      { id: 'heng', name: '横', pts: [[20, 38], [32, 37], [44, 38]], w: [5, 5, 5] },
      { id: 'shu', name: '竖', pts: [[32, 46], [32, 58], [32, 72]], w: [6, 6, 5] },
      { id: 'dian', name: '点', pts: [[18, 54], [21, 60], [24, 67]], w: [4, 6, 4] },
      { id: 'pieS', name: '撇', pts: [[46, 52], [43, 60], [40, 68]], w: [6, 5, 2] },
      { id: 'hengB', name: '横', pts: [[8, 80], [30, 79], [56, 78]], w: [6, 6, 7] },
      { id: 'dao1', name: '竖', pts: [[68, 20], [68, 40], [68, 64]], w: [6, 6, 5] },
      { id: 'dao2', name: '竖钩', pts: [[86, 6], [86, 40], [86, 80], [85, 94], [78, 88]], w: [9, 8, 5] },
    ],
  },
});

// 招式参数（时间秒、伤害、概率照填；[px] 为像素量）
const GLYPH_MOVES_EXT = {
  // 金：回旋刃去程、回程各结算一次；金钟罩下使敌人「破甲」
  gold: {
    range: 220,              // [px]
    bladeInterval: 0.7, bladeDamage: [10, 14], bladeRewrite: 0.55,
    bladeSpeed: 520,         // [px/s]
    bladeRadius: 16,         // [px] 命中判定半径
    bladeReach: 30,          // [px] 去程比目标多飞出的距离
    chargePerSec: 0.09, chargePerHit: 0.012,
    bellFlight: 0.6,
    bellArc: 140,            // [px]
    bellDamage: 50,
    bellRadius: 120,         // [px]
    bellEdgeFalloff: 0.3,
    exposeRatio: 0.35,       // 破甲：受伤加深比例
    exposeDuration: 5,
    bellGlyph: 150,          // [px] 金钟字号
    bellLinger: 0.9,         // 金钟落地后残影秒数
    rewriteAll: 1.6,
    landMinS: 130,           // [px]
    landStep: 16,            // [px]
    landRangeMul: 1.15,
  },
  // 风：扇形横扫；旋风沿路把敌人吸向中心
  wind: {
    range: 190,              // [px]
    gustInterval: 0.6, gustDamage: [6, 9], gustRewrite: 0.45,
    gustAngle: 0.7,          // 扇形半角（弧度）
    gustKnock: 10,           // [px]
    gustChargeCap: 4,        // 单次横扫最多按几个命中计充能
    chargePerSec: 0.1, chargePerHit: 0.008,
    vortexFlight: 0.45,
    vortexDuration: 3,
    vortexRadius: 120,       // [px]
    vortexPull: 70,          // [px/s] 沿路吸向中心的速度
    vortexDps: 18, vortexTick: 0.3,
    vortexGlyph: 120,        // [px]
    rewriteAll: 1.2,
    landMinS: 120,           // [px]
    landStep: 16,            // [px]
    landRangeMul: 1.2,
  },
  // 炮：超远抛射，近身盲区；大招五发连珠沿路落下
  cannon: {
    range: 320,              // [px]
    minRange: 110,           // [px] 盲区：这么近的敌人打不到（紧贴路边时正前方一段打不到）
    shellInterval: 1.5, shellDamage: [20, 26], shellRewrite: 0.9,
    shellFlight: 0.85,
    shellArc: 110,           // [px]
    shellRadius: 60,         // [px] 溅射半径
    shellEdgeFalloff: 0.4,
    chargePerSec: 0.07, chargePerHit: 0.03,
    barrageGap: 0.18,        // 连珠每发间隔
    barrageSpacing: 55,      // [px] 相邻两发落点的沿路间距
    barrageFlight: 0.7,
    barrageDamage: 40,
    barrageRadius: 70,       // [px]
    rewriteAll: 1.8,
    landMinS: 120,           // [px]
    landStep: 16,            // [px]
    landRangeMul: 1,
  },
  // 雷：瞬发连锁电弧，湿身加伤；天雷轮番劈落
  thunder: {
    range: 210,              // [px]
    arcInterval: 0.75, arcDamage: [12, 16], arcRewrite: 0.4,
    arcJumps: 4,             // 首个目标之后还能跳几次
    arcJumpRange: 90,        // [px]
    arcFalloff: 0.75,        // 每跳伤害倍率（湿身目标不衰减）
    wetMul: 1.5,             // 湿身目标伤害倍率
    chargePerSec: 0.09, chargePerHit: 0.008,
    boltCount: 6, boltGap: 0.14,
    boltDamage: 34,
    boltRadius: 45,          // [px]
    boltStun: 0.6,
    rewriteAll: 1.6,
  },
  // 冰：冰凌叠寒，叠满冻结；寒潮冻结射程内全部
  ice: {
    range: 205,              // [px]
    icicleInterval: 0.7, icicleDamage: [7, 10], icicleRewrite: 0.5,
    icicleSpeed: 600,        // [px/s]
    icicleRadius: 14,        // [px]
    chillStacks: 1, chillDuration: 2.4, freezeTime: 1.1,
    chargePerSec: 0.09, chargePerHit: 0.02,
    frostSpeed: 380,         // [px/s] 寒潮扩散速度
    frostFreeze: 2,
    frostDamage: 18,
    rewriteAll: 1.3,
  },
  // 弓：超远单发，优先射血量最高者；箭雨覆盖一段路
  bow: {
    range: 300,              // [px]
    arrowInterval: 1.1, arrowDamage: [26, 32], arrowRewrite: 0.7,
    arrowSpeed: 900,         // [px/s]
    arrowRadius: 14,         // [px]
    heavyMul: 1.6,           // 对重敌（weight > 1）的伤害倍率
    critChance: 0.2, critMul: 1.8,
    chargePerSec: 0.08, chargePerHit: 0.03,
    rainDuration: 1.8,
    rainRate: 30,            // 每秒落箭数
    rainLength: 200,         // [px] 覆盖的路段长度
    rainDamage: 9,
    rainHitRadius: 26,       // [px]
    rewriteAll: 1.2,
    landMinS: 120,           // [px]
    landStep: 16,            // [px]
    landRangeMul: 1,
  },
  // 山：路径塔，挡路并承受攻击；峰刺从脚下拱出，崩回满生命并沿路震荡
  mountain: {
    range: 170,              // [px]
    spikeInterval: 1.2, spikeDamage: [14, 18], spikeRewrite: 0.8,
    spikeDelay: 0.25,        // 石刺从预警到拱出的秒数
    spikeStun: 0.2,
    chargePerSec: 0.1, chargePerHit: 0.02,
    quakeReach: 200,         // [px] 沿路每个方向的震荡长度
    quakeKnock: 40,          // [px]
    quakeStun: 0.9,
    quakeDamage: 30,
    quakeHeal: 1,            // 回复最大生命的比例
    rewriteAll: 1.4,
  },
  // 剑：短射程高频斩击；巨剑沿路飞斩
  sword: {
    range: 150,              // [px]
    slashInterval: 0.38, slashDamage: [11, 15], slashRewrite: 0.3,
    critChance: 0.25, critMul: 2,
    slashLen: 46,            // [px] 剑痕长度
    chargePerSec: 0.1, chargePerHit: 0.012,
    flySpeed: 520,           // [px/s]
    flyDistance: 360,        // [px] 沿路飞行的里程
    flyDamage: 70,
    flyWidth: 34,            // [px] 判定半宽
    flyGlyph: 120,           // [px] 巨剑长度
    rewriteAll: 1.2,
  },
};

applyGlyphMoves(GLYPH_MOVES_EXT, {
  gold: ['range', 'bladeSpeed', 'bladeRadius', 'bladeReach', 'bellArc', 'bellRadius', 'bellGlyph', 'landMinS', 'landStep'],
  wind: ['range', 'gustKnock', 'vortexRadius', 'vortexPull', 'vortexGlyph', 'landMinS', 'landStep'],
  cannon: ['range', 'minRange', 'shellArc', 'shellRadius', 'barrageSpacing', 'barrageRadius', 'landMinS', 'landStep'],
  thunder: ['range', 'arcJumpRange', 'boltRadius'],
  ice: ['range', 'icicleSpeed', 'icicleRadius', 'frostSpeed'],
  bow: ['range', 'arrowSpeed', 'arrowRadius', 'rainLength', 'rainHitRadius', 'landMinS', 'landStep'],
  mountain: ['range', 'quakeReach', 'quakeKnock'],
  sword: ['range', 'slashLen', 'flySpeed', 'flyDistance', 'flyWidth', 'flyGlyph'],
});
