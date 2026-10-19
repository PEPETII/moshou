// 战斗中的「暂停」按钮、暂停菜单（继续游戏 / 设置 / 返回主菜单）与战斗内设置弹窗。
// 暂停通过 Game.menuPaused 冻结战斗逻辑（见 js/core/rendering.js 的 update），
// 与页面切后台的 isPaused 互不影响。
// 「伤害数字」「震动」两项读写 localStorage 并同步 GlyphFX，与设置页的「打击反馈」相互独立；
// 音效、音乐复用顶栏同款按钮（data-sound-toggle / data-bgm-toggle），状态由 js/audio.js 统一同步。
(function() {
  const damageKey = 'moshou_damage_numbers';
  const shakeKey = 'moshou_screen_shake';

  const pauseBtn = document.getElementById('pause-btn');
  const pauseLayer = document.getElementById('battle-pause');
  const settingsLayer = document.getElementById('battle-settings');
  const damageToggle = document.getElementById('battle-damage-toggle');
  const shakeToggle = document.getElementById('battle-shake-toggle');
  if (!pauseBtn || !pauseLayer || !settingsLayer) return;

  // 缺省为「开」；无存储权限时沿用默认值，设置仍在本页生效
  const readFlag = (key) => {
    try { return localStorage.getItem(key) !== 'off'; } catch (_) { return true; }
  };
  const writeFlag = (key, on) => {
    try { localStorage.setItem(key, on ? 'on' : 'off'); } catch (_) { /* 设置仍在本页生效 */ }
  };

  let damageOn = readFlag(damageKey);
  let shakeOn = readFlag(shakeKey);

  const game = () => window.gameInstance || null;
  const showLayer = (layer, shown) => layer.classList.toggle('hidden', !shown);
  const syncToggle = (button, label, on) => {
    if (!button) return;
    button.textContent = `${label} · ${on ? '开' : '关'}`;
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  };

  // GlyphFX 是顶层 const，不挂在 window 上，这里直接按名字访问
  const applyDamage = () => {
    GlyphFX.numbersEnabled = damageOn;
    if (!damageOn) GlyphFX.numbers.length = 0; // 关闭时立即清掉已在空中的数字
    syncToggle(damageToggle, '伤害数字', damageOn);
  };
  const applyShake = () => {
    GlyphFX.shakeEnabled = shakeOn;
    if (!shakeOn) GlyphFX.shake = 0; // 关闭时立即停止正在进行的震屏
    syncToggle(shakeToggle, '震动', shakeOn);
  };

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

  if (damageToggle) {
    damageToggle.addEventListener('click', () => {
      damageOn = !damageOn;
      writeFlag(damageKey, damageOn);
      applyDamage();
    });
  }
  if (shakeToggle) {
    shakeToggle.addEventListener('click', () => {
      shakeOn = !shakeOn;
      writeFlag(shakeKey, shakeOn);
      applyShake();
    });
  }

  applyDamage();
  applyShake();
})();
