const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

function loadScript(context, relativePath) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
  vm.runInContext(source, context, { filename: relativePath });
}

// 记录描边次数的假 2D 上下文：一次 stroke() 即一条网格线
function createStrokeCtx() {
  return {
    strokes: 0,
    strokeStyle: "",
    lineWidth: 1,
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() { this.strokes++; },
  };
}

function createContext() {
  const fakeCanvas = {
    width: 960,
    height: 432,
    getContext() { return createLayerCtx(); },
  };
  const document = {
    createElement() { return { width: 0, height: 0, getContext() { return createLayerCtx(); } }; },
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  const window = {};
  const context = vm.createContext({
    console,
    document,
    window,
    Map,
    Set,
    Math,
    Number,
    Date,
    performance: { now: () => 0 },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => 0,
    Game: function Game() {},
    ConquestGame: function ConquestGame() {},
  });
  context.__fakeCanvas = fakeCanvas;
  return context;
}

function createLayerCtx() {
  return {
    calls: 0,
    clearRect() { this.calls++; },
    setTransform() {},
    fillRect() {},
    drawImage() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fill() {},
    save() {},
    restore() {},
    fillText() {},
    strokeRect() {},
  };
}

function loadGamePrototypes(context) {
  [
    "js/config.js",
    "js/config/domain-01.js",
    "js/config/domain-02.js",
    "js/config/domain-03.js",
    "js/config/glyph-battle.js",
    "js/utils.js",
    "js/core/rendering.js",
    "js/modes/conquest/rendering.js",
  ].forEach((file) => loadScript(context, file));
}

function makeGame(context) {
  const game = vm.runInContext("Object.create(Game.prototype)", context);
  game.canvas = { width: 960, height: 432 };
  game.ctx = createStrokeCtx();
  game.path = [];
  game.core = null;
  game.ui = null;
  return game;
}

function testPlacementPredicate() {
  const context = createContext();
  loadGamePrototypes(context);
  const game = makeGame(context);

  assert.strictEqual(game.isPlacementActive(), false, "no UI means no placement");
  assert.strictEqual(game.shouldShowGrid(), false);

  game.ui = { placementDrag: { active: false } };
  assert.strictEqual(game.shouldShowGrid(), false, "idle drag state hides the grid");

  game.ui.placementDrag.active = true;
  assert.strictEqual(game.shouldShowGrid(), true, "active placement shows the grid");

  game.ui.placementDrag.active = false;
  assert.strictEqual(game.shouldShowGrid(), false, "leaving placement hides the grid again");
}

function testMainGridDrawing() {
  const context = createContext();
  loadGamePrototypes(context);
  const game = makeGame(context);

  game.drawGrid();
  assert.strictEqual(game.ctx.strokes, 0, "drawGrid must not paint anything outside placement");

  game.ui = { placementDrag: { active: true } };
  game.drawGrid();
  const expected = vm.runInContext("CONFIG.GRID_COLS + 1 + CONFIG.GRID_ROWS + 1", context);
  assert.strictEqual(game.ctx.strokes, expected, "a full grid is painted while placing");

  game.ui.placementDrag.active = false;
  game.ctx.strokes = 0;
  game.drawGrid();
  assert.strictEqual(game.ctx.strokes, 0, "placement end stops painting immediately");
}

function testConquestGridDrawing() {
  const context = createContext();
  loadGamePrototypes(context);
  const conquest = vm.runInContext("Object.create(ConquestGame.prototype)", context);
  conquest.COLS = 22;
  conquest.ROWS = 6;
  conquest.CELL_SIZE = 72;
  conquest.ctx = createStrokeCtx();

  // 征服模式没有新塔放置流程，网格是棋盘分格本身，必须常驻
  conquest.isDragging = false;
  conquest.drawGrid();
  assert.strictEqual(conquest.ctx.strokes, 23 + 7, "conquest keeps its board grid while idle");

  conquest.isDragging = true;
  conquest.ctx.strokes = 0;
  conquest.drawGrid();
  assert.strictEqual(conquest.ctx.strokes, 23 + 7, "conquest grid is unaffected by tower dragging");
}

function testStaticLayerRebuildsOnStateChange() {
  const context = createContext();
  loadGamePrototypes(context);
  loadScript(context, "js/runtime.js");

  let gridVisible = false;
  let gridDraws = 0;
  let rebuilds = 0;
  const game = {
    path: [],
    inkRenderer: { ctx: null },
    canvas: { width: 960, height: 432 },
    worldW: 1872,
    shouldShowGrid: () => gridVisible,
    drawGrid: () => { gridDraws++; },
    drawPath: () => {},
    drawCore: () => {},
    drawLevelInfo: () => {},
  };

  context.__game = game;
  const instance = vm.runInContext("new StaticCanvasLayer(__game)", context);
  instance.draw({ drawImage() {} });
  assert.strictEqual(instance.canvas.width, 1872, "static layer is generated at world width, not viewport width");
  assert.strictEqual(instance.canvas.height, 432);
  gridDraws = 0;

  const targetCtx = { drawImage() { rebuilds++; } };

  instance.draw(targetCtx);
  assert.strictEqual(gridDraws, 0, "cached layer skips the grid while idle");
  assert.strictEqual(instance._gridVisible, false);

  gridVisible = true;
  instance.draw(targetCtx);
  assert.strictEqual(gridDraws, 1, "grid appears on the frame placement starts");
  assert.strictEqual(instance._gridVisible, true);

  instance.draw(targetCtx);
  assert.strictEqual(gridDraws, 1, "unchanged state does not rebuild the cache");

  gridVisible = false;
  instance.draw(targetCtx);
  assert.strictEqual(gridDraws, 1, "grid is gone once placement ends");
  assert.strictEqual(instance._gridVisible, false);
  assert.strictEqual(instance.dirty, false, "cache is rebuilt eagerly, not deferred");
}

function main() {
  testPlacementPredicate();
  testMainGridDrawing();
  testConquestGridDrawing();
  testStaticLayerRebuildsOnStateChange();
  console.log("网格显隐测试通过：主模式仅放置态绘制网格，退出放置态即时隐藏，静态层随之重建；征服模式网格常驻");
}

main();
