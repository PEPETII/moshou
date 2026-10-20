// UI：信息面板里的合成区（2026-10-20 融合系统重建）
//
// 塔防 #tower-info 与征服 #conquest-tower-info 共用。选中塔后列出它能参与的配方，
// 每条一个「合」按钮：不满足条件时按钮置灰，并在下方写出原因（冷却、墨水、缺相邻素材、占位）。
// 面板打开期间每 250ms 重新校验一次，冷却与墨水变化能即时反映；校验与结算都走 Fusion（js/core/fusion.js）。
const FusionPanel = {
  _timer: 0,

  stop() {
    if (this._timer) clearInterval(this._timer);
    this._timer = 0;
  },

  // panel：信息面板根节点；opts.notify(msg, type) 失败提示；opts.onDone(newTower) 合成成功回调
  render(panel, game, tower, opts = {}) {
    this.stop();
    const box = panel && panel.querySelector('.info-fusion');
    if (!box) return;
    const recipes = typeof Fusion !== 'undefined' ? Fusion.recipesFor(tower.type) : [];
    box.innerHTML = '';
    box.hidden = recipes.length === 0;
    if (!recipes.length) return;

    const rows = recipes.map((recipe) => {
      const result = CONFIG.TOWERS[recipe.result];
      const row = document.createElement('div');
      row.className = 'fusion-row';
      row.innerHTML = `
        <button type="button" class="fusion-btn" data-result="${recipe.result}">
          <span class="fusion-btn__seal">合</span>
          <span class="fusion-btn__char fusion-btn__char--${recipe.result}">${result.char}</span>
          <span class="fusion-btn__cost">${recipe.cost} 墨</span>
        </button>
        <div class="fusion-row__formula">${recipe.formula}</div>
        <div class="fusion-row__reason" aria-live="polite"></div>`;
      const btn = row.querySelector('.fusion-btn');
      btn.addEventListener('click', () => {
        const res = Fusion.perform(game, tower, recipe);
        if (!res.ok) {
          if (opts.notify) opts.notify(res.reason, 'warning');
          refresh();
          return;
        }
        this.stop();
        if (opts.notify) opts.notify(`合成「${result.char}」`, 'success');
        if (opts.onDone) opts.onDone(res.tower);
      });
      box.appendChild(row);
      return { recipe, btn, reason: row.querySelector('.fusion-row__reason') };
    });

    const refresh = () => {
      // 面板被隐藏或塔已不在场上：停止轮询
      if (panel.classList.contains('hidden') || !game.towers.includes(tower)) { this.stop(); return; }
      for (const r of rows) {
        const v = Fusion.check(game, tower, r.recipe);
        r.btn.disabled = !v.ok;
        r.btn.setAttribute('aria-disabled', String(!v.ok));
        r.reason.textContent = v.ok ? '' : v.reason;
      }
    };
    refresh();
    this._timer = setInterval(refresh, 250);
  },
};
