// 【过时提示】本脚本按字形弹道重构（2026-10-19）之前的玩法编写（多塔种、融合、48px 网格、手动开波次），
// 未随重构更新，当前不保证可运行；需要时请参照 docs/完成报告/2026-10-19-字形弹道玩法引入-总报告.md 的后续工作重写。
// 宣传片时间表与舞台几何：画面（storyboard.js）与音乐（record-music.js）共用，保证音画对齐。
(function (root) {
  const COLORS = {
    paper: '#f4efe4', ink: '#1c1a17', path: '#8a8377', pathEdge: '#6a6459', core: '#c45c48', coreDark: '#8b3a2f',
    fire: '#ff6d00', water: '#039be5', thunder: '#b388ff', wood: '#66a06a', gold: '#ffb300',
    ice: '#4fc3f7', wind: '#78909c', light: '#f6d84c', dark: '#7c4dff',
  };

  // 敌人行进路径（世界坐标，舞台 1920x1080；左侧入口在屏幕外，终点是朱砂核心）
  const PATH = [[-80, 800], [380, 800], [380, 380], [900, 380], [900, 800], [1400, 800], [1400, 480], [1780, 480]];

  // 炮塔：落位时刻 t 由序号生成（见 TOWER_START / TOWER_STEP）
  const TOWERS = [
    { id: 'f1', glyph: '火', color: COLORS.fire, x: 250, y: 620, kind: 'fire' },
    { id: 'f2', glyph: '火', color: COLORS.fire, x: 250, y: 480, kind: 'fire' },
    { id: 'i1', glyph: '冰', color: COLORS.ice, x: 560, y: 600, kind: 'ice' },
    { id: 'i2', glyph: '冰', color: COLORS.ice, x: 700, y: 600, kind: 'ice' },
    { id: 't1', glyph: '雷', color: COLORS.thunder, x: 620, y: 250, kind: 'thunder' },
    { id: 't2', glyph: '雷', color: COLORS.thunder, x: 760, y: 250, kind: 'thunder' },
    { id: 'w1', glyph: '水', color: COLORS.water, x: 1050, y: 620, kind: 'water' },
    { id: 'd1', glyph: '风', color: COLORS.wind, x: 1200, y: 620, kind: 'wind' },
    { id: 'g1', glyph: '金', color: COLORS.gold, x: 1100, y: 360, kind: 'gold' },
    { id: 'm1', glyph: '木', color: COLORS.wood, x: 1560, y: 650, kind: 'wood' },
    { id: 'l1', glyph: '光', color: COLORS.light, x: 1560, y: 330, kind: 'light' },
    { id: 'k1', glyph: '暗', color: COLORS.dark, x: 1700, y: 650, kind: 'dark' },
  ];
  const TOWER_START = 6.4;
  const TOWER_STEP = 0.5;
  TOWERS.forEach((t, i) => { t.t = TOWER_START + i * TOWER_STEP; });

  // 合字特写：两座同类塔在时刻 t 融合
  const FUSIONS = [
    { t: 24.2, a: 'f1', b: 'f2', glyph: '炎', from: '火', color: COLORS.fire, wash: '#ffd7b0' },
    { t: 27.4, a: 't1', b: 't2', glyph: '霆', from: '雷', color: COLORS.thunder, wash: '#e3d6ff' },
    { t: 30.6, a: 'i1', b: 'i2', glyph: '凌', from: '冰', color: COLORS.ice, wash: '#d4f1fb' },
  ];

  const T = {
    duration: 46,
    fps: 30,
    drop: 1.0,            // 墨滴落纸
    pathStart: 2.4,       // 路径开始起笔
    pathEnd: 5.8,
    mountains: [3.4, 6.4],
    waveStart: 12.0,      // 第一波敌人
    bossSpawn: 33.2,
    bossDeath: 38.2,
    titleStart: 39.4,
    colors: COLORS, path: PATH, towers: TOWERS, fusions: FUSIONS,

    // 音乐：场景与强度的时间表（秒）。scene 取 audio-bgm.js 的 menu/prep/battle/result。
    musicScenes: [
      { t: 0, scene: 'menu', theme: 0 },
      { t: 6.0, scene: 'prep', theme: 1 },
      { t: 12.0, scene: 'battle', theme: 1 },
      { t: 38.8, scene: 'result', theme: 1 },
    ],
    musicIntensity: [[12, 0.2], [17, 0.4], [22, 0.6], [30, 0.8], [33.2, 1.0], [38.4, 0.3]],
    // 音效（与画面同刻）
    cues: [
      { t: 1.0, name: 'place' },
      ...TOWERS.map((tw) => ({ t: tw.t, name: 'place' })),
      { t: 12.0, name: 'wave' },
      ...FUSIONS.map((f) => ({ t: f.t + 0.9, name: 'fusion' })),
      { t: 33.2, name: 'wave' },
      { t: 38.2, name: 'death', opts: { variant: 'boss' } },
      { t: 38.9, name: 'victory' },
    ],
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = T;
  else root.PROMO_T = T;
})(typeof window !== 'undefined' ? window : globalThis);
