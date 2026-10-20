// UI：图鉴（工单 P2：图鉴横屏改版）
// 图鉴主界面 → 炮塔志 / 妖异录 / 合字图鉴（合字页见 codex-fusion.js）。两本谱都是常驻双栏：左列表、右详情；进入即选中第一项。
// 文案来自 CONFIG.CODEX，数值读 CONFIG.TOWERS / CONFIG.ENEMIES。

// === 事件 ===
UI.prototype.setupEncyclopediaEventListeners = function() {
    const on = (id, handler) => {
      const el = document.getElementById(id);
      if (el) this.addTrackedEventListener(el, "click", handler);
    };
    const toMenu = () => {
      CodexGlyph.stop();
      this.hideTowerEncyclopedia();
      this.hideEnemyEncyclopedia();
      this.hideFusionEncyclopedia();
      this.hideEncyclopedia();
    };

    on("btn-tower-encyclopedia", () => this.showTowerEncyclopedia());
    on("btn-enemy-encyclopedia", () => this.showEnemyEncyclopedia());
    on("back-to-menu-from-encyclopedia", () => this.hideEncyclopedia());
    on("back-to-encyclopedia-from-towers", () => { this.hideTowerEncyclopedia(); this.showEncyclopedia(); });
    on("back-to-encyclopedia-from-enemies", () => { this.hideEnemyEncyclopedia(); this.showEncyclopedia(); });
    on("btn-fusion-encyclopedia", () => this.showFusionEncyclopedia());
    on("back-to-encyclopedia-from-fusion", () => { this.hideFusionEncyclopedia(); this.showEncyclopedia(); });
    on("tower-codex-home", toMenu);
    on("enemy-codex-home", toMenu);
    on("fusion-codex-home", toMenu);

    // 列表键盘操作：上下方向键切换选中项
    ["tower-encyclopedia-grid", "enemy-encyclopedia-grid", "fusion-encyclopedia-grid"].forEach((id) => {
      const list = document.getElementById(id);
      if (!list) return;
      this.addTrackedEventListener(list, "keydown", (e) => {
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        const items = [...list.querySelectorAll(".ink-item")];
        const index = items.indexOf(document.activeElement);
        const next = items[index + (e.key === "ArrowDown" ? 1 : -1)];
        if (next) { e.preventDefault(); next.focus(); next.click(); }
      });
    });
};

// === 页面切换 ===
UI.prototype.setCodexPageVisible = function(id, visible) {
    const page = document.getElementById(id);
    if (page) page.classList.toggle("hidden", !visible);
};
UI.prototype.showEncyclopedia = function() {
    this.setMainMenuButtonsVisible(false);
    this.updateCodexTally();
    this.setCodexPageVisible("encyclopedia-container", true);
};
UI.prototype.hideEncyclopedia = function() {
    this.setMainMenuButtonsVisible(true);
    this.setCodexPageVisible("encyclopedia-container", false);
};
UI.prototype.showTowerEncyclopedia = function() {
    this.setCodexPageVisible("encyclopedia-container", false);
    this.setCodexPageVisible("tower-encyclopedia-container", true);
    this.populateTowerEncyclopedia();
};
UI.prototype.hideTowerEncyclopedia = function() {
    CodexGlyph.stop();
    this.setCodexPageVisible("tower-encyclopedia-container", false);
};
UI.prototype.showEnemyEncyclopedia = function() {
    this.setCodexPageVisible("encyclopedia-container", false);
    this.setCodexPageVisible("enemy-encyclopedia-container", true);
    this.populateEnemyEncyclopedia();
};
UI.prototype.hideEnemyEncyclopedia = function() {
    this.setCodexPageVisible("enemy-encyclopedia-container", false);
};

// 入口卡上的收录数
UI.prototype.updateCodexTally = function() {
    const towers = CONFIG.ACTIVE_TOWERS.filter((t) => CONFIG.TOWERS[t]).length;
    const enemies = CONFIG.ACTIVE_ENEMIES.filter((t) => CONFIG.ENEMIES[t]).length;
    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    const fusions = (CONFIG.FUSION ? CONFIG.FUSION.recipes : []).length;
    set("codex-count-towers", `已录 ${towers} 字`);
    set("codex-count-enemies", `已录 ${enemies} 种`);
    set("codex-count-fusion", `已录 ${fusions} 字`);
    set("codex-tally", `共 ${towers + enemies + fusions} 条`);
};

// === 列表 ===
// entries: [{ key, char, name, role, tag, tint }]；onSelect(key)
UI.prototype.renderCodexList = function(listId, detailId, entries, onSelect) {
    const list = document.getElementById(listId);
    const detail = document.getElementById(detailId);
    if (!list || !detail) return;
    list.innerHTML = "";

    if (entries.length === 0) {
      detail.innerHTML = `<div class="ink-empty"><span class="ink-empty__mark">空</span>此卷尚无收录</div>`;
      return;
    }

    const select = (item, key) => {
      list.querySelectorAll(".ink-item").forEach((other) => {
        const on = other === item;
        other.classList.toggle("is-selected", on);
        other.setAttribute("aria-selected", String(on));
        other.tabIndex = on ? 0 : -1;
      });
      onSelect(key);
    };

    entries.forEach((entry, i) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "ink-item codex-item";
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", "false");
      item.tabIndex = -1;
      item.dataset.type = entry.key;
      item.innerHTML = `
        <span class="ink-chip${entry.tint ? " ink-chip--" + entry.tint : ""}">${entry.char}</span>
        <span class="codex-item__text">
          <span class="codex-item__name">${entry.name}</span>
          <span class="codex-item__role">${entry.role}</span>
        </span>
        <span class="codex-item__tag">${entry.tag}</span>`;
      this.addTrackedEventListener(item, "click", () => select(item, entry.key));
      list.appendChild(item);
      if (i === 0) select(item, entry.key);
    });
};

UI.prototype.codexStat = function(label, value, unit = "", seal = false) {
    return `<div class="ink-stat"><span class="ink-stat__label">${label}</span>` +
      `<span class="ink-stat__value${seal ? " ink-stat__value--seal" : ""}">${value}` +
      `${unit ? `<span class="ink-stat__unit">${unit}</span>` : ""}</span></div>`;
};

// === 炮塔志 ===
UI.prototype.populateTowerEncyclopedia = function() {
    const entries = CONFIG.ACTIVE_TOWERS
      .filter((type) => CONFIG.TOWERS[type])
      .map((type) => {
        const config = CONFIG.TOWERS[type];
        const codex = (CONFIG.CODEX.towers[type] || {});
        return {
          key: type, char: config.char, name: config.char, tint: type,
          role: codex.role || "", tag: `${config.cost} 墨`,
        };
      });
    this.renderCodexList("tower-encyclopedia-grid", "tower-detail-panel", entries,
      (type) => this.showTowerDetail(type, CONFIG.TOWERS[type]));
};

UI.prototype.showTowerDetail = function(type, config) {
    const panel = document.getElementById("tower-detail-panel");
    if (!panel || !config) return;
    const codex = CONFIG.CODEX.towers[type] || { moves: [] };
    const glyph = CONFIG.GLYPHS && CONFIG.GLYPHS[type];
    // 元素色按塔类型取：有字形数据的塔用自己的主色，其余退回火色
    const tint = CONFIG.GLYPHS && CONFIG.GLYPHS[type] ? type : "fire";

    const strokes = glyph
      ? glyph.strokes.map((s, i) => `<li data-stroke="${i}">${s.name}</li>`).join("")
      : "";
    const moves = codex.moves.map((m) => `
        <div class="codex-move">
          <span class="codex-move__kind">${m.kind}</span>
          <span class="codex-move__name codex-move__name--${tint}">${m.name}</span>
          <p class="codex-move__text">${m.text}</p>
        </div>`).join("");

    panel.innerHTML = `
      <div class="codex-detail__head">
        <figure class="codex-glyph">
          ${glyph ? `<canvas class="codex-glyph__canvas" aria-label="${config.char}字笔顺书写" title="轻点重写"></canvas>
          <ol class="codex-glyph__order">${strokes}</ol>` :
          `<span class="codex-glyph__char">${config.char}</span>`}
        </figure>
        <div class="codex-detail__summary">
          <h3 class="ink-panel__title">${config.char}<span class="codex-detail__role">${codex.role || ""}</span></h3>
          ${this.codexStat("射程", config.range.toFixed(1), "格")}
          ${this.codexStat("造价", config.cost, "墨", true)}
          ${glyph ? this.codexStat("笔画", glyph.strokes.length, "笔") : ""}
        </div>
      </div>
      <div class="codex-moves">${moves || `<p class="codex-move__text">${config.desc || ""}</p>`}</div>`;

    if (!glyph) return;
    const canvas = panel.querySelector(".codex-glyph__canvas");
    const order = [...panel.querySelectorAll(".codex-glyph__order li")];
    const write = () => CodexGlyph.play(canvas, glyph, {
      color: CONFIG.GLYPH_COLORS[tint],
      onStroke: (i) => order.forEach((li, k) => {
        li.classList.toggle("is-writing", k === i);
        li.classList.toggle("is-done", i === -1 || k < i);
      }),
    });
    this.addTrackedEventListener(canvas, "click", write);
    write();
};

// === 妖异录 ===
UI.prototype.codexSpeedTier = function(speed) {
    const tier = CONFIG.CODEX.speedTiers.find((t) => speed >= t.min);
    return tier ? tier.label : "";
};

// 字数徽记：单 / 双 / 三 / 四
const CODEX_COUNT_BADGE = ["", "单", "双", "三", "四"];

UI.prototype.populateEnemyEncyclopedia = function() {
    const entries = CONFIG.ACTIVE_ENEMIES
      .filter((type) => CONFIG.ENEMIES[type])
      .map((type) => {
        const config = CONFIG.ENEMIES[type];
        const codex = CONFIG.CODEX.enemies[type] || {};
        const count = config.segments ? config.segments.length : 1;
        return {
          key: type, char: config.segments ? config.segments[0].char : config.char,
          name: config.name || config.char, role: codex.role || "",
          tag: `${CODEX_COUNT_BADGE[count] || ""}字 · ${config.hp} 血`,
          boss: config.tier === "boss",
        };
      });
    this.renderCodexList("enemy-encyclopedia-grid", "enemy-detail-panel", entries,
      (type) => this.showEnemyDetail(type, CONFIG.ENEMIES[type]));
    // 首领卡片用朱砂边框
    const list = document.getElementById("enemy-encyclopedia-grid");
    if (list) list.querySelectorAll(".ink-item").forEach((item) => {
      const e = CONFIG.ENEMIES[item.dataset.type];
      item.classList.toggle("codex-item--boss", !!(e && e.tier === "boss"));
    });
};

UI.prototype.showEnemyDetail = function(type, config) {
    const panel = document.getElementById("enemy-detail-panel");
    if (!panel || !config) return;
    const codex = CONFIG.CODEX.enemies[type] || {};
    const speed = Math.round(config.speed * 100) / 100;
    const count = config.segments ? config.segments.length : 1;
    const name = config.name || config.char;
    // 多字敌人把各字并排显示；单字直接显示
    const glyphs = config.segments
      ? config.segments.map((s) => `<span class="codex-glyph__char codex-glyph__char--seg">${s.char}</span>`).join("")
      : `<span class="codex-glyph__char">${config.char}</span>`;
    const traits = (codex.traits || []).map((m) => `
        <div class="codex-move">
          <span class="codex-move__kind">${m.kind}</span>
          <span class="codex-move__name codex-move__name--fire">${m.name}</span>
          <p class="codex-move__text">${m.text}</p>
        </div>`).join("");

    panel.innerHTML = `
      <div class="codex-detail__head">
        <figure class="codex-glyph codex-glyph--enemy${count > 1 ? " codex-glyph--multi" : ""}">${glyphs}</figure>
        <div class="codex-detail__summary">
          <h3 class="ink-panel__title">${name}<span class="codex-badge${config.tier === "boss" ? " codex-badge--boss" : ""}">${CODEX_COUNT_BADGE[count] || ""}字</span><span class="codex-detail__role">${codex.role || ""}</span></h3>
          ${this.codexStat("生命", config.hp, "血")}
          ${this.codexStat("移速", speed, `格/秒 · ${this.codexSpeedTier(config.speed)}`)}
          ${this.codexStat("撞核", config.tier === "boss" ? "—" : config.damage, config.tier === "boss" ? "" : "点")}
          ${this.codexStat("击败奖励", config.reward, "墨", true)}
        </div>
      </div>
      <p class="codex-detail__desc">${codex.desc || ""}</p>
      ${traits ? `<div class="codex-moves">${traits}</div>` : ""}`;
};
