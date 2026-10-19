// 墨晕转场的原点（工单 P5）：记录最近一次按下的位置，写成根元素上的 --tap-x / --tap-y。
// 转场本身是纯 CSS（overlay.css 的 ink-bloom）：页面从 display:none 变为显示时动画自动重播，
// 以这里记下的点为圆心晕开。减少动效时 CSS 直接关闭动画，这里无需判断。
(function initPageTransition() {
  const root = document.documentElement;
  document.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary) return;
    root.style.setProperty('--tap-x', `${Math.round(e.clientX)}px`);
    root.style.setProperty('--tap-y', `${Math.round(e.clientY)}px`);
  }, { capture: true, passive: true });
})();
