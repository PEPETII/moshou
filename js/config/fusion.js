// 融合（合字）配置（2026-10-20 重建）
//
// 选中一座塔，若相邻格里有另一份素材，即可花墨把两座塔合成一座合字塔。
// 映射只在这里维护；合字塔自身的造价、招式、字形分别在 domain-02.js、glyphs-fusion.js。
// 加载顺序：domain-02.js 之后。
Object.assign(CONFIG, {
  FUSION: {
    cooldown: 6,             // 全局合成冷却（秒）：任意两次合成至少相隔
    adjacency: 1,            // 两份素材的格距上限（切比雪夫距离：1 = 周围 8 格）
    storageKey: 'moshou_fusion_seen',   // 本机合成过的合字（图鉴「已亲手合成」标记）
    // materials 不分先后；result 落在被选中那座塔所在格，另一格腾空
    recipes: [
      { result: 'yan', materials: ['fire', 'fire'], cost: 80, formula: '火 + 火 → 炎' },
      { result: 'lin', materials: ['wood', 'wood'], cost: 80, formula: '木 + 木 → 林' },
      { result: 'fen', materials: ['lin', 'fire'], cost: 120, formula: '林 + 火 → 焚' },
    ],
  },
});
