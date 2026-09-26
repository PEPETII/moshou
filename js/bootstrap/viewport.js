// 移动端适配：缩放计算与横竖屏处理
//
// 旧实现的三个致命问题（均在手机横屏实测复现）：
//   1. 用固定常量 TOTAL_GAME_WIDTH=1264 / GAME_HEIGHT=480 估算内容尺寸，
//      与实际布局不符：塔防模式实际内容宽 960（无侧栏）、实际内容高约 562。
//      → 塔防模式被无谓缩小约 24%，且高估可用高度导致上下被裁切。
//   2. 只在 load 时计算一次，塔防 ↔ 征服模式切换后不重算。
//   3. 未扣除刘海屏安全区。
//
// 现改为：直接实测「当前可见根元素」的自然尺寸，迭代求收敛的 scale。
// 迭代是必需的——触控尺寸用 calc(44px / var(--ui-scale)) 反算，
// 改变 scale 会改变实测尺寸，需要反复逼近。
(function initViewportAdapter() {
  'use strict';

  var MIN_SCALE = 0.3;
  var MAX_SCALE = 1;
  var MAX_ITERATIONS = 4;
  var CONVERGE_EPSILON = 0.002;

  function debugEnabled() {
    try {
      return new URLSearchParams(window.location.search).get('debug') === '1';
    } catch (e) {
      return false;
    }
  }

  function readInset(name) {
    var raw = getComputedStyle(document.documentElement).getPropertyValue(name);
    var value = parseFloat(raw);
    return isFinite(value) ? value : 0;
  }

  function readSafeArea() {
    return {
      top: readInset('--sat'),
      right: readInset('--sar'),
      bottom: readInset('--sab'),
      left: readInset('--sal')
    };
  }

  /**
   * 当前真正需要缩放的内容根元素。
   * 游戏未开始（#main-container 隐藏）时返回 null —— 主菜单是 fixed 全屏布局，不参与缩放。
   */
  function getVisibleRoot() {
    var main = document.getElementById('main-container');
    if (!main || main.classList.contains('hidden')) return null;

    var conquest = document.getElementById('conquest-container');
    if (conquest && !conquest.classList.contains('hidden')) return conquest;

    return document.getElementById('game-container');
  }

  function getCurrentScale() {
    var value = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--ui-scale')
    );
    if (!isFinite(value) || value <= 0) return 1;
    return Math.min(Math.max(value, MIN_SCALE), MAX_SCALE);
  }

  /**
   * 计算并应用缩放。可在模式切换 / 尺寸变化时反复调用。
   * @returns {number} 实际应用的 scale
   */
  function applyScale() {
    var container = document.getElementById('scale-container');
    if (!container) return 1;

    var root = getVisibleRoot();
    if (!root) {
      document.documentElement.style.setProperty('--ui-scale', '1');
      container.style.transform = '';
      return 1;
    }

    var isTouch = !!(window.DeviceProfile && window.DeviceProfile.isTouch);
    var padding = isTouch ? 8 : 20;
    var safe = readSafeArea();

    var availableWidth = Math.max(160, window.innerWidth - padding * 2 - safe.left - safe.right);
    var availableHeight = Math.max(120, window.innerHeight - padding * 2 - safe.top - safe.bottom);

    var scale = getCurrentScale();
    var width = 0;
    var height = 0;

    // 迭代逼近：scale 会影响反算后的触控元素尺寸，进而影响实测尺寸。
    for (var i = 0; i < MAX_ITERATIONS; i++) {
      width = root.offsetWidth;
      height = root.offsetHeight;
      if (!width || !height) break;

      var next = Math.min(availableWidth / width, availableHeight / height, MAX_SCALE);
      next = Math.min(Math.max(next, MIN_SCALE), MAX_SCALE);

      var converged = Math.abs(next - scale) < CONVERGE_EPSILON;
      scale = next;
      document.documentElement.style.setProperty('--ui-scale', String(scale));
      if (converged) break;
    }

    container.style.transform = 'scale(' + scale + ')';

    if (debugEnabled()) {
      console.log(
        '[viewport] scale=' + scale.toFixed(4) +
        ' root=' + root.id +
        ' content=' + width + 'x' + height +
        ' available=' + availableWidth + 'x' + availableHeight +
        ' touch=' + isTouch
      );
    }

    return scale;
  }

  /**
   * 竖屏且窄屏时提示旋转（手机竖屏无法容纳 20 列战场）。
   */
  function checkOrientation() {
    var width = window.innerWidth;
    var height = window.innerHeight;
    var isPortrait = height > width;
    var needRotate = isPortrait && width < 768;

    if (needRotate) {
      document.body.classList.add('show-rotate-tip');
      return;
    }

    document.body.classList.remove('show-rotate-tip');
    applyScale();
  }

  function onViewportChanged() {
    // 旋转后浏览器尺寸上报有延迟，分两拍刷新更稳
    setTimeout(checkOrientation, 60);
    setTimeout(applyScale, 320);
  }

  // 对外暴露：模式切换（塔防 ↔ 征服）、进入/退出战斗时都需要重算
  window.applyGameScale = applyScale;
  window.applyScale = applyScale;

  window.addEventListener('load', function () {
    checkOrientation();
  });
  window.addEventListener('resize', onViewportChanged);
  window.addEventListener('orientationchange', function () {
    setTimeout(checkOrientation, 200);
  });

  // iOS 地址栏收起/展开不会触发可靠 resize，补一个视觉视口监听
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      setTimeout(applyScale, 120);
    });
  }
})();
