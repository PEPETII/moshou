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
    root.className = 'hidden';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'density-picker-title');

    const box = document.createElement('div');
    box.id = 'density-picker-box';

    const title = document.createElement('h2');
    title.id = 'density-picker-title';
    title.textContent = '择潮';
    box.appendChild(title);

    const hint = document.createElement('p');
    hint.id = 'density-picker-hint';
    hint.textContent = '选定来犯之敌的疏密，确认后开始计时';
    box.appendChild(hint);

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
        `<span class="density-rate">每秒 ${cfg.rate} 只</span>` +
        `<span class="density-giant">巨 每 ${cfg.giantEvery} 秒</span>` +
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
    back.className = 'ink-button secondary';
    back.textContent = '返回';
    back.addEventListener('click', () => this._cancel());
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.id = 'density-picker-ok';
    ok.className = 'ink-button';
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

  /**
   * 打开弹窗。每次都重置为默认档位「潮」。
   * @param {(key:string)=>void} onConfirm 玩家点「开战」
   * @param {()=>void} [onCancel] 玩家点「返回」
   */
  open(onConfirm, onCancel) {
    this._build();
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
    if (ok && ok.focus) ok.focus();
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
