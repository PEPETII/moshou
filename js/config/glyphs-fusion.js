// 字形弹道：炎、林、焚三座合字塔的字形与招式参数（2026-10-20）
//
// 加载顺序：glyphs.js、glyphs-ext.js 之后。
// 合字的笔画不手写坐标：按部件位置把素材字的笔画缩放、平移后拼起来（炎＝上下两火，
// 林＝左右两木，焚＝上林下火），这样素材字改了，合字自动跟随。
// 合字塔的招式参数独立配置，不由两份素材叠加推导。
(function composeFusionGlyphs() {
  // part = { glyph, x0, y0, sx, sy, tag }：字身坐标 x' = x0 + x × sx，y' = y0 + y × sy
  // 笔宽按两向缩放的均值略放大，免得部件缩小后笔画显得过细
  function compose(char, parts) {
    const strokes = [];
    for (const part of parts) {
      const wk = Math.min(1, (part.sx + part.sy) / 2 * 1.15);
      for (const st of part.glyph.strokes) {
        strokes.push({
          id: `${part.tag}-${st.id}`,
          name: st.name,
          pts: st.pts.map(([x, y]) => [part.x0 + x * part.sx, part.y0 + y * part.sy]),
          w: st.w.map((v) => v * wk),
        });
      }
    }
    return { char, strokes };
  }
  const G = CONFIG.GLYPHS;
  const lin = compose('林', [
    { glyph: G.wood, tag: 'L', x0: 0, y0: 4, sx: 0.52, sy: 0.92 },
    { glyph: G.wood, tag: 'R', x0: 48, y0: 4, sx: 0.52, sy: 0.92 },
  ]);
  Object.assign(G, {
    yan: compose('炎', [
      { glyph: G.fire, tag: 'T', x0: 12, y0: 0, sx: 0.76, sy: 0.5 },
      { glyph: G.fire, tag: 'B', x0: 6, y0: 48, sx: 0.88, sy: 0.52 },
    ]),
    lin,
    fen: compose('焚', [
      { glyph: lin, tag: 'T', x0: 6, y0: 0, sx: 0.88, sy: 0.5 },
      { glyph: G.fire, tag: 'B', x0: 10, y0: 50, sx: 0.8, sy: 0.5 },
    ]),
  });
})();

const GLYPH_MOVES_FUSION = {
  // 炎：瞬发火柱贯穿直线；两枚火字先后砸向两处敌群
  yan: {
    range: 230,              // [px]
    beamInterval: 0.5, beamDamage: [9, 13], beamRewrite: 0.35,
    beamWidth: 16,           // [px] 火柱判定半宽
    beamReach: 40,           // [px] 火柱比目标多伸出的长度
    beamIgnite: 2,           // 每次命中叠的灼烧层数
    beamChargeCap: 4,
    burnDuration: 2.6,
    chargePerSec: 0.1, chargePerHit: 0.006,
    bombFlight: 0.6,
    bombGap: 0.35,           // 第二枚比第一枚晚出手的秒数
    bombArc: 150,            // [px]
    bombDamage: 80,
    bombRadius: 115,         // [px]
    bombEdgeFalloff: 0.35,
    bombIgnite: 4,
    bombSeparation: 140,     // [px] 两处落点至少相隔
    markDuration: 2.5,
    markRadius: 90,          // [px]
    markDps: 22, markTick: 0.3,
    markGlyph: 170,          // [px]
    rewriteAll: 1.5,
    landMinS: 140,           // [px]
    landStep: 16,            // [px]
    landRangeMul: 1.2,
  },
  // 林：一次种两株木苗，木苗初触定身；成林定身射程内全部，林中被击杀者再生木苗
  lin: {
    range: 225,              // [px]
    seedInterval: 1, seedRewrite: 0.6,
    seedFlight: 0.45,
    seedArc: 55,             // [px]
    seedLead: 30,            // [px]
    seedSpread: 50,          // [px] 两株木苗的沿路间距
    sproutGrow: 0.6,
    sproutLife: 7,
    sproutRadius: 28,        // [px]
    sproutDps: 14, sproutTick: 0.4, sproutSlow: 0.3,
    sproutRoot: 0.35,        // 每只敌人第一次碰到木苗时被定身的秒数
    sproutMax: 8,
    chargePerSec: 0.09, chargePerHit: 0.008,
    forestDuration: 4,
    forestRoot: 1.4,
    forestDps: 12, forestTick: 0.4,
    rewriteAll: 1.5,
  },
  // 焚：抛出燃木落地成短时火场；燎原沿路双向蔓延，燃烧中被击杀者爆燃
  fen: {
    range: 230,              // [px]
    logInterval: 1, logRewrite: 0.6,
    logFlight: 0.6,
    logArc: 100,             // [px]
    logDamage: 18,
    logRadius: 55,           // [px]
    fireLife: 2.2,
    fireRadius: 55,          // [px]
    fireDps: 18, fireTick: 0.35, fireIgnite: 1,
    burnDuration: 2.6,
    chargePerSec: 0.09, chargePerHit: 0.02,
    blazeFlight: 0.6,
    blazeArc: 120,           // [px]
    blazeSpeed: 140,         // [px/s] 每个方向的蔓延速度
    blazeLength: 260,        // [px] 每个方向最远
    blazeBurn: 3,            // 每段路被点燃后燃烧的秒数
    blazeWidth: 30,          // [px] 火带半宽
    blazeDps: 20, blazeTick: 0.35, blazeIgnite: 2,
    explodeRadius: 60,       // [px] 燃烧中被击杀者爆燃的半径
    explodeDamage: 20, explodeIgnite: 2,
    rewriteAll: 1.8,
    landMinS: 120,           // [px]
    landStep: 16,            // [px]
    landRangeMul: 1.2,
  },
};

applyGlyphMoves(GLYPH_MOVES_FUSION, {
  yan: ['range', 'beamWidth', 'beamReach', 'bombArc', 'bombRadius', 'bombSeparation', 'markRadius', 'markGlyph',
    'landMinS', 'landStep'],
  lin: ['range', 'seedArc', 'seedLead', 'seedSpread', 'sproutRadius'],
  fen: ['range', 'logArc', 'logRadius', 'fireRadius', 'blazeArc', 'blazeSpeed', 'blazeLength', 'blazeWidth',
    'explodeRadius', 'landMinS', 'landStep'],
});
