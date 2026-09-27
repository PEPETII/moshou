const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

function createGameContext() {
  const context = vm.createContext({
    console,
    Math,
    Date,
    setTimeout,
    clearTimeout,
    CONFIG: { CELL_SIZE: 48 },
    window: {
      DeviceProfile: {
        isTouch: true,
        hasTouch: true,
        slop: 12,
        tapTolerance: 0.75,
        previewHoldMs: 0,
      },
      gameInstance: null,
    },
    document: {},
  });

  vm.runInContext(fs.readFileSync(path.join(ROOT, "js/utils.js"), "utf8"), context);
  vm.runInContext(`
    class ConquestGame {
      constructor() {
        this.canvas = {
          width: 768,
          height: 432,
          getBoundingClientRect() {
            return { left: 0, top: 0, width: 768, height: 432 };
          },
        };
        this.towers = [];
        this._towerIndex = new Map();
        this._handlers = {};
        this.events = [];
      }
      addTrackedEventListener(target, type, listener) {
        this._handlers[type] = listener;
      }
      _clearDragCache() {}
      _cacheDragMetrics() {}
      getTowerAt(gx, gy) {
        return this._towerIndex.get(gx + "," + gy) || null;
      }
      showTowerInfo(tower) {
        for (const item of this.towers) item.selected = item === tower;
        this.events.push("info:" + tower.char);
      }
      hideTowerInfo() {
        for (const item of this.towers) item.selected = false;
        this.events.push("hide");
      }
      attemptFusion(left, right) {
        this.events.push("fuse:" + left.char + "+" + right.char);
      }
    }
  `, context);
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, "js/modes/conquest/touch.js"), "utf8"),
    context,
  );
  return context;
}

function touchEvent(type, x, y) {
  return {
    touches: type === "touchend" ? [] : [{ identifier: 1, clientX: x, clientY: y }],
    changedTouches: [{ identifier: 1, clientX: x, clientY: y }],
    preventDefault() {},
  };
}

function main() {
  const context = createGameContext();
  const game = vm.runInContext("new ConquestGame()", context);
  const fire = { gx: 3, gy: 3, char: "火", selected: false, isFusion: false };
  const water = { gx: 5, gy: 3, char: "水", selected: false, isFusion: false };
  game.towers.push(fire, water);
  game._towerIndex.set("3,3", fire);
  game._towerIndex.set("5,3", water);
  game.setupTouchInteraction();

  const handlers = game._handlers;
  const firePoint = { x: 3 * 48 + 24, y: 3 * 48 + 24 };
  const waterPoint = { x: 5 * 48 + 24, y: 3 * 48 + 24 };

  handlers.touchstart(touchEvent("touchstart", firePoint.x, firePoint.y));
  handlers.touchend(touchEvent("touchend", firePoint.x, firePoint.y));
  handlers.touchstart(touchEvent("touchstart", waterPoint.x, waterPoint.y));
  handlers.touchend(touchEvent("touchend", waterPoint.x, waterPoint.y));

  const expected = "info:火|fuse:火+水";
  if (game.events.join("|") !== expected) {
    throw new Error(`点选融合状态不正确：${game.events.join("|")}`);
  }

  handlers.touchstart(touchEvent("touchstart", firePoint.x, firePoint.y));
  handlers.touchcancel({ preventDefault() {} });
  if (game._touchState || game.isDragging) {
    throw new Error("touchcancel 未清理触摸状态");
  }

  console.log("征服模式触摸回归测试通过：点选融合 + touchcancel 清理");
}

main();
