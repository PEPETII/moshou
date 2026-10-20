// 设置组件（工单 P3）：主菜单设置页与战斗暂停设置共用同一份条目与状态。
//
// 每个 [data-settings-host] 宿主渲染同一套「画面 / 声音」两组；任一处切换，所有宿主同步。
// 画面四项由本模块持久化并应用（存储键与取值沿用旧实现，玩家已有设置不丢）：
//   墨迹动效  moshou-ink-motion          'full' / 'reduced'  → html[data-ink-motion]
//   打击反馈  CONFIG.GLYPH_FEEDBACK.storageKey 'on' / 'off'  → GlyphFX.feedback（总开关）
//   伤害数字  moshou_damage_numbers      'on' / 'off'        → GlyphFX.numbersEnabled
//   震动      moshou_screen_shake        'on' / 'off'        → GlyphFX.shakeEnabled
//   震动减弱  moshou_shake_lite          'on' / 'off'（默认关）→ GlyphFX.shakeLite
// 声音两项（开关 + 音量）仍由 js/audio.js 处理：按钮带 data-sound-toggle / data-bgm-toggle，
// 滑块带 data-volume，状态由 InkAudio.syncButtons() 回写。
const InkSettings = (() => {
  const onOff = { read: (v) => v !== 'off', write: (on) => (on ? 'on' : 'off') };

  const FLAGS = {
    motion: {
      key: 'moshou-ink-motion',
      read: (v) => v !== 'reduced',
      write: (on) => (on ? 'full' : 'reduced'),
      apply: (on) => { document.documentElement.dataset.inkMotion = on ? 'full' : 'reduced'; },
    },
    feedback: {
      key: CONFIG.GLYPH_FEEDBACK.storageKey, ...onOff,
      apply: (on) => { GlyphFX.feedback = on; if (!on) GlyphFX.clearFeedback(); },
    },
    damage: {
      key: 'moshou_damage_numbers', ...onOff,
      apply: (on) => { GlyphFX.numbersEnabled = on; if (!on) GlyphFX.numbers.length = 0; },
    },
    shake: {
      key: 'moshou_screen_shake', ...onOff,
      apply: (on) => { GlyphFX.shakeEnabled = on; if (!on) GlyphFX.shake = 0; },
    },
    shakeLite: {
      key: 'moshou_shake_lite',
      read: (v) => v === 'on',
      write: (on) => (on ? 'on' : 'off'),
      apply: (on) => { GlyphFX.shakeLite = on; if (on) GlyphFX.ultShakeLock = 0; },
    },
    // 新敌人初见提示：第一次遇到某种新敌人时，角落弹一张小卡片（工单 14 §2.1），默认开启
    enemyHint: {
      key: 'moshou_enemy_hint', ...onOff,
      apply: (on) => { if (window.EnemyHint) EnemyHint.enabled = on; },
    },
  };

  const GROUPS = [
    {
      title: '画面',
      items: [
        { flag: 'motion', label: '墨迹动效', note: '关闭后书页与印章仍清晰呈现' },
        { flag: 'feedback', label: '打击反馈', note: '顿帧、碎字、墨渍与连斩的总开关' },
        { flag: 'damage', label: '伤害数字' },
        { flag: 'shake', label: '震动', note: '墨迹动效关闭时不震屏' },
        { flag: 'shakeLite', label: '震动减弱', note: '同一时间仅一个炮塔大招震屏，避免叠加' },
        { flag: 'enemyHint', label: '敌人提示', note: '初见新敌人时，角落弹出一句能力说明' },
      ],
    },
    {
      title: '声音',
      items: [
        { audio: 'sfx', label: '音效', attr: 'data-sound-toggle', volume: 80 },
        { audio: 'bgm', label: '音乐', attr: 'data-bgm-toggle', volume: 60 },
      ],
    },
  ];

  const state = {};

  function load(name) {
    const flag = FLAGS[name];
    let raw = null;
    try { raw = localStorage.getItem(flag.key); } catch (_) { /* 无存储权限时沿用默认值「开」 */ }
    state[name] = flag.read(raw);
  }

  function save(name) {
    try { localStorage.setItem(FLAGS[name].key, FLAGS[name].write(state[name])); } catch (_) { /* 设置仍在本页生效 */ }
  }

  function seal(on) { return on ? '开' : '关'; }

  // 说明文字放进按钮、排在名称下方：整行可点，且矮屏下不额外占一行
  function switchHtml(attrs, label, on, note) {
    return `<button type="button" class="ink-switch settings-switch" role="switch" ${attrs} aria-checked="${on}">` +
      `<span class="settings-switch__label">${label}` +
      (note ? `<span class="settings-switch__note">${note}</span>` : '') +
      `</span><span class="ink-switch__seal">${seal(on)}</span></button>`;
  }

  function itemHtml(item) {
    if (item.flag) {
      return `<div class="settings-item">${switchHtml(`data-setting="${item.flag}"`, item.label, state[item.flag], item.note)}</div>`;
    }
    return `<div class="settings-item settings-item--audio">${switchHtml(item.attr, item.label, true)}` +
      `<input type="range" class="settings-range" data-volume="${item.audio}" min="0" max="100" step="5" ` +
      `value="${item.volume}" aria-label="${item.label}音量"></div>`;
  }

  function render(host) {
    host.innerHTML = GROUPS.map((group) =>
      `<section class="ink-panel settings-group"><h3 class="ink-panel__title">${group.title}</h3>` +
      group.items.map(itemHtml).join('') + '</section>').join('');
    host.classList.add('settings-grid');
  }

  // 把某一项的状态写回所有宿主里的对应开关
  function sync(name) {
    document.querySelectorAll(`[data-setting="${name}"]`).forEach((button) => {
      button.setAttribute('aria-checked', String(state[name]));
      const mark = button.querySelector('.ink-switch__seal');
      if (mark) mark.textContent = seal(state[name]);
    });
  }

  function set(name, on) {
    state[name] = on;
    save(name);
    FLAGS[name].apply(on);
    sync(name);
  }

  function init() {
    Object.keys(FLAGS).forEach((name) => { load(name); FLAGS[name].apply(state[name]); });
    document.querySelectorAll('[data-settings-host]').forEach(render);
    document.addEventListener('click', (event) => {
      const button = event.target && event.target.closest ? event.target.closest('[data-setting]') : null;
      if (button) set(button.dataset.setting, !state[button.dataset.setting]);
    });
    if (window.InkAudio) InkAudio.syncButtons();
  }

  init();
  return { get: (name) => state[name], set };
})();
