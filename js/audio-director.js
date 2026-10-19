// 音频导演：首次手势解锁、全局点击音、后台挂起，并按界面/战斗状态驱动 BGM 场景。
// 用轮询读取现有界面状态，避免在大量场景切换处逐一埋点。
(function initInkAudioDirector(global) {
  const audio = global.InkAudio;
  const doc = global.document;
  if (!audio || !doc) return;

  const POLL_MS = 250;
  const UNLOCK_EVENTS = ['pointerdown', 'touchend', 'click', 'keydown'];
  // 这些按钮有各自的音效，不再叠加通用点击音。
  const TAP_SKIP = '.sell-btn, #modal-actions button, #conquest-summon-btn';
  const TAP_TARGETS = 'button, .tower-select, [data-ui-sound]';

  const isShown = (id) => {
    const el = doc.getElementById(id);
    return Boolean(el) && !el.classList.contains('hidden');
  };

  // 征服关卡 ID 形如 "3-2"，主题序号与普通模式的五个主题一一对应。
  function themeOf(game, isConquest) {
    if (isConquest) {
      const id = String(game.currentLevelId || '1-1');
      return Number.parseInt(id.split('-')[0], 10) || 1;
    }
    const level = game.currentLevelData;
    return (level && Number(level.theme)) || 1;
  }

  function aliveEnemyCount(game) {
    const list = game.runtimeIndexes && game.runtimeIndexes.aliveEnemies
      ? game.runtimeIndexes.aliveEnemies
      : game.enemies;
    return Array.isArray(list) ? list.reduce((n, e) => n + (e && !e.dead ? 1 : 0), 0) : 0;
  }

  // 返回 { scene, theme, intensity }；菜单与选关界面都算 menu。
  function readState() {
    if (isShown('main-menu')) return { scene: 'menu', theme: 0, intensity: 0 };

    let game = null;
    let isConquest = false;
    if (isShown('conquest-container') && global.conquestGame) {
      game = global.conquestGame;
      isConquest = true;
    } else if (isShown('main-container') && global.gameInstance) {
      game = global.gameInstance;
    }
    if (!game) return { scene: 'menu', theme: 0, intensity: 0 };

    const theme = themeOf(game, isConquest);
    if (game.gameEnded) return { scene: 'result', theme, intensity: 0 };
    if (!game.battleActive) return { scene: 'prep', theme, intensity: 0 };

    // 连续刷怪：拥挤度按存活数相对 ENEMY_CAP 估算，进度按坚守已过时间
    const crowd = Math.min(1, aliveEnemyCount(game) / (((global.CONFIG && global.CONFIG.ENEMY_CAP) || 260) * 0.3));
    const progress = game.holdTotal ? Math.min(1, 1 - (game.holdLeft || 0) / game.holdTotal) : 0;
    return { scene: 'battle', theme, intensity: crowd * 0.6 + progress * 0.4 };
  }

  function poll() {
    const bgm = audio.bgm;
    if (!bgm) return;
    bgm.sync();
    if (!bgm.running) return;
    const state = readState();
    bgm.setScene(state.scene, state.theme);
    bgm.setIntensity(state.intensity);
  }

  // 首次点击/触摸后创建并恢复上下文；上下文仍被挂起时继续监听（部分 iOS 版本需要多次手势）。
  function onGesture() {
    if (!audio.unlock()) return;
    audio.resume().then(() => {
      if (audio.isRunning()) {
        UNLOCK_EVENTS.forEach((name) => doc.removeEventListener(name, onGesture, true));
        poll();
      }
    });
  }
  UNLOCK_EVENTS.forEach((name) => doc.addEventListener(name, onGesture, true));

  // 通用界面点击音。
  doc.addEventListener('click', (event) => {
    const el = event.target && event.target.closest ? event.target.closest(TAP_TARGETS) : null;
    if (!el || el.disabled || el.classList.contains('locked') || el.matches(TAP_SKIP)) return;
    if (el.matches('[data-sound-toggle], [data-bgm-toggle]')) return;
    audio.play('uiTap');
  }, true);

  // 切后台挂起，回前台恢复；音乐和音效都关闭时不主动恢复。
  doc.addEventListener('visibilitychange', () => {
    const ctx = audio.context;
    if (!ctx) return;
    if (doc.hidden) {
      if (ctx.state === 'running') ctx.suspend().catch(() => {});
    } else if (audio.enabled || audio.musicEnabled) {
      audio.resume().then(poll);
    }
  });

  global.setInterval(poll, POLL_MS);
  audio.director = { readState, poll };
})(window);
