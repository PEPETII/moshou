// 战斗中的「暂停」按钮、暂停菜单（继续游戏 / 设置 / 返回主菜单）与战斗内设置弹窗。
// 暂停通过 Game.menuPaused 冻结战斗逻辑（见 js/core/rendering.js 的 update），
// 与页面切后台的 isPaused 互不影响。
// 设置弹层的条目由 js/ui/settings-panel.js 渲染（与主菜单设置页同一组件、同一份状态）。
(function() {
  const pauseBtn = document.getElementById('pause-btn');
  const pauseLayer = document.getElementById('battle-pause');
  const settingsLayer = document.getElementById('battle-settings');
  if (!pauseBtn || !pauseLayer || !settingsLayer) return;

  const game = () => window.gameInstance || null;
  const showLayer = (layer, shown) => layer.classList.toggle('hidden', !shown);

  // 暂停开始/结束时同步游戏循环标记；恢复时重置计时，避免把暂停时长算进一帧
  const setMenuPaused = (paused) => {
    const g = game();
    if (!g) return;
    g.menuPaused = paused;
    if (!paused) g.lastTime = performance.now();
  };

  const openPauseMenu = () => {
    setMenuPaused(true);
    showLayer(settingsLayer, false);
    showLayer(pauseLayer, true);
  };
  const resumeGame = () => {
    showLayer(pauseLayer, false);
    showLayer(settingsLayer, false);
    setMenuPaused(false);
  };
  const openSettings = () => {
    showLayer(pauseLayer, false);
    showLayer(settingsLayer, true);
  };
  const backToPauseMenu = () => {
    showLayer(settingsLayer, false);
    showLayer(pauseLayer, true);
  };
  const returnToMainMenu = () => {
    showLayer(pauseLayer, false);
    showLayer(settingsLayer, false);
    const g = game();
    if (!g) return;
    setMenuPaused(false);
    g.returnToMenu();
  };

  pauseBtn.addEventListener('click', openPauseMenu);
  document.getElementById('pause-resume').addEventListener('click', resumeGame);
  document.getElementById('pause-settings').addEventListener('click', openSettings);
  document.getElementById('settings-back').addEventListener('click', backToPauseMenu);
  document.getElementById('pause-return').addEventListener('click', returnToMainMenu);
})();
