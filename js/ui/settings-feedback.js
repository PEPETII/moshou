// 设置页「打击反馈」开关：读写 localStorage['moshou_hit_feedback']（'on' / 'off'，缺省 'on'）
// 并同步 GlyphFX.feedback；战斗中途切换即时生效（GlyphFX 每帧读取该字段）。
(function() {
  const key = CONFIG.GLYPH_FEEDBACK.storageKey;
  const toggle = document.getElementById('hit-feedback-toggle');
  let on = true;
  try { on = localStorage.getItem(key) !== 'off'; } catch (_) { /* 无存储权限时沿用默认值「开」 */ }

  const apply = () => {
    GlyphFX.feedback = on;
    if (!on) GlyphFX.clearFeedback();
    if (!toggle) return;
    toggle.textContent = `打击反馈 · ${on ? '开' : '关'}`;
    toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
  };
  apply();
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    on = !on;
    try { localStorage.setItem(key, on ? 'on' : 'off'); } catch (_) { /* 设置仍在本页生效 */ }
    apply();
  });
})();
