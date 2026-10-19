// 卷轴弹窗（工单 P5）：塔防与征服的胜负、普通告知共用一个渲染。
//
//   InkModal.show({
//     scene: 'victory' | 'defeat' | 'notice',   // 决定大字配色、印章字与胜负音效
//     title: '胜',
//     lines: ['守境已成 · 第 1-1 境', '赏墨 110'],
//     stars: 2,                                   // 可选：0–3，塔防胜利时显示三枚印
//     actions: [{ label: '重来', onClick }, …, { label: '下一关', primary: true, onClick }],
//   })
//
// 主按钮沿用 id="modal-btn"（音效导演 TAP_SKIP 依赖这个 id，胜负音已由场景播放）。
const InkModal = (() => {
  const STAR_COUNT = 3;

  function el(id) { return document.getElementById(id); }

  function hide() {
    const modal = el('modal');
    if (modal) modal.classList.add('hidden');
  }

  function renderStars(stars) {
    const box = el('modal-stars');
    if (!box) return;
    if (typeof stars !== 'number') {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }
    box.hidden = false;
    box.setAttribute('aria-label', `星级 ${stars} / ${STAR_COUNT}`);
    box.innerHTML = Array.from({ length: STAR_COUNT }, (_, i) =>
      `<span class="modal-star${i < stars ? ' is-lit' : ''}" aria-hidden="true">星</span>`).join('');
  }

  function renderActions(actions) {
    const box = el('modal-actions');
    box.innerHTML = '';
    actions.forEach((action, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = action.primary ? 'ink-btn ink-btn--primary' : 'ink-btn';
      if (action.primary) button.id = 'modal-btn';
      button.textContent = action.label;
      button.addEventListener('click', () => {
        hide();
        if (typeof action.onClick === 'function') action.onClick();
      });
      box.appendChild(button);
      if (action.primary || i === actions.length - 1) button.dataset.autofocus = '1';
    });
  }

  function show(opts) {
    const modal = el('modal');
    if (!modal) return;
    const scene = opts.scene || 'notice';
    if (window.InkUI && InkUI.setModalScene) InkUI.setModalScene(scene); // 胜负音效与印章字
    else modal.dataset.scene = scene;
    el('modal-title').textContent = opts.title || '';
    el('modal-text').textContent = (opts.lines || []).join('\n');
    renderStars(opts.stars);
    renderActions(opts.actions && opts.actions.length ? opts.actions : [{ label: '确定', primary: true }]);
    modal.classList.remove('hidden');
    // 键盘 / 鼠标环境把焦点放到主按钮；触屏不聚焦，避免主按钮外再套一圈焦点框
    const touch = window.DeviceProfile && window.DeviceProfile.isTouch;
    const focus = modal.querySelector('[data-autofocus]');
    if (focus && !touch) focus.focus({ preventScroll: true });
  }

  return { show, hide };
})();
