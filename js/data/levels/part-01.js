// 普通模式关卡数据注册
//
// 网格：6 行 × 26 列（每格 72px，世界宽 1872px，视口 960px 由镜头横向滚动）。
// 路径由拐点折线展开成逐格路径（相邻拐点必须同行或同列）。
function polylineCells(corners) {
  const cells = [];
  for (let i = 0; i < corners.length; i++) {
    const [x, y] = corners[i];
    if (i === 0) { cells.push({x, y}); continue; }
    const [px, py] = corners[i - 1];
    const dx = Math.sign(x - px);
    const dy = Math.sign(y - py);
    let cx = px, cy = py;
    while (cx !== x || cy !== y) {
      cx += dx; cy += dy;
      cells.push({x: cx, y: cy});
    }
  }
  return cells;
}

Object.assign(LEVELS_DATA, {
  // ========== 主题1: 初墨 (基础教学) ==========
  "1-1": {
    id: "1-1",
    name: "初阵",
    theme: 1,
    difficulty: 1,
    startInk: 300,
    coreHp: 20,
    // 左入右出：第 1 行向右 → 在 x=9 拐下 → 第 4 行向右至出口（两个拐角）
    path: polylineCells([[0,1],[9,1],[9,4],[25,4]]),
    core: {x:25,y:4},
    unlocks: []
  },
  "1-2": {
    id: "1-2",
    name: "弯道",
    theme: 1,
    difficulty: 2,
    startInk: 400,
    coreHp: 20,
    // 蛇形三段：第 0 行向右（上游，给火）→ 第 2 行向左 → 第 4 行向右（下游，给水）至出口
    path: polylineCells([[0,0],[23,0],[23,2],[2,2],[2,4],[25,4]]),
    core: {x:25,y:4},
    unlocks: []
  },
});
