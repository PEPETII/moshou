// 共用的题字反馈；动画只作用于 UI，不改变胜负结算顺序。
(function() {
  // 设置页只负责开合；条目与状态见 js/ui/settings-panel.js
  const settings = document.getElementById('settings-container');
  document.getElementById('btn-settings').addEventListener('click', () => {
    settings.classList.remove('hidden');
  });
  document.getElementById('back-to-menu-from-settings').addEventListener('click', () => {
    settings.classList.add('hidden');
  });

  window.InkUI = {
    motionReduced() {
      return document.documentElement.dataset.inkMotion === 'reduced' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },
    setModalScene(scene) {
      const modal = document.getElementById('modal');
      modal.dataset.scene = scene;
      if (window.InkAudio && (scene === 'victory' || scene === 'defeat')) window.InkAudio.play(scene);
      document.getElementById('modal-seal').textContent =
        scene === 'victory' ? '成' : scene === 'defeat' ? '破' : '印';
    }
  };
})();
