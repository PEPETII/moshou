// 共用的题字反馈；动画只作用于 UI，不改变融合或胜负结算顺序。
(function() {
  const motionKey = 'moshou-ink-motion';
  const menu = document.querySelector('.menu-buttons');
  const settings = document.getElementById('settings-container');
  const toggle = document.getElementById('ink-motion-toggle');
  let motion = 'full';
  try { motion = localStorage.getItem(motionKey) || 'full'; } catch (_) { /* 无存储权限时沿用默认值 */ }

  const applyMotion = () => {
    document.documentElement.dataset.inkMotion = motion;
    toggle.textContent = `墨迹动效 · ${motion === 'reduced' ? '关' : '开'}`;
    toggle.setAttribute('aria-pressed', motion === 'reduced' ? 'true' : 'false');
  };
  applyMotion();

  document.getElementById('btn-settings').addEventListener('click', () => {
    menu.style.display = 'none';
    settings.classList.remove('hidden');
  });
  document.getElementById('back-to-menu-from-settings').addEventListener('click', () => {
    settings.classList.add('hidden');
    menu.style.display = 'flex';
  });
  toggle.addEventListener('click', () => {
    motion = motion === 'reduced' ? 'full' : 'reduced';
    try { localStorage.setItem(motionKey, motion); } catch (_) { /* 设置仍在本页生效 */ }
    applyMotion();
  });

  let feedbackTimer;
  window.InkUI = {
    motionReduced() {
      return document.documentElement.dataset.inkMotion === 'reduced' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },
    setModalScene(scene, letters = {}) {
      const modal = document.getElementById('modal');
      modal.dataset.scene = scene;
      document.getElementById('ritual-left').textContent = letters.left || '';
      document.getElementById('ritual-right').textContent = letters.right || '';
      document.getElementById('ritual-result').textContent = letters.result || '';
      document.getElementById('modal-seal').textContent =
        scene === 'fusion' ? '合' : scene === 'victory' ? '成' : scene === 'defeat' ? '破' : '印';
    },
    ensureReturnButton() {
      let button = document.getElementById('modal-return-btn');
      if (!button) {
        button = document.createElement('button');
        button.id = 'modal-return-btn';
        button.type = 'button';
        document.getElementById('modal-btn').after(button);
      }
      return button;
    },
    hideReturnButton() {
      const button = document.getElementById('modal-return-btn');
      if (button) {
        button.style.display = 'none';
        button.onclick = null;
      }
    },
    showFusionFeedback(char) {
      const feedback = document.getElementById('fusion-ink-feedback');
      clearTimeout(feedbackTimer);
      feedback.querySelector('.fusion-feedback-word').textContent = char;
      feedback.classList.remove('hidden');
      feedback.classList.remove('play');
      void feedback.offsetWidth;
      feedback.classList.add('play');
      feedbackTimer = setTimeout(() => feedback.classList.add('hidden'), 950);
    }
  };
})();
