// UI：合字图鉴（2026-10-20 融合系统重建）
// 与炮塔志同一套双栏：左列表、右详情。全部合字开放；另读本机记录标出「已亲手合成」。
// 文案读 CONFIG.CODEX.towers / CONFIG.CODEX.fusion，公式与花费读 CONFIG.FUSION.recipes。

UI.prototype.showFusionEncyclopedia = function() {
    this.setCodexPageVisible("encyclopedia-container", false);
    this.setCodexPageVisible("fusion-encyclopedia-container", true);
    this.populateFusionEncyclopedia();
};

UI.prototype.hideFusionEncyclopedia = function() {
    CodexGlyph.stop();
    this.setCodexPageVisible("fusion-encyclopedia-container", false);
};

UI.prototype.populateFusionEncyclopedia = function() {
    const texts = CONFIG.CODEX.fusion;
    const seen = typeof Fusion !== "undefined" ? Fusion.seen() : new Set();
    const entries = (CONFIG.FUSION ? CONFIG.FUSION.recipes : [])
      .filter((r) => CONFIG.TOWERS[r.result])
      .map((r) => {
        const config = CONFIG.TOWERS[r.result];
        return {
          key: r.result, char: config.char, name: config.char, tint: r.result,
          role: r.formula, tag: seen.has(r.result) ? texts.seen : texts.open,
        };
      });
    this.renderCodexList("fusion-encyclopedia-grid", "fusion-detail-panel", entries,
      (type) => this.showFusionDetail(type));
};

// 素材印：本身是合字的素材（如焚里的林）另注它的来历
UI.prototype.fusionMaterialChip = function(type) {
    const config = CONFIG.TOWERS[type];
    return `<span class="ink-chip ink-chip--${type}" title="${config.char}">${config.char}</span>`;
};

UI.prototype.showFusionDetail = function(type) {
    const panel = document.getElementById("fusion-detail-panel");
    const config = CONFIG.TOWERS[type];
    const recipe = typeof Fusion !== "undefined" ? Fusion.recipeOf(type) : null;
    if (!panel || !config || !recipe) return;
    const texts = CONFIG.CODEX.fusion;
    const codex = CONFIG.CODEX.towers[type] || { moves: [] };
    const glyph = CONFIG.GLYPHS[type];
    const seen = Fusion.seen().has(type);

    const formula = recipe.materials.map((m) => this.fusionMaterialChip(m))
      .join('<span class="codex-formula__op">＋</span>')
      + `<span class="codex-formula__op">→</span>${this.fusionMaterialChip(type)}`;
    const notes = recipe.materials
      .filter((m, i, all) => all.indexOf(m) === i && Fusion.recipeOf(m))
      .map((m) => `「${CONFIG.TOWERS[m].char}」本身由 ${Fusion.recipeOf(m).formula.split(" →")[0]} 合成`)
      .join("；");
    const strokes = glyph.strokes.map((s, i) => `<li data-stroke="${i}">${s.name}</li>`).join("");
    const moves = codex.moves.map((m) => `
        <div class="codex-move">
          <span class="codex-move__kind">${m.kind}</span>
          <span class="codex-move__name codex-move__name--${type}">${m.name}</span>
          <p class="codex-move__text">${m.text}</p>
        </div>`).join("");

    panel.innerHTML = `
      <div class="codex-detail__head">
        <figure class="codex-glyph">
          <canvas class="codex-glyph__canvas" aria-label="${config.char}字笔顺书写" title="轻点重写"></canvas>
          <ol class="codex-glyph__order">${strokes}</ol>
        </figure>
        <div class="codex-detail__summary">
          <h3 class="ink-panel__title">${config.char}<span class="codex-detail__role">${codex.role || ""}</span></h3>
          ${this.codexStat("状态", seen ? texts.seen : texts.open, "", true)}
          ${this.codexStat("合成花费", recipe.cost, "墨")}
          ${this.codexStat("合成冷却", CONFIG.FUSION.cooldown, "秒")}
          ${this.codexStat("射程", config.range.toFixed(1), "格")}
        </div>
      </div>
      <div class="codex-formula" aria-label="合成公式 ${recipe.formula}">${formula}
        ${notes ? `<span class="codex-formula__note">${notes}</span>` : ""}
      </div>
      <div class="codex-moves">${moves}</div>
      <p class="codex-howto">${texts.howTo}</p>`;

    const canvas = panel.querySelector(".codex-glyph__canvas");
    const order = [...panel.querySelectorAll(".codex-glyph__order li")];
    const write = () => CodexGlyph.play(canvas, glyph, {
      color: CONFIG.GLYPH_COLORS[type],
      onStroke: (i) => order.forEach((li, k) => {
        li.classList.toggle("is-writing", k === i);
        li.classList.toggle("is-done", i === -1 || k < i);
      }),
    });
    this.addTrackedEventListener(canvas, "click", write);
    write();
};
