// 各张上架美术图的构图参数（坐标为画布宽高的比例）。构图语法见 tableau.js，规范见 docs/上架素材美术规范.md。
const FAR = '86,100,100';   // 远山青灰，与地图远景同源

const LAYOUTS = {
  // 宣传图 16:9：标题落左三分区，妖潮从右上远山雾中沿墨廊蜿蜒而下，火字塔镇在右下近景
  promo: {
    w: 1920, h: 1080, seed: 17,
    mountains: [
      { y0: 0.38, y1: 0.6, amp: 0.2, ink: 0.12, tint: FAR, blur: 5, seed: 4, crest: 2, peaks: [[0.74, 0.7, 0.07], [0.88, 0.4, 0.06], [0.42, 0.3, 0.12]] },
      { y0: 0.5, y1: 0.7, amp: 0.12, ink: 0.2, blur: 1.5, seed: 9, crest: 3, peaks: [[0.6, 0.45, 0.05], [0.97, 0.6, 0.06]] },
    ],
    mist: [[0.47, 0.07, 0.6, 3], [0.62, 0.05, 0.45, 6]],
    path: [[0.62, 0.46], [0.75, 0.5], [0.87, 0.555], [0.8, 0.615], [0.6, 0.655], [0.45, 0.735], [0.44, 0.87], [0.56, 1.08]],
    width: [0.012, 0.15], widthPow: 1.4,
    horde: { from: 0.02, to: 0.8, count: 52, shadow: 1.4, maxSize: 0.05, bias: 0.75 },
    boss: { chars: '百鬼夜行', t: 0.4, scale: 1.12, dx: -0.03, dy: -0.045 },
    mistOverPath: [[0.63, 0.47, 0.1, 0.045, 0.75]],
    towers: [
      { type: 'fire', at: [0.81, 0.83], size: 0.28, ring: 0.6, ringAlpha: 0.22, glowAlpha: 0.5, rewrite: { 1: 0.55 } },
      { type: 'water', at: [0.935, 0.63], size: 0.13, ring: 0.45, ringAlpha: 0.3, glowAlpha: 0.4, rewrite: { 3: 0.45 } },
      { type: 'thunder', at: [0.3, 0.75], size: 0.12, ring: 0.3, ringAlpha: 0.3, glowAlpha: 0.6, color: '#2a2638' },
    ],
    shots: [
      { from: 0, stroke: 1, boss: true, bend: 0.12, from0: 0.2, to: 0.74, dx: 0.035, dy: 0.03, scale: 0.75 },
      { from: 0, stroke: 0, nth: 1, bend: -0.1, from0: 0.2, to: 0.68, scale: 0.75 },
      { from: 0, kind: 'fire', nth: 3, bend: 0.3, from0: 0.55, to: 0.95, width: 0.03, hit: true },
      { from: 2, kind: 'thunder', nth: 0, minT: 0.6 },
      { from: 1, stroke: 3, nth: 0, bend: -0.25, from0: 0.2, to: 0.72, scale: 0.9, trail: 'waterLight', minT: 0.1 },
    ],
    fore: [
      { kind: 'rock', at: [1.0, 1.03], w: 0.5, h: 0.17, ink: 0.65 },
      { kind: 'orchid', at: [0.955, 1.0], h: 0.3, lean: -0.6, blades: 8 },
      { kind: 'orchid', at: [0.04, 1.01], h: 0.22, lean: 0.5, blades: 6, color: 'rgba(29,27,24,0.55)' },
    ],
    splashes: [[0.66, 0.97, -2.4, 0.022, 0.75], [0.23, 0.95, -0.4, 0.012, 0.55]],
    vignette: 0.24,
    title: { x: 0.14, y: 0.12, size: 0.17, vertical: true, wash: 0.1 },
  },

  // 游戏库壁纸 3840×1240：禁文字（无标题、无印章）；左 35% 是公告 UI 安全区，只放远山与雾；
  // 妖潮在远处只成墨影，主体是右侧的三座塔字与飞出的笔画
  wallpaper: {
    w: 3840, h: 1240, seed: 23,
    mountains: [
      { y0: 0.42, y1: 0.66, amp: 0.26, ink: 0.11, tint: FAR, blur: 7, seed: 12, crest: 3, freq: 1.6, peaks: [[0.14, 0.5, 0.05], [0.24, 0.3, 0.04], [0.58, 0.55, 0.05], [0.8, 0.35, 0.06]] },
      { y0: 0.54, y1: 0.76, amp: 0.16, ink: 0.18, blur: 2.5, seed: 14, crest: 4, freq: 1.4, peaks: [[0.06, 0.45, 0.04], [0.42, 0.35, 0.04], [0.95, 0.5, 0.05]] },
    ],
    mist: [[0.55, 0.08, 0.7, 7], [0.72, 0.06, 0.55, 8], [0.88, 0.07, 0.5, 9]],
    path: [[0.4, 0.55], [0.5, 0.58], [0.6, 0.62], [0.56, 0.69], [0.62, 0.77], [0.75, 0.8], [0.86, 0.9], [0.9, 1.1]],
    width: [0.006, 0.075], widthPow: 1.3,
    horde: { from: 0.03, to: 0.62, count: 60, shadow: 1.6, maxSize: 0.022, bias: 0.9, soft: 3 },
    mistOverPath: [[0.42, 0.56, 0.08, 0.06, 0.8]],
    towers: [
      { type: 'fire', at: [0.775, 0.6], size: 0.4, ring: 0.6, ringAlpha: 0.2, glowAlpha: 0.5, rewrite: { 0: 0.5 } },
      { type: 'ice', at: [0.92, 0.5], size: 0.2, ring: 0.4, ringAlpha: 0.25, glowAlpha: 0.5 },
      { type: 'wood', at: [0.64, 0.86], size: 0.2, ring: 0.5, ringAlpha: 0.25, glowAlpha: 0.4, color: '#24301f' },
    ],
    shots: [
      { from: 0, stroke: 0, nth: 0, bend: 0.1, from0: 0.15, to: 0.66, scale: 0.7, minT: 0.45 },
      { from: 0, kind: 'fire', nth: 2, bend: -0.2, from0: 0.55, to: 0.95, width: 0.025, hit: true, minT: 0.4 },
      { from: 1, kind: 'ice', nth: 0, bend: 0.15, from0: 0.3, to: 0.92, width: 0.05, hit: true, minT: 0.5 },
    ],
    fore: [
      { kind: 'rock', at: [1.0, 1.04], w: 0.62, h: 0.22, ink: 0.6 },
      { kind: 'orchid', at: [0.975, 1.0], h: 0.36, lean: -0.7, blades: 9 },
      { kind: 'orchid', at: [0.5, 1.02], h: 0.16, lean: 0.3, blades: 5, color: 'rgba(29,27,24,0.4)' },
    ],
    splashes: [[0.7, 0.97, -2.5, 0.03, 0.7]],
    vignette: 0.22,
  },

  // 横版封面 920×430（2 倍于 460×215）：左侧 Logo 标题，右侧火字塔与妖潮
  coverH: {
    w: 920, h: 430, seed: 31,
    mountains: [
      { y0: 0.5, y1: 0.75, amp: 0.3, ink: 0.13, tint: FAR, blur: 2.5, seed: 21, crest: 1.5, peaks: [[0.75, 0.5, 0.08]] },
      { y0: 0.64, y1: 0.85, amp: 0.15, ink: 0.18, blur: 1, seed: 22, crest: 2 },
    ],
    mist: [[0.62, 0.08, 0.6, 5]],
    path: [[0.56, 0.6], [0.7, 0.62], [0.82, 0.66], [0.74, 0.74], [0.6, 0.8], [0.62, 0.95], [0.72, 1.1]],
    width: [0.01, 0.13], widthPow: 1.3,
    horde: { from: 0.03, to: 0.7, count: 30, shadow: 1.3, maxSize: 0.045, bias: 0.85 },
    boss: { chars: '百鬼夜行', t: 0.3, scale: 0.95, dx: -0.04, dy: -0.05 },
    towers: [
      { type: 'fire', at: [0.855, 0.74], size: 0.4, ring: 0.6, ringAlpha: 0.22, glowAlpha: 0.5, rewrite: { 1: 0.5 } },
    ],
    shots: [{ from: 0, stroke: 1, boss: true, bend: 0.15, from0: 0.2, to: 0.7, scale: 0.75, dx: 0.04, dy: 0.04 }],
    fore: [{ kind: 'orchid', at: [0.02, 1.02], h: 0.32, lean: 0.6, blades: 6, color: 'rgba(29,27,24,0.6)' }],
    vignette: 0.2,
    title: { x: 0.06, y: 0.42, size: 0.25, wash: 0.1 },
  },

  // 竖版封面 1200×1800（2 倍于 600×900）：标题竖排右上，首领在雾中，墨廊盘旋而下到近景火字塔
  coverV: {
    w: 1200, h: 1800, seed: 41,
    mountains: [
      { y0: 0.34, y1: 0.5, amp: 0.13, ink: 0.13, tint: FAR, blur: 5, seed: 31, crest: 2, peaks: [[0.3, 0.6, 0.1], [0.55, 0.3, 0.07]] },
      { y0: 0.42, y1: 0.58, amp: 0.07, ink: 0.2, blur: 1.5, seed: 33, crest: 3, peaks: [[0.15, 0.5, 0.08]] },
    ],
    mist: [[0.41, 0.04, 0.7, 4], [0.5, 0.03, 0.5, 5]],
    path: [[0.36, 0.4], [0.2, 0.45], [0.42, 0.5], [0.72, 0.56], [0.55, 0.63], [0.25, 0.7], [0.32, 0.8], [0.6, 0.88], [0.75, 1.05]],
    width: [0.012, 0.22], widthPow: 1.35,
    horde: { from: 0.02, to: 0.75, count: 50, shadow: 1.4, maxSize: 0.075, bias: 0.8 },
    boss: { chars: '百鬼夜行', t: 0.3, scale: 1.3, dx: 0.0, dy: -0.012 },
    mistOverPath: [[0.36, 0.41, 0.15, 0.03, 0.8]],
    towers: [
      { type: 'fire', at: [0.7, 0.8], size: 0.2, ring: 0.6, ringAlpha: 0.22, glowAlpha: 0.5, rewrite: { 1: 0.5 } },
      { type: 'water', at: [0.82, 0.56], size: 0.085, ring: 0.4, ringAlpha: 0.25, glowAlpha: 0.4 },
      { type: 'thunder', at: [0.13, 0.86], size: 0.085, ring: 0.3, ringAlpha: 0.25, glowAlpha: 0.6, color: '#2a2638' },
    ],
    shots: [
      { from: 0, stroke: 1, boss: true, bend: -0.1, from0: 0.15, to: 0.72, scale: 0.75, dx: 0.06, dy: 0.02 },
      { from: 0, kind: 'fire', nth: 0, bend: 0.25, from0: 0.5, to: 0.94, width: 0.03, hit: true, minT: 0.55 },
      { from: 2, kind: 'thunder', nth: 0, minT: 0.6 },
    ],
    fore: [
      { kind: 'rock', at: [0.02, 1.02], w: 0.25, h: 0.1, ink: 0.6 },
      { kind: 'orchid', at: [0.05, 1.0], h: 0.17, lean: 0.6, blades: 7 },
    ],
    vignette: 0.22,
    title: { x: 0.8, y: 0.06, size: 0.1, vertical: true, wash: 0.1 },
  },
};
