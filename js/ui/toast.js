// UI：轻提示（toast）
//
// 用途：给"操作失败"提供可见反馈。
// 触摸端没有 hover 预览，旧实现里放置失败（墨水不足 / 格子被占 / 非法位置）
// 全部静默 return false —— 玩家视角就是"点了没反应"。
//
// 设计约束：
//   - 挂在 #scale-container 之外，因此使用绝对 px，不参与整体缩放
//   - 同一条消息 900ms 内去重，避免连点刷屏
//   - 最多同时 3 条
//   - 外观见 css/ink-ui/components.css 的 .ui-toast（P7：色值改用令牌，不再写内联样式）
(function initToast() {
  'use strict';

  const DEDUPE_WINDOW = 900;
  const DEFAULT_DURATION = 1600;
  const MAX_VISIBLE = 3;

  const TYPES = ['info', 'success', 'warning'];

  function ensureContainer() {
    let container = document.getElementById('toast-container');
    if (container) return container;

    container = document.createElement('div');
    container.id = 'toast-container';

    document.body.appendChild(container);
    return container;
  }

  UI.prototype.showToast = function (message, type, duration) {
    if (!message) return;

    const now = Date.now();
    if (!this._toastLog) this._toastLog = {};
    if (this._toastLog[message] && now - this._toastLog[message] < DEDUPE_WINDOW) return;
    this._toastLog[message] = now;
    if (type === 'warning' && window.InkAudio) window.InkAudio.play('deny');

    const container = ensureContainer();

    const el = document.createElement('div');
    el.className = 'ui-toast';
    el.dataset.type = TYPES.includes(type) ? type : 'info';
    el.setAttribute('role', 'status');
    el.textContent = message;

    container.appendChild(el);

    // 限制同时可见数量
    const children = Array.from(container.children);
    while (children.length > MAX_VISIBLE) {
      const oldest = children.shift();
      if (oldest && oldest.parentElement) oldest.remove();
    }

    requestAnimationFrame(() => el.classList.add('is-shown'));

    const life = duration || DEFAULT_DURATION;
    setTimeout(() => {
      el.classList.remove('is-shown');
      setTimeout(() => { if (el.parentElement) el.remove(); }, 200);
    }, life);
  };
})();
