// 工单 03：镜头、坐标换算与新网格关卡的结构性测试
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function listeners() {
  const map = new Map();
  return {
    map,
    addEventListener(type, fn) { (map.get(type) || map.set(type, []).get(type)).push(fn); },
    removeEventListener(type, fn) { map.set(type, (map.get(type) || []).filter((f) => f !== fn)); },
    fire(type, ev) { for (const fn of [...(map.get(type) || [])]) fn(ev); },
  };
}

function build() {
  const doc = Object.assign(listeners(), { getElementById: () => null });
  const win = Object.assign(listeners(), { DeviceProfile: { slop: 12 } });
  let now = 0;
  const canvas = Object.assign(listeners(), {
    width: 960,
    height: 432,
    getClientRects: () => [1],
    getBoundingClientRect: () => ({ left: 100, top: 50, right: 1060, bottom: 482, width: 960, height: 432 }),
  });
  const context = vm.createContext({
    console, Math, Number, Map, Set, Array, Object,
    document: doc, window: win,
    performance: { now: () => now },
  });
  for (const f of ['js/config.js', 'js/config/domain-01.js', 'js/utils.js', 'js/core/camera.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), context, { filename: f });
  }
  return { context, doc, win, canvas, tick: (t) => { now = t; return t; } };
}

function testConfig() {
  const { context } = build();
  const C = vm.runInContext('CONFIG', context);
  assert.strictEqual(C.CELL_SIZE, 72);
  assert.strictEqual(C.GRID_ROWS, 6);
  assert.strictEqual(C.GRID_COLS * C.CELL_SIZE, 1872, '塔防世界宽 1872');
  assert.strictEqual(C.CONQUEST_COLS * C.CELL_SIZE, 1584, '征服世界宽 1584');
  assert.strictEqual(C.VIEW_W, 960);
  assert.strictEqual(C.VIEW_H, 432);
  assert.strictEqual(C.GRID_ROWS * C.CELL_SIZE, C.VIEW_H, '6 行刚好占满视口高度');
}

function testCameraBasics() {
  const h = build();
  h.context.__canvas = h.canvas;
  const cam = vm.runInContext('new Camera({ canvas: __canvas, worldW: 1872 })', h.context);
  assert.strictEqual(h.canvas.camera, cam, 'Camera 挂到 canvas.camera，供 utils 换算读取');
  assert.strictEqual(cam.maxX, 912);

  cam.scrollBy(5000);
  assert.strictEqual(cam.targetX, 912, 'targetX 限制在 maxX');
  cam.scrollBy(-99999);
  assert.strictEqual(cam.targetX, 0, 'targetX 限制在 0');

  // 平滑插值：几帧后逼近目标且不越界
  cam.scrollBy(400);
  let t = 0;
  for (let i = 0; i < 90; i++) cam.update(t += 16);
  assert.ok(Math.abs(cam.x - 400) < 1, `x 应收敛到 400，实际 ${cam.x}`);
  assert.strictEqual(cam.screenToWorld(100), 500);
  assert.strictEqual(cam.worldToScreen(500), 100);

  cam.jumpTo(99999);
  assert.strictEqual(cam.x, 912);
  cam.jumpTo(0);
  assert.strictEqual(cam.x, 0);

  const narrow = vm.runInContext('new Camera({ canvas: __canvas, worldW: 500 })', h.context);
  assert.strictEqual(narrow.maxX, 0, '世界比视口窄时不可滚动');
}

function testGridFromEvent() {
  const h = build();
  h.context.__canvas = h.canvas;
  const cam = vm.runInContext('new Camera({ canvas: __canvas, worldW: 1872 })', h.context);
  const grid = (cx, cy) => vm.runInContext('getGridFromEvent', h.context)({ clientX: cx, clientY: cy }, h.canvas);

  // 画布左上角在 client (100,50)；视口内第 0 格中心 = client (136, 86)
  assert.deepStrictEqual(pick(grid(136, 86)), { gx: 0, gy: 0 });
  assert.strictEqual(grid(99, 86), null, '视口外返回 null');
  assert.strictEqual(grid(136, 483), null);

  // 左、中、右三个镜头位置，点击同一屏幕点命中的世界格 = (screen + camera.x) / 72
  for (const camX of [0, 300, 912]) {
    cam.jumpTo(camX);
    const sx = 500; // 画布坐标
    const g = grid(100 + sx, 50 + 200);
    assert.strictEqual(g.gx, Math.floor((sx + camX) / 72), `camera.x=${camX} 时列号正确`);
    assert.strictEqual(g.gy, Math.floor(200 / 72));
    assert.strictEqual(g.x, sx + camX, '返回世界坐标');
  }

  // 视觉位置与命中一致：把世界格 (24, 3) 的中心转回屏幕，再点它，必须命中同一格
  cam.jumpTo(912);
  const gridToPixel = vm.runInContext('gridToPixel', h.context);
  const wp = gridToPixel(24, 3);
  const screenX = cam.worldToScreen(wp.x);
  assert.ok(screenX >= 0 && screenX <= 960, '格 24 在最右镜头位置可见');
  const hit = grid(100 + screenX, 50 + wp.y);
  assert.deepStrictEqual(pick(hit), { gx: 24, gy: 3 });
}

function pick(g) { return g && { gx: g.gx, gy: g.gy }; }

function testPanAndInput() {
  const h = build();
  h.context.__canvas = h.canvas;
  h.context.__blockTower = false;
  const cam = vm.runInContext(
    'new Camera({ canvas: __canvas, worldW: 1872, hitTower: () => __blockTower })', h.context);
  cam.bindInput();

  // 滚轮：横向/纵向都映射成左右滚动
  const wheelEv = (dx, dy) => ({ deltaX: dx, deltaY: dy, deltaMode: 0, preventDefault() { this.stopped = true; } });
  let ev = wheelEv(0, 200);
  h.canvas.fire('wheel', ev);
  assert.strictEqual(cam.targetX, 200);
  assert.ok(ev.stopped, '滚轮默认行为被阻止（页面不跟着滚）');
  h.canvas.fire('wheel', wheelEv(-50, 0));
  assert.strictEqual(cam.targetX, 150);

  // 键盘：D 向右，A 向左；按住期间每帧累加
  cam.jumpTo(0);
  h.doc.fire('keydown', { key: 'd', preventDefault() {}, target: {} });
  let t = h.tick(0);
  cam.update(t);
  for (let i = 0; i < 10; i++) cam.update(t += 16);
  assert.ok(cam.targetX > 100, `按住 D 应向右滚动，实际 ${cam.targetX}`);
  h.doc.fire('keyup', { key: 'd' });
  const frozen = cam.targetX;
  cam.update(t += 16);
  assert.strictEqual(cam.targetX, frozen, '松开后不再累加');
  h.doc.fire('keydown', { key: 'ArrowLeft', preventDefault() {}, target: {} });
  for (let i = 0; i < 10; i++) cam.update(t += 16);
  assert.ok(cam.targetX < frozen, '← 向左滚动');
  h.doc.fire('keyup', { key: 'ArrowLeft' });

  // 输入框聚焦时不响应键盘
  cam.jumpTo(300);
  h.doc.fire('keydown', { key: 'd', preventDefault() {}, target: { tagName: 'INPUT' } });
  cam.update(t += 16); cam.update(t += 16);
  assert.strictEqual(cam.targetX, 300);

  // 鼠标拖拽：未超阈值不算平移（点击照常）；超过 8px 才平移；方向与手势相反
  cam.jumpTo(300);
  h.canvas.fire('mousedown', { button: 0, clientX: 500, clientY: 200 });
  h.doc.fire('mousemove', { clientX: 504, clientY: 200 });
  h.doc.fire('mouseup', {});
  assert.strictEqual(cam.x, 300);
  assert.strictEqual(cam.wasJustPanned(), false, '位移不足 8px 不触发平移，click 不会被吞');

  h.canvas.fire('mousedown', { button: 0, clientX: 500, clientY: 200 });
  h.doc.fire('mousemove', { clientX: 440, clientY: 200 });
  assert.strictEqual(cam.x, 360, '向左拖 60px，镜头右移 60px');
  h.doc.fire('mouseup', {});
  assert.strictEqual(cam.wasJustPanned(), true, '平移松手时的合成 click 会被吞掉');

  // 在炮塔上按下：不平移
  cam.jumpTo(300);
  h.context.__blockTower = true;
  h.canvas.fire('mousedown', { button: 0, clientX: 500, clientY: 200 });
  h.doc.fire('mousemove', { clientX: 300, clientY: 200 });
  h.doc.fire('mouseup', {});
  assert.strictEqual(cam.x, 300, '按在炮塔上拖动不平移镜头');
  h.context.__blockTower = false;

  // 触摸：单指在空白处拖动平移
  cam.jumpTo(300);
  h.canvas.fire('touchstart', { touches: [{ identifier: 1, clientX: 600, clientY: 200 }] });
  h.canvas.fire('touchmove', { touches: [{ identifier: 1, clientX: 540, clientY: 200 }] });
  assert.strictEqual(cam.x, 360);
  h.canvas.fire('touchend', { touches: [] });
  assert.strictEqual(cam.wasJustPanned(), true);

  // 边缘自动滚动：卡片拖到视口左右边缘 48px 内
  let drag = null;
  h.context.__drag = () => drag;
  const edge = vm.runInContext(
    'new Camera({ canvas: __canvas, worldW: 1872, getDragPoint: __drag })', h.context);
  edge.jumpTo(400);
  edge.update(h.tick(1000));
  drag = { clientX: 100 + 960 - 10, clientY: 200 }; // 距右缘 10px
  for (let i = 1; i <= 10; i++) edge.update(h.tick(1000 + i * 16));
  assert.ok(edge.targetX > 400, '拖到右缘 → 向右滚动');
  const right = edge.targetX;
  drag = { clientX: 100 + 480, clientY: 200 }; // 中间
  edge.update(h.tick(2000)); edge.update(h.tick(2016));
  assert.strictEqual(edge.targetX, right, '不在边缘不滚动');
  drag = { clientX: 100 + 5, clientY: 200 };
  for (let i = 1; i <= 10; i++) edge.update(h.tick(3000 + i * 16));
  assert.ok(edge.targetX < right, '拖到左缘 → 向左滚动');
  drag = { clientX: 100 + 5, clientY: 50 + 432 + 80 }; // 指针在画布下方（仍在卡片栏）
  const before = edge.targetX;
  for (let i = 1; i <= 10; i++) edge.update(h.tick(4000 + i * 16));
  assert.strictEqual(edge.targetX, before, '指针在画布外（卡片栏上）不触发边缘滚动');

  cam.unbindInput();
  const x0 = cam.targetX;
  h.canvas.fire('wheel', wheelEv(0, 500));
  assert.strictEqual(cam.targetX, x0, 'unbindInput 解除全部监听');
}

function testLevels() {
  const context = vm.createContext({ console, Math, Number, Map, Set, Array, Object, window: {}, document: {} });
  for (const f of ['js/config.js', 'js/config/domain-01.js', 'js/levelsData.js', 'js/data/levels/part-01.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), context, { filename: f });
  }
  const C = vm.runInContext('CONFIG', context);
  const levels = vm.runInContext('LEVELS_DATA', context);
  const ids = Object.keys(levels);
  assert.deepStrictEqual(ids.sort(), ['1-1', '1-2']);
  for (const id of ids) {
    const lv = levels[id];
    const p = lv.path;
    for (const c of p) {
      assert.ok(c.x >= 0 && c.x < C.GRID_COLS && c.y >= 0 && c.y < C.GRID_ROWS, `${id} 路径格 (${c.x},${c.y}) 在 ${C.GRID_COLS}x${C.GRID_ROWS} 网格内`);
    }
    for (let i = 1; i < p.length; i++) {
      const d = Math.abs(p[i].x - p[i - 1].x) + Math.abs(p[i].y - p[i - 1].y);
      assert.strictEqual(d, 1, `${id} 路径相邻格必须直角相邻（第 ${i} 格）`);
    }
    const keys = new Set(p.map((c) => `${c.x},${c.y}`));
    assert.strictEqual(keys.size, p.length, `${id} 路径不重复经过同一格`);
    assert.deepStrictEqual({ x: lv.core.x, y: lv.core.y }, { x: p[p.length - 1].x, y: p[p.length - 1].y }, `${id} 核心在路径终点`);
    assert.strictEqual(p[0].x, 0, `${id} 从左侧入场`);
    assert.strictEqual(lv.core.x, C.GRID_COLS - 1, `${id} 从右侧出口`);
  }
  // 1-2 蛇形三段：上游行 < 中游行 < 下游行，入口在左上、出口在右下
  const l2 = levels['1-2'];
  assert.ok(l2.path[0].y < l2.core.y, '1-2 入口在左上、出口在右下');
  assert.strictEqual(new Set(l2.path.map((c) => c.y)).size, 5, '1-2 经过 0..4 五行：三段横向 + 两处竖连');
}

function testConquestRing() {
  // 与 ConquestGame.buildPath / buildPlacementGrid 同一公式（不实例化类）：22 × 6 环形回路，内圈 20 × 4
  const { context } = build();
  const C = vm.runInContext('CONFIG', context);
  const COLS = C.CONQUEST_COLS, ROWS = C.GRID_ROWS;
  const inner = (COLS - 2) * (ROWS - 2);
  assert.strictEqual(inner, 80);
  assert.strictEqual(COLS - 2, 20);
  assert.strictEqual(ROWS - 2, 4);
  const src = fs.readFileSync(path.join(ROOT, 'js/modes/conquest/misc.js'), 'utf8');
  assert.ok(/this\.COLS/.test(src) && !/COLS\s*=\s*\d/.test(src), '征服模式列数不得写死');
  const game = fs.readFileSync(path.join(ROOT, 'js/conquestGame.js'), 'utf8');
  assert.ok(/this\.COLS = CONFIG\.CONQUEST_COLS/.test(game), '征服列数读配置');
}

testConfig();
testCameraBasics();
testGridFromEvent();
testPanAndInput();
testLevels();
testConquestRing();
console.log('镜头与网格测试通过：配置、镜头夹取/平滑、左中右命中、滚轮/键盘/拖拽/边缘滚动、关卡路径结构、征服环形回路尺寸');
