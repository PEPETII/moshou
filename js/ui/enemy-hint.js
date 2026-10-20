// 新敌人初见提示（工单 14 §2.1）：玩家第一次遇到某种新敌人时，画布下方弹一张小卡片
// （敌人字 + 一句话能力说明），3 秒后淡出，不暂停游戏。已经看过的记在 localStorage 的
// moshou_enemy_seen 里；设置里有「敌人提示」开关（默认开启，js/ui/settings-panel.js）。
// 只对新增的 20 种敌人提示（尸、鬼、巨玩家一开局就认得）。
const EnemyHint = {
  enabled: true,
  _queue: [],
  _showing: false,
  _seen: null,
  KEY: 'moshou_enemy_seen',

  seen() {
    if (this._seen) return this._seen;
    let list = [];
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) list = JSON.parse(raw);
    } catch (_) { list = []; }
    this._seen = new Set(Array.isArray(list) ? list : []);
    return this._seen;
  },

  remember(type) {
    this.seen().add(type);
    try { localStorage.setItem(this.KEY, JSON.stringify([...this._seen])); } catch (_) { /* 无存储权限时本局内仍不重复提示 */ }
  },

  // 敌人入场时调用（Game.spawnGlyphEnemy）
  notice(type) {
    if (!this.enabled || typeof document === 'undefined') return;
    if (CONFIG.ACTIVE_ENEMIES.indexOf(type) < 3) return;
    const seen = this.seen();
    if (seen.has(type) || this._queue.indexOf(type) >= 0) return;
    this.remember(type);
    this._queue.push(type);
    this._next();
  },

  _next() {
    if (this._showing || !this._queue.length) return;
    const type = this._queue.shift();
    const cfg = CONFIG.ENEMIES[type];
    const codex = (CONFIG.CODEX.enemies && CONFIG.CODEX.enemies[type]) || {};
    if (!cfg) { this._next(); return; }
    this._showing = true;
    const el = document.createElement('div');
    el.className = 'enemy-hint';
    el.setAttribute('role', 'status');
    const name = cfg.name || cfg.char;
    el.innerHTML = `<span class="enemy-hint__char">${cfg.segments ? cfg.segments[0].char : cfg.char}</span>` +
      `<span class="enemy-hint__text"><span class="enemy-hint__name">${name}</span>${codex.role || ''}</span>`;
    document.body.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
      this._showing = false;
      this._next();
    }, 3000);
  },

  // 新开一局或测试时清空队列（已看过的记录保留）
  reset() { this._queue.length = 0; },
};

if (typeof window !== 'undefined') window.EnemyHint = EnemyHint;
