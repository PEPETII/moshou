// CONFIG 领域注册
Object.assign(CONFIG, {  // 上下各4行 + 中间1行路 = 9行

  TOWERS: {
    // 现役四塔：数值与招式参数由 js/config/glyphs.js 注入（range/size 会按 GLYPH_SCALE 复核）
    fire: {
      char: "火",
      cost: 120,
      size: 68,
      desc: "普攻「火星」：左右两点轮流化作追踪火星，叠加灼烧。大招「焚」：整字掷出，落地炸开，留下燃烧的火字焦土（蓄满自动释放）。",
    },
    water: {
      char: "水",
      cost: 100,
      size: 68,
      desc: "普攻「水箭」：竖钩拉成水柱，贯穿、击退并打湿减速。大招「潮」：三笔化浪沿路倒卷，卷入敌人后落下并眩晕（蓄满自动释放）。",
    },
    earth: {
      char: "土",
      cost: 150,
      size: 68,
      desc: "普攻「落石」：上横化作石片直线掷出，命中后碎石四溅。大招「陷」：整字砸下，范围内敌人受伤定身，地面留「土」字陷坑持续碾压（蓄满自动释放）。",
    },
    wood: {
      char: "木",
      cost: 105,
      size: 68,
      desc: "普攻「木刺」：撇笔化作木刺直线射出，可贯穿至多三名敌人。大招「森」：整字砸向群敌，落地炸开一圈木刺并把敌人推开（蓄满自动释放）。",
    },
  },

  // 字形弹道玩法（工单 02/05，2026-10-19 加入土，2026-10-20 加入木）：当前开放的塔池。
  // 其余单字塔已于 2026-10-20 连同旧攻击链一并删除，仅留档在 docs/legacy-towers.md。
  ACTIVE_TOWERS: ['fire', 'water', 'earth', 'wood'],
  // 出场敌人 ACTIVE_ENEMIES 在 config/glyph-battle.js（工单 04）
});
