// 字形弹道玩法：连续刷怪、限时坚守与敌人路程化的集中配置（工单 04；05、06 共用）
//
// 加载顺序：必须在 domain-03.js 之后（要把敌人原型速度 speedPx 换算成引擎速度 speed）。
// 单位约定：
//   - 时间一律为「秒」，除非字段名带 Ms；
//   - 敌人 speedPx 是原型的 px/s；引擎的 ENEMIES[*].speed 是「格/秒」（运动时再乘 CELL_SIZE），
//     换算：speed = speedPx × GLYPH_SCALE / CELL_SIZE。改 GLYPH_SCALE 或 CELL_SIZE 后速度自动跟随。
Object.assign(CONFIG, {
  // 像素量缩放：塔身 92 → 68（约 0.74 倍），射程、弹速、敌人速度等像素量同比缩放
  GLYPH_SCALE: 0.74,

  // 场上同时存在的怪物上限（原型 140）；到顶只暂停刷怪，不算失败
  ENEMY_CAP: 260,

  // 限时坚守：守满此秒数且核心血量 > 0 即胜；关卡可用 holdSeconds 覆盖
  HOLD_SECONDS: 150,

  // 征服模式失败线：场上存活数 ≥ 此值判负（原 maxAliveEnemies = 50）
  CONQUEST_DANGER_LIMIT: 200,

  // 全场大招最小间隔（05 使用）
  ULT_GLOBAL_GAP: 0.6,

  // 出场（图鉴、刷怪）的敌人；其余敌人配置保留但不出场
  ACTIVE_ENEMIES: ['corpse', 'ghost', 'giant'],

  // 敌潮三档：rate = 每秒刷怪数；giantEvery = 每隔多少秒刷一只巨
  DENSITY: {
    sparse: { label: '稀', rate: 1.6, giantEvery: 14, desc: '疏疏落落，慢慢练笔' },
    normal: { label: '常', rate: 3.4, giantEvery: 9, desc: '源源不断，张弛有度' },
    flood: { label: '潮', rate: 6.5, giantEvery: 5, desc: '倾巢而出，墨浪翻涌' },
  },
  // 每次开局的默认档位（A7：不记忆上一次选择）
  DENSITY_DEFAULT: 'flood',

  // 刷怪参数
  SPAWN: {
    corpseRatio: 0.7,        // 普通怪里尸的占比，其余为鬼
    firstGiantDelay: 4,      // 开局后第一只巨出现的时间（秒）
    startSpread: 20,         // 新怪初始里程 s 的随机范围（px），避免同帧重叠
    laneRange: 9,            // 横向偏移范围（px，乘 GLYPH_SCALE），让队伍不排成一线
    speedJitter: 0.08,       // 速度随机浮动 ±8%
    prefillCount: 12,        // 开局预铺在路上的敌人数（原型 22，地图更长故减少）
    prefillStart: 1.5,       // 预铺起点（格）
    prefillSpacing: 80,      // 预铺间距（px 里程）
  },

  // 敌人身上的字形状态（05 的火、水招式通过 Enemy.ignite / Enemy.makeWet 施加）
  GLYPH_STATUS: {
    burnDps: 5,              // 灼烧每层每秒伤害
    burnMaxStacks: 4,        // 灼烧最大层数
    burnShowInterval: 0.45,  // 灼烧伤害合并显示的间隔（秒）
    wetSlow: 0.3,            // 湿身减速比例
    giantKnockMul: 0.3,      // 重敌（weight > 1）被击退的距离折扣
  },

  // 打击反馈（工单 06）：数值照原型，像素量由 GlyphFX 内部统一乘 GLYPH_SCALE
  GLYPH_FEEDBACK: {
    storageKey: 'moshou_hit_feedback',   // 'on' / 'off'，缺省 'on'
    maxShake: 22,                        // 震屏上限 [px]
    shakeDecay: 40,                      // 震屏每秒衰减量 [px]
    hitstopScale: 0.06,                  // 顿帧时游戏时间倍率
    hitstopMax: 0.12,                    // 顿帧时长上限（秒）；多座塔同时触发取最大值
    numberMax: 80,                       // 同屏伤害数字上限，超出丢弃最旧的
    number: { size: 19, critSize: 34, life: 0.75, critLife: 1, rise: 70, critRise: 95 },
    stain: { fadeInterval: 0.5, fadeRate: 0.035 },
    shard: { life: 0.7, gravity: 520 },
    combo: { window: 1.6, minShow: 3, sealAt: 25, bannerLife: 1.4 },
    // 连斩朱印：达到 at 连斩时盖印
    COMBO_MARKS: [
      { at: 25, text: '一气呵成' },
      { at: 60, text: '势如破竹' },
      { at: 120, text: '所向披靡' },
    ],
    // 击杀着色：火杀偏焦褐，水杀偏靛青，其余用浓墨
    killTint: { fire: '#5a2a1c', water: '#22445c' },
    heavyKill: { shake: 7, hitstop: 0.06, ringR: 70 },   // 重敌（weight > 1）击杀
  },
});

// speedPx → speed（格/秒）
for (const key of Object.keys(CONFIG.ENEMIES)) {
  const e = CONFIG.ENEMIES[key];
  if (typeof e.speedPx === 'number') {
    e.speed = e.speedPx * CONFIG.GLYPH_SCALE / CONFIG.CELL_SIZE;
    if (typeof e.size === 'number') e.drawSize = Math.round(e.size * CONFIG.GLYPH_SCALE);
  }
}
