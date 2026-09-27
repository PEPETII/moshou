// CONFIG 领域注册
Object.assign(CONFIG, {
  // 游戏版本号（语义化版本：主版本.功能.修复），发布时同步打 git tag
  GAME_VERSION: 'v1.0.0',

  CELL_SIZE: 48,  // 保持48px，9行占432px（留白48px）
  GRID_COLS: 20,
  GRID_ROWS: 9,

  // 字体栈集中配置（对齐 docs/ui-design-spec.md 第 3.1 节）
  // 注意：Canvas 的 ctx.font 不受任何 CSS 影响，字体必须在这里显式声明；
  // 字体族名含空格时必须加引号，否则整条 font 字符串会被浏览器判为非法而静默沿用上一次的值。
  FONTS: {
    // 标题/艺术字：书法字体，用于炮塔字符、UI 大标题
    BRUSH: "'Ma Shan Zheng', 'ZCOOL XiaoWei', 'KaiTi', 'STKaiti', serif",
    // 正文/标签/数值：可读性优先，用于 HP、Lv、说明文字
    // 原代码用 cursive 兜底是无效的——cursive 是拉丁通用族名，不含 CJK 字形。
    TEXT: "'ZCOOL XiaoWei', 'Microsoft YaHei', serif",
  },
});
