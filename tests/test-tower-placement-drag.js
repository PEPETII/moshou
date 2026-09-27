const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

class FakeTarget {
  constructor() {
    this.listeners = new Map();
    this.children = [];
    this.dataset = {};
    this.classes = new Set();
    this.capturedPointerIds = new Set();
    this.classList = {
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
      contains: (name) => this.classes.has(name),
      toggle: (name, force) => {
        const enabled = force === undefined ? !this.classes.has(name) : force;
        if (enabled) this.classes.add(name);
        else this.classes.delete(name);
        return enabled;
      },
    };
  }

  set innerHTML(value) {
    this._innerHTML = value;
    if (value === "") this.children = [];
  }

  get innerHTML() {
    return this._innerHTML;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.set(
      type,
      (this.listeners.get(type) || []).filter((item) => item !== listener),
    );
  }

  dispatch(type, properties = {}) {
    const event = {
      type,
      target: this,
      currentTarget: this,
      preventDefault() { this.defaultPrevented = true; },
      ...properties,
    };
    for (const listener of [...(this.listeners.get(type) || [])]) listener(event);
    return event;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  querySelectorAll(selector) {
    return selector === ".tower-select" ? this.children : [];
  }

  setAttribute() {}

  setPointerCapture(pointerId) {
    this.capturedPointerIds.add(pointerId);
  }
}

function loadScript(context, relativePath) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
  vm.runInContext(source, context, { filename: relativePath });
}

function createHarness() {
  const bottomBar = new FakeTarget();
  const document = new FakeTarget();
  document.getElementById = (id) => id === "bottom-bar" ? bottomBar : null;
  document.querySelector = () => null;
  document.querySelectorAll = () => [];
  document.createElement = () => new FakeTarget();

  const window = new FakeTarget();
  window.DeviceProfile = { hasTouch: false };
  const context = vm.createContext({
    console,
    document,
    window,
    Map,
    Set,
    Math,
    Number,
    setTimeout,
    clearTimeout,
    Game: function Game() {},
  });

  [
    "js/config.js",
    "js/config/domain-01.js",
    "js/config/domain-02.js",
    "js/config/domain-03.js",
    "js/config/fusion.js",
    "js/utils.js",
    "js/ui.js",
    "js/ui/input.js",
    "js/ui/input-touch.js",
    "js/ui/menu.js",
  ].forEach((file) => loadScript(context, file));

  vm.runInContext("function gridKey(gx, gy) { return `${gx},${gy}`; }", context);
  vm.runInContext(`
    class Tower {
      constructor(type, gx, gy) {
        this.type = type;
        this.gx = gx;
        this.gy = gy;
        this.char = CONFIG.TOWERS[type].char;
        this.isFusion = false;
      }
    }
  `, context);
  loadScript(context, "js/core/towers.js");
  loadScript(context, "js/core/rendering.js");

  const canvas = new FakeTarget();
  canvas.width = 960;
  canvas.height = 432;
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 960, height: 432 });

  const game = vm.runInContext("Object.create(Game.prototype)", context);
  const towerIndex = new Map();
  game.ink = 500;
  game.gameEnded = false;
  game.inputLocked = false;
  game.inkTrailAnimation = { active: false };
  game._pathCellSet = new Set(["4,4"]);
  game._placementGridSet = new Set(["3,3", "5,5", "6,5"]);
  game.towers = [];
  game.runtimeIndexes = {
    getTowerAt(gx, gy) { return towerIndex.get(`${gx},${gy}`) || null; },
    rebuildTowers() {
      towerIndex.clear();
      for (const tower of game.towers) towerIndex.set(`${tower.gx},${tower.gy}`, tower);
    },
  };
  game.updateUI = () => game.ui.refreshTowerSelectAffordability();

  const ui = vm.runInContext("Object.create(UI.prototype)", context);
  ui.game = game;
  ui.canvas = canvas;
  ui._eventListeners = [];
  ui.hoveredCell = null;
  ui.selectedTower = null;
  ui.placementDrag = { active: false, type: null, pointerId: null, gx: null, gy: null };
  ui.suppressNextCanvasClick = false;
  ui.draggingTower = null;
  ui.dragStartPos = null;
  ui.dragCurrentPos = null;
  ui.isDragging = false;
  ui.dragJustCompleted = false;
  ui.dragThreshold = 5;
  ui.events = [];
  ui.showToast = (message) => ui.events.push(`toast:${message}`);
  ui.hideTowerInfo = () => ui.events.push("hide");
  ui.showTowerInfo = (tower) => ui.events.push(`info:${tower.char}`);
  game.ui = ui;

  ui.setupEventListeners();
  ui.createTowerSelects();

  const ctx = {
    calls: [],
    fillRect() { this.calls.push({ method: "fillRect", fillStyle: this.fillStyle }); },
    strokeRect() {},
    beginPath() {},
    arc() { this.calls.push({ method: "arc" }); },
    stroke() {},
    save() {},
    restore() {},
    strokeText(text, x, y) { this.calls.push({ method: "strokeText", text, x, y }); },
    fillText(text, x, y) { this.calls.push({ method: "fillText", text, x, y }); },
  };
  game.ctx = ctx;
  game.canvas = canvas;

  return { context, document, bottomBar, canvas, game, ui, ctx };
}

function pointer(pointerId, pointerType, clientX, clientY) {
  return {
    pointerId,
    pointerType,
    button: 0,
    isPrimary: true,
    clientX,
    clientY,
  };
}

function cardFor(bottomBar, type) {
  const card = bottomBar.children.find((item) => item.dataset.type === type);
  assert(card, `missing tower card: ${type}`);
  return card;
}

function dragCard(harness, type, pointerId, pointerType, x, y) {
  const start = pointer(pointerId, pointerType, 1100, 500);
  cardFor(harness.bottomBar, type).dispatch("pointerdown", start);
  harness.document.dispatch("pointermove", pointer(pointerId, pointerType, x, y));
  return pointer(pointerId, pointerType, x, y);
}

function main() {
  const h = createHarness();
  const originalInk = h.game.ink;
  const fireCard = cardFor(h.bottomBar, "fire");

  fireCard.dispatch("pointerdown", pointer(1, "mouse", 1100, 500));
  h.document.dispatch("pointerup", pointer(1, "mouse", 1100, 500));
  fireCard.dispatch("click");
  assert.strictEqual(h.game.towers.length, 0, "a card click must not build or select a tower");
  assert.strictEqual(h.game.ink, originalInk);
  assert.strictEqual(h.ui.placementDrag.active, false);

  let release = dragCard(h, "fire", 2, "mouse", 3 * 48 + 24, 3 * 48 + 24);
  assert(fireCard.capturedPointerIds.has(2), "the card captures its active pointer");
  assert.strictEqual(h.ui.placementDrag.gx, 3);
  assert.strictEqual(h.ui.placementDrag.gy, 3);
  h.ctx.calls.length = 0;
  h.game.drawPlacementPreview();
  assert.strictEqual(h.ctx.calls.find((call) => call.method === "fillRect").fillStyle, "rgba(0, 255, 0, 0.3)");
  assert(h.ctx.calls.some((call) => call.method === "arc"), "valid cells show attack range");
  h.document.dispatch("pointerup", release);
  assert.strictEqual(h.game.towers.length, 1);
  assert.strictEqual(h.game.ink, originalInk - CONFIG_COST(h.context, "fire"));
  assert.strictEqual(h.ui.placementDrag.active, false);
  assert.strictEqual(h.ui.draggingTower, null, "placement must not use fusion drag state");

  h.canvas.dispatch("click", pointer(2, "mouse", 3 * 48 + 24, 3 * 48 + 24));
  assert.strictEqual(h.ui.selectedTower, null, "the synthesized post-placement click is ignored");
  h.canvas.dispatch("click", pointer(3, "mouse", 3 * 48 + 24, 3 * 48 + 24));
  assert.strictEqual(h.ui.selectedTower, h.game.towers[0], "ordinary Canvas clicks still inspect towers");
  h.canvas.dispatch("click", pointer(4, "mouse", 4 * 48 + 24, 4 * 48 + 24));
  assert.strictEqual(h.ui.selectedTower, null, "clicking a blank cell closes the info panel");

  release = dragCard(h, "water", 5, "mouse", 3 * 48 + 24, 3 * 48 + 24);
  h.ctx.calls.length = 0;
  h.game.drawPlacementPreview();
  assert.strictEqual(h.ctx.calls.find((call) => call.method === "fillRect").fillStyle, "rgba(255, 0, 0, 0.3)");
  const inkBeforeOccupiedDrop = h.game.ink;
  h.document.dispatch("pointerup", release);
  assert.strictEqual(h.game.ink, inkBeforeOccupiedDrop);
  assert(h.ui.events.some((item) => item.includes("该位置已有炮塔")));

  release = dragCard(h, "fire", 6, "mouse", 980, 500);
  const towerCountBeforeOutsideDrop = h.game.towers.length;
  const inkBeforeOutsideDrop = h.game.ink;
  h.document.dispatch("pointerup", release);
  assert.strictEqual(h.game.towers.length, towerCountBeforeOutsideDrop, "release outside the field cancels placement");
  assert.strictEqual(h.game.ink, inkBeforeOutsideDrop);

  h.game.ink = 50;
  h.ui.refreshTowerSelectAffordability();
  fireCard.dispatch("pointerdown", pointer(7, "mouse", 1100, 500));
  assert.strictEqual(h.ui.placementDrag.active, false, "an unaffordable card cannot start placement");
  assert(h.ui.events.some((item) => item.includes("墨水不足（需 120 墨）")));
  h.game.ink = 500;
  h.ui.refreshTowerSelectAffordability();

  release = dragCard(h, "wood", 8, "mouse", 4 * 48 + 24, 4 * 48 + 24);
  const inkBeforeInvalidDrop = h.game.ink;
  h.document.dispatch("pointerup", release);
  assert.strictEqual(h.game.ink, inkBeforeInvalidDrop);
  assert(h.ui.events.some((item) => item.includes("这里不能建造")));

  release = dragCard(h, "mountain", 9, "mouse", 3 * 48 + 24, 3 * 48 + 24);
  h.document.dispatch("pointerup", release);
  assert(h.ui.events.some((item) => item.includes("只能放在路径上")));
  release = dragCard(h, "mountain", 10, "mouse", 4 * 48 + 24, 4 * 48 + 24);
  h.document.dispatch("pointerup", release);
  assert.strictEqual(h.game.towers.length, 2, "the mountain tower remains placeable on a path cell");

  release = dragCard(h, "water", 11, "touch", 5 * 48 + 24, 5 * 48 + 24);
  assert.strictEqual(h.ui.placementDrag.pointerType, "touch", "touch uses the same placement state");
  h.ctx.calls.length = 0;
  h.game.drawPlacementPreview();
  const ghost = h.ctx.calls.find((call) => call.method === "strokeText" && call.text === "水");
  assert.strictEqual(ghost.y, 5 * 48 + 24 - 52, "touch ghost is raised 52 CSS pixels above the finger");
  h.document.dispatch("pointerup", release);
  assert.strictEqual(h.game.towers.length, 3);

  const inkBeforeCancel = h.game.ink;
  cardFor(h.bottomBar, "wood").dispatch("pointerdown", pointer(12, "touch", 1100, 500));
  h.document.dispatch("pointermove", pointer(12, "touch", 6 * 48 + 24, 5 * 48 + 24));
  h.document.dispatch("pointercancel", pointer(12, "touch", 6 * 48 + 24, 5 * 48 + 24));
  assert.strictEqual(h.ui.placementDrag.active, false, "pointercancel clears the placement preview");
  assert.strictEqual(h.game.ink, inkBeforeCancel);

  const left = h.game.getTowerAt(5, 5);
  const right = { gx: 6, gy: 5, char: "木", isFusion: false };
  h.game.towers.push(right);
  h.game.runtimeIndexes.rebuildTowers();
  let fusionCall = null;
  h.ui.attemptFusion = (source, target) => { fusionCall = [source, target]; };
  h.canvas.dispatch("mousedown", pointer(13, "mouse", 5 * 48 + 24, 5 * 48 + 24));
  h.canvas.dispatch("mousemove", pointer(13, "mouse", 6 * 48 + 24, 5 * 48 + 24));
  h.canvas.dispatch("mouseup", pointer(13, "mouse", 6 * 48 + 24, 5 * 48 + 24));
  assert.deepStrictEqual(fusionCall, [left, right], "existing tower drag still reaches the fusion path");
  assert.strictEqual(h.ui.draggingTower, null);

  console.log("主游戏炮塔卡片拖放测试通过：鼠标/触屏放置、校验反馈、取消、预览与融合隔离");
}

function CONFIG_COST(context, type) {
  return vm.runInContext(`CONFIG.TOWERS["${type}"].cost`, context);
}

main();
