// 敌潮选择弹窗（工单 04）：开局前选「稀 / 常 / 潮」，每次都默认选中「潮」，确认后才开始计时。
const DensityPicker = {
  _el: null,
  _selected: null,
  _onConfirm: null,
  _onCancel: null,
  _keyHandler: null,

  isOpen() {
    return !!(this._el && !this._el.classList.contains('hidden'));
  },

  _build() {
    if (this._el) return this._el;
    const root = document.createElement('div');
    root.id = 'density-picker';
    root.className = 'ink-veil hidden';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'density-picker-title');

    const box = document.createElement('div');
    box.id = 'density-picker-box';
    box.className = 'ink-scroll';

    const title = document.createElement('h2');
    title.id = 'density-picker-title';
    title.textContent = '敌潮';
    box.appendChild(title);

    const hint = document.createElement('p');
    hint.id = 'density-picker-hint';
    hint.textContent = '选定来犯之敌的疏密，确认后开始计时';
    box.appendChild(hint);

    // 本关敌人预览（工单 14 §2.4）：roster 里的敌人字、精英名、首领名，玩家可以提前准备阵容
    const preview = document.createElement('div');
    preview.id = 'density-picker-preview';
    preview.className = 'hidden';
    box.appendChild(preview);

    const row = document.createElement('div');
    row.id = 'density-picker-options';
    for (const key of Object.keys(CONFIG.DENSITY)) {
      const cfg = CONFIG.DENSITY[key];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'density-option';
      btn.dataset.density = key;
      btn.innerHTML =
        `<span class="density-label">${cfg.label}</span>` +
        `<span class="density-desc">${cfg.desc}</span>`;
      btn.addEventListener('click', () => this.select(key));
      row.appendChild(btn);
    }
    box.appendChild(row);

    const actions = document.createElement('div');
    actions.id = 'density-picker-actions';
    const back = document.createElement('button');
    back.type = 'button';
    back.id = 'density-picker-back';
    back.className = 'ink-btn';
    back.textContent = '返回';
    back.addEventListener('click', () => this._cancel());
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.id = 'density-picker-ok';
    ok.className = 'ink-btn ink-btn--primary';
    ok.textContent = '开战';
    ok.addEventListener('click', () => this._confirm());
    actions.appendChild(back);
    actions.appendChild(ok);
    box.appendChild(actions);

    root.appendChild(box);
    document.body.appendChild(root);
    this._el = root;
    return root;
  },

  /** 选中某一档（只改高亮，不开战） */
  select(key) {
    if (!CONFIG.DENSITY[key]) return;
    this._selected = key;
    if (!this._el) return;
    for (const btn of this._el.querySelectorAll('.density-option')) {
      const on = btn.dataset.density === key;
      btn.classList.toggle('selected', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  },

  /** 本关敌人预览：没有 roster 的关卡（征服）不显示 */
  setPreview(level) {
    const el = this._el && this._el.querySelector('#density-picker-preview');
    if (!el) return;
    if (!level || !level.roster) { el.classList.add('hidden'); el.innerHTML = ''; return; }
    const seen = new Set();
    const chars = [];
    for (const r of level.roster.concat(level.heavy || [])) {
      const c = CONFIG.ENEMIES[r.type];
      if (c && !seen.has(r.type)) { seen.add(r.type); chars.push(`<span class="density-enemy" title="${c.name || c.char}">${c.char}</span>`); }
    }
    const names = (list) => list.map((e) => (CONFIG.ENEMIES[e.type].name || CONFIG.ENEMIES[e.type].char));
    const elites = [...new Set(names(level.elites || []))];
    const boss = level.boss ? CONFIG.ENEMIES[level.boss.type].name : '';
    el.innerHTML =
      `<div class="density-row"><span class="density-row__label">来犯</span><span class="density-row__chars">${chars.join('')}</span></div>` +
      (elites.length ? `<div class="density-row"><span class="density-row__label">精英</span><span class="density-row__text">${elites.join('、')}</span></div>` : '') +
      (boss ? `<div class="density-row density-row--boss"><span class="density-row__label">首领</span><span class="density-row__text">${boss}</span></div>` : '');
    el.classList.remove('hidden');
  },

  /**
   * 打开弹窗。每次都重置为默认档位「潮」。
   * @param {(key:string)=>void} onConfirm 玩家点「开战」
   * @param {()=>void} [onCancel] 玩家点「返回」
   * @param {object} [level] 本关数据（塔防），用于显示敌人预览
   */
  open(onConfirm, onCancel, level) {
    this._build();
    this.setPreview(level);
    this._onConfirm = onConfirm;
    this._onCancel = onCancel || null;
    this.select(CONFIG.DENSITY_DEFAULT);
    this._el.classList.remove('hidden');
    if (!this._keyHandler) {
      this._keyHandler = (e) => {
        if (!this.isOpen()) return;
        if (e.key === 'Enter') { e.preventDefault(); this._confirm(); }
        else if (e.key === '1') this.select('sparse');
        else if (e.key === '2') this.select('normal');
        else if (e.key === '3') this.select('flood');
      };
      document.addEventListener('keydown', this._keyHandler);
    }
    const ok = this._el.querySelector('#density-picker-ok');
    // 触屏不自动聚焦，避免「开战」外多一圈焦点框（P5）
    if (ok && ok.focus && !(window.DeviceProfile && window.DeviceProfile.isTouch)) ok.focus();
  },

  close() {
    if (this._el) this._el.classList.add('hidden');
    this._onConfirm = null;
    this._onCancel = null;
  },

  _confirm() {
    if (!this.isOpen()) return;
    const cb = this._onConfirm;
    const key = this._selected || CONFIG.DENSITY_DEFAULT;
    this.close();
    if (cb) cb(key);
  },

  _cancel() {
    if (!this.isOpen()) return;
    const cb = this._onCancel;
    this.close();
    if (cb) cb();
  },
};

window.DensityPicker = DensityPicker;
