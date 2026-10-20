// 融合（合字）逻辑：配方查询、校验与结算（2026-10-20 重建）
//
// 塔防（Game）与征服（ConquestGame）共用：两者都有 towers、ink、removeTower、updateUI；
// 塔防另有 runtimeIndexes，征服另有 _towerIndex，新增合字塔时分别维护。
// 冷却 game.fusionCd 由 GlyphSystem.tick 每帧递减。配方与数值见 js/config/fusion.js。
const Fusion = {
  recipes() { return (CONFIG.FUSION && CONFIG.FUSION.recipes) || []; },

  // type 能参与的全部配方
  recipesFor(type) {
    return this.recipes().filter((r) => r.materials.includes(type));
  },

  recipeOf(result) {
    return this.recipes().find((r) => r.result === result) || null;
  },

  // 配方里除去一份 type 之后剩下的那份素材
  partnerType(recipe, type) {
    const rest = recipe.materials.slice();
    rest.splice(rest.indexOf(type), 1);
    return rest[0];
  },

  // 相邻（切比雪夫距离 ≤ adjacency）格里最近的另一份素材
  findPartner(game, tower, recipe) {
    const want = this.partnerType(recipe, tower.type);
    const reach = CONFIG.FUSION.adjacency;
    let best = null;
    let bestD = Infinity;
    for (const o of game.towers) {
      if (o === tower || o.type !== want) continue;
      const d = Math.max(Math.abs(o.gx - tower.gx), Math.abs(o.gy - tower.gy));
      if (d <= reach && d < bestD) { bestD = d; best = o; }
    }
    return best;
  },

  // 校验：返回 { ok, reason, partner }；reason 是给玩家看的一句话
  check(game, tower, recipe) {
    const result = CONFIG.TOWERS[recipe.result];
    if (!result) return { ok: false, reason: '未知的合字' };
    if (game.gameEnded) return { ok: false, reason: '关卡已结束' };
    if (game.fusionCd > 0) return { ok: false, reason: `合成冷却中（${Math.ceil(game.fusionCd)} 秒）` };
    const partner = this.findPartner(game, tower, recipe);
    if (!partner) {
      const need = CONFIG.TOWERS[this.partnerType(recipe, tower.type)];
      return { ok: false, reason: `相邻格缺少「${need ? need.char : '?'}」` };
    }
    // 占位：合字塔落在被选塔所在格，路径塔与非路径塔不能互占
    if (!!result.onPath !== !!tower.onPath) return { ok: false, reason: `这一格放不下「${result.char}」`, partner };
    if (game.ink < recipe.cost) return { ok: false, reason: `墨水不足（需 ${recipe.cost} 墨）`, partner };
    return { ok: true, reason: null, partner };
  },

  // 结算：消耗两座素材塔与墨水，在被选塔的格子生成合字塔；返回 { ok, reason, tower }
  perform(game, tower, recipe) {
    const verdict = this.check(game, tower, recipe);
    if (!verdict.ok) return verdict;
    game.ink -= recipe.cost;
    const { gx, gy } = tower;
    game.removeTower(verdict.partner);
    game.removeTower(tower);
    const made = new Tower(recipe.result, gx, gy, game);
    game.towers.push(made);
    if (game.runtimeIndexes) game.runtimeIndexes.rebuildTowers();
    if (game._towerIndex) game._towerIndex.set(`${gx},${gy}`, made);
    game.fusionCd = CONFIG.FUSION.cooldown;
    this.markSeen(recipe.result);
    this.celebrate(made);
    if (typeof game.updateUI === 'function') game.updateUI();
    if (typeof window !== 'undefined' && window.InkAudio) window.InkAudio.play('place');
    return { ok: true, reason: null, tower: made };
  },

  celebrate(t) {
    if (typeof GlyphFX === 'undefined') return;
    const color = CONFIG.GLYPH_COLORS[t.type] || CONFIG.GLYPH_COLORS.ink;
    GlyphFX.ring(t.x, t.y, 80, color, 0.6, 8);
    GlyphFX.ring(t.x, t.y, 50, CONFIG.GLYPH_COLORS.seal, 0.45, 4);
    GlyphFX.emit(36, t.x, t.y, { color, speed: [80, 280], life: [0.3, 0.7], size: [1.5, 3.5], kind: 'ember', drag: 3 });
    GlyphFX.addShake(6);
  },

  // ---- 本机合成记录（图鉴「已亲手合成」标记）----
  seen() {
    try {
      const raw = window.localStorage.getItem(CONFIG.FUSION.storageKey);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch (e) {
      return new Set();
    }
  },

  markSeen(type) {
    try {
      const set = this.seen();
      if (set.has(type)) return;
      set.add(type);
      window.localStorage.setItem(CONFIG.FUSION.storageKey, JSON.stringify([...set]));
    } catch (e) {
      // 隐私模式或无存储：只是少一个标记，不影响合成
    }
  },
};
