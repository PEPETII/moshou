// 输入能力探测
// 关键原则：用「输入能力」而不是「屏幕宽度」判断设备类型。
// 手机横屏时 innerWidth 可达 844~1024px，按宽度判会误判为平板/桌面，
// 从而切到依赖 hover 与鼠标的交互分支——这正是移动端交互失效的根源之一。
(function initDeviceProfile() {
  'use strict';

  function mq(query) {
    try {
      return window.matchMedia(query).matches;
    } catch (e) {
      return false;
    }
  }

  var coarse = mq('(pointer: coarse)');
  var anyCoarse = mq('(any-pointer: coarse)');
  var hoverNone = mq('(hover: none)');
  var anyHoverNone = mq('(any-hover: none)');
  var fine = mq('(pointer: fine)');
  var hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;

  // 判定为触屏优先：
  // 1) 主指针为粗粒度且无悬停能力（手机/平板）；
  // 2) 或存在触摸硬件且没有精细指针（避免把触屏笔记本判成纯触屏）。
  var isTouch = (coarse && hoverNone) || (hasTouch && !fine);

  var profile = {
    isTouch: isTouch,
    coarse: coarse,
    anyCoarse: anyCoarse,
    hoverNone: hoverNone,
    anyHoverNone: anyHoverNone,
    hasTouch: hasTouch,

    // 触摸滑点：手指按下后的自然抖动普遍 6~10px，
    // 鼠标时代的 5px 阈值会把"轻点"误判为"拖拽"。
    slop: isTouch ? 12 : 5,

    // 选塔容差（单位：格）。只用于"点中已存在的炮塔"，无副作用，故宽容；
    // 放置炮塔不做吸附，避免误花金币。
    tapTolerance: isTouch ? 0.75 : 0,

    // 长按阈值：触屏可略短
    longPressDelay: isTouch ? 420 : 500,

    // 规范尺寸（docs/ui-design-spec.md:49）
    minTouchTarget: 44,

    // 预览保持时长（ms）：松手后短暂保留落点高亮，便于确认结果
    previewHoldMs: isTouch ? 260 : 0
  };

  window.DeviceProfile = profile;

  // 暴露给 CSS：html[data-input="touch"]，用于 :active 反弹等触屏专用样式
  try {
    document.documentElement.dataset.input = isTouch ? 'touch' : 'pointer';
  } catch (e) {
    /* noop */
  }
})();
