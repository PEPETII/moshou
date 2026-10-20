// 敌人生成时机与位置（工单 2026-10-20）。
// 三个契约：
//   1. 未点「开战」：BattleDirector 不刷怪、坚守计时不走；
//   2. 点「开战」当帧不预铺，之后所有敌人都从入口生成，不在路径中段凭空出现；
//   3. 开战即收掉开场演出，塔卡不会停在「隐藏 + 不可点」状态进入战斗。
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

const CONFIG_FILES = [
  "js/config.js",
  "js/config/domain-01.js",
  "js/config/domain-02.js",
  "js/config/domain-03.js", "js/config/enemies-single.js", "js/config/enemies-multi.js", "js/config/enemies-boss.js",
  "js/config/glyph-battle.js", "js/config/control-rules.js", "js/config/boss-battle.js",
  "js/config/glyphs.js",
  "js/config/glyphs-ext.js",
  "js/config/glyphs-fusion.js",
  "js/config/fusion.js",
];

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

function createContext() {
  const context = vm.createContext({
    console,
    Math,
    Number,
    Date,
    Map,
    Set,
    JSON,
    window: null,
  });
  context.window = context;
  for (const file of CONFIG_FILES) {
    vm.runInContext(read(file), context, { filename: file });
  }
  return context;
}

function createSpawnerEnv() {
  const context = createContext();
  for (const f of ["js/core/spawn-schedule.js", "js/core/spawner.js", "js/core/boss.js"]) vm.runInContext(read(f), context, { filename: f });
  return { context, director: context.BattleDirector, CONFIG: context.CONFIG };
}

// 灌入 waves.js 的 Game 原型（只要 beginBattle）
function createBattleEnv() {
  const context = createContext();
  for (const f of ["js/core/spawn-schedule.js", "js/core/spawner.js", "js/core/boss.js"]) vm.runInContext(read(f), context, { filename: f });
  vm.runInContext("class Game {}\n" + read("js/core/waves.js"), context, { filename: "js/core/waves.js" });
  return { context, Game: vm.runInContext("Game", context), CONFIG: context.CONFIG };
}

// 假宿主：spawnGlyphEnemy 模拟真实敌人的初始里程（入口 + startSpread 随机）
function makeHost(CONFIG) {
  return {
    enemies: [],
    battleActive: false,
    density: null,
    spawnAcc: 0,
    giantTimer: 0,
    holdTotal: CONFIG.HOLD_SECONDS,
    holdLeft: CONFIG.HOLD_SECONDS,
    kills: 0,
    leaks: 0,
    coreHp: 20,
    gameEnded: false,
    currentLevelData: { holdSeconds: 150 },
    spawned: [],
    spawnGlyphEnemy(type) {
      this.spawned.push(type);
      const enemy = {
        type,
        // 真 Enemy 构造时就是 s = random × startSpread，这里用固定值便于断言
        s: CONFIG.SPAWN.startSpread / 2,
        track: { total: 1800 },
        syncCount: 0,
        syncPosition() {
          this.syncCount++;
        },
      };
      this.enemies.push(enemy);
      return enemy;
    },
    aliveEnemyCount() {
      return this.enemies.length;
    },
    gameOver(victory) {
      this.gameEnded = true;
      this.victory = victory;
    },
  };
}

function tick(host, director, seconds) {
  const dt = 1 / 60;
  const frames = Math.round(seconds / dt);
  for (let i = 0; i < frames; i++) director.update(host, dt);
}

function run() {
  const { CONFIG, director } = createSpawnerEnv();
  assert.ok(director, "BattleDirector 应挂到全局");
  assert.ok(!("prefillCount" in CONFIG.SPAWN), "开局预铺配置应已移除");
  assert.strictEqual(typeof director.prefill, "undefined", "BattleDirector 不应再有 prefill");

  // 1. 未开战：不刷怪、不走坚守计时
  {
    const host = makeHost(CONFIG);
    tick(host, director, 10);
    assert.strictEqual(host.spawned.length, 0, "未点「开战」不得生成任何敌人");
    assert.strictEqual(host.enemies.length, 0, "未点「开战」场上不应有敌人");
    assert.strictEqual(host.holdLeft, CONFIG.HOLD_SECONDS, "未点「开战」坚守计时不应减少");
    assert.strictEqual(host.battleActive, false, "未点「开战」battleActive 应为 false");
    assert.strictEqual(host.gameEnded, false, "未开战不应结算");
  }

  // 2. 开战：当帧不预铺；之后敌人从入口生成，且不被调度器搬到路径中段
  {
    const host = makeHost(CONFIG);
    director.begin(host, "flood");
    assert.strictEqual(host.battleActive, true, "开战后 battleActive 应为 true");
    assert.strictEqual(host.density, "flood");
    assert.strictEqual(host.spawned.length, 0, "开战当帧不得预铺敌人");
    assert.strictEqual(host.enemies.length, 0, "开战当帧路径上应为空");

    tick(host, director, 0.5);
    assert.ok(host.spawned.length > 0, "开战后应开始从入口刷怪");
    const entryStart = CONFIG.SPAWN.startSpread;
    assert.ok(host.enemies.every((e) => e.s >= 0 && e.s <= entryStart),
      "所有敌人都应在入口（s ≤ startSpread）生成");
    assert.ok(host.enemies.every((e) => e.syncCount === 0),
      "调度器不得改写敌人里程（预铺会调 syncPosition 把敌人摆到中段）");
    assert.ok(host.holdLeft < CONFIG.HOLD_SECONDS, "开战后坚守计时应开始走");
  }

  // 3. 开战即收掉开场演出，塔卡恢复可用
  {
    const { context, Game } = createBattleEnv();
    const game = new Game();
    game.enemies = [];
    game.coreHp = 20;
    game.currentLevelData = { holdSeconds: 150 };
    game.runtimeIndexes = { rebuildEnemies() {} };
    game.updateUI = () => {};
    game.aliveEnemyCount = () => game.enemies.length;
    game.spawnGlyphEnemy = (type) => {
      const enemy = { type, s: 0, track: { total: 1800 }, syncPosition() {} };
      game.enemies.push(enemy);
      return enemy;
    };
    let stopped = 0;
    game.inkTrailAnimation = {
      active: true,
      stop() {
        stopped++;
        this.active = false;
      },
    };

    game.beginBattle("normal");
    assert.strictEqual(stopped, 1, "点「开战」应立即收掉开场演出");
    assert.strictEqual(game.battleActive, true, "开战后应处于战斗状态");
    assert.strictEqual(game.enemies.length, 0, "开战当帧仍不预铺，敌人随后从入口刷出");
    assert.strictEqual(context.CONFIG.SPAWN.prefillCount, undefined, "预铺配置不应复活");
  }

  console.log("✓ 敌人生成：开战前为 0，开战后从入口走进来");
}

run();
