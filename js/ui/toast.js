// UI：轻提示（toast）
//
// 用途：给"操作失败"提供可见反馈。
// 触摸端没有 hover 预览，旧实现里放置失败（金币不足 / 格子被占 / 非法位置）
// 全部静默 return false —— 玩家视角就是"点了没反应"。
//
// 设计约束：
//   - 挂在 #scale-container 之外，因此使用绝对 px，不参与整体缩放
//   - 同一条消息 900ms 内去重，避免连点刷屏
//   - 最多同时 3 条
(function initToast() {
  'use strict';

  const DEDUPE_WINDOW = 900;
  const DEFAULT_DURATION = 1600;
  const MAX_VISIBLE = 3;

  const STYLES = {
    info: { border: '#3a3a3a', color: '#d4d4d4', icon: '·' },
    success: { border: '#7a9a6a', color: '#a8c49a', icon: '✓' },
    warning: { border: '#c45c48', color: '#e0a094', icon: '!' }
  };

  function ensureContainer() {
    let container = document.getElementById('toast-container');
    if (container) return container;

    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = [
      'position:fixed',
      'left:50%',
      'bottom:13%',
      'transform:translateX(-50%)',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'gap:6px',
      'z-index:3000',
      'pointer-events:none',
      'max-width:88vw'
    ].join(';');

    document.body.appendChild(container);
    return container;
  }

  UI.prototype.showToast = function (message, type, duration) {
    if (!message) return;

    const now = Date.now();
    if (!this._toastLog) this._toastLog = {};
    if (this._toastLog[message] && now - this._toastLog[message] < DEDUPE_WINDOW) return;
    this._toastLog[message] = now;

    const container = ensureContainer();
    const palette = STYLES[type] || STYLES.info;

    const el = document.createElement('div');
    el.className = 'ui-toast';
    el.style.cssText = [
      'box-sizing:border-box',
      'padding:9px 16px',
      'background:rgba(20,20,20,0.94)',
      'border:1px solid ' + palette.border,
      'color:' + palette.color,
      'font-family:"ZCOOL XiaoWei", "Ma Shan Zheng", serif',
      'font-size:15px',
      'line-height:1.35',
      'letter-spacing:1px',
      'white-space:nowrap',
      'text-align:center',
      'box-shadow:0 4px 16px rgba(0,0,0,0.5)',
      'opacity:0',
      'transition:opacity 0.15s ease-out'
    ].join(';');
    el.textContent = message;

    container.appendChild(el);

    // 限制同时可见数量
    const children = Array.from(container.children);
    while (children.length > MAX_VISIBLE) {
      const oldest = children.shift();
      if (oldest && oldest.parentElement) oldest.remove();
    }

    requestAnimationFrame(() => { el.style.opacity = '1'; });

    const life = duration || DEFAULT_DURATION;
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => { if (el.parentElement) el.remove(); }, 200);
    }, life);
  };
})();
