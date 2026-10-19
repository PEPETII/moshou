// CONFIG 领域注册
Object.assign(CONFIG, {
  // 游戏版本号（语义化版本：主版本.功能.修复），发布时同步打 git tag
  GAME_VERSION: 'v1.0.0',

  // 网格与镜头（工单 03）：格子 72px，6 行刚好占满 432px 的视口高度；
  // 地图只加宽，视口（画布）固定 960×432，靠镜头横向滚动查看。
  CELL_SIZE: 72,
  GRID_ROWS: 6,
  GRID_COLS: 26,        // 塔防世界宽 26 × 72 = 1872px
  CONQUEST_COLS: 22,    // 征服世界宽 22 × 72 = 1584px
  VIEW_W: 960,          // 视口（画布）宽
  VIEW_H: 432,          // 视口（画布）高 = GRID_ROWS × CELL_SIZE
  // 镜头参数
  CAMERA: {
    SMOOTH: 14,         // 平滑系数（越大越跟手）
    KEY_SPEED: 720,     // 键盘滚动速度 px/s
    WHEEL_SCALE: 1,     // 滚轮 deltaY → 像素
    PAN_THRESHOLD: 8,   // 空白处拖拽判定平移的位移阈值 px
    EDGE_ZONE: 48,      // 拖卡片靠近视口左右边缘多少 px 内触发自动滚动
    EDGE_SPEED: 640,    // 边缘自动滚动速度 px/s
  },

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
