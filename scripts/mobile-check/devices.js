// 横屏手机模拟配置（CSS 像素）。insets 用于模拟刘海/圆角安全区。
module.exports = [
  { name: 'iphone-se', w: 667, h: 375, dpr: 2, ua: 'ios', insets: { l: 0, r: 0, t: 0, b: 0 } },
  { name: 'iphone-14', w: 844, h: 390, dpr: 3, ua: 'ios', insets: { l: 47, r: 47, t: 0, b: 21 } },
  { name: 'iphone-14-pro-max', w: 932, h: 430, dpr: 3, ua: 'ios', insets: { l: 59, r: 59, t: 0, b: 21 } },
  { name: 'pixel-7', w: 915, h: 412, dpr: 2.625, ua: 'android', insets: { l: 0, r: 0, t: 0, b: 0 } },
  { name: 'android-small', w: 640, h: 360, dpr: 2, ua: 'android', insets: { l: 0, r: 0, t: 0, b: 0 } },
  { name: 'android-20x9', w: 800, h: 360, dpr: 3, ua: 'android', insets: { l: 32, r: 32, t: 0, b: 0 } },
];
