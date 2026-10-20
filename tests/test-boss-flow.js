/**
 * 首领胜负流程（工单 01 §3.3、工单 10 §2）：关底「坚守 + 斩首」。
 * 覆盖胜负表的六种情况、早杀减半计时、决战停刷、首领到达核心的两次处理、卷土重来的无敌、
 * 复生期间计时结束、倒计时文字三种状态，以及没有首领的关卡行为不变。
 */
const { createEnv, makeChecker } = require('./helpers/glyph-env');

const env = createEnv();
const { X, vt, run, makeGame, CELL, seed } = env;
const { CONFIG, BattleDirector, BossFlow } = X;
const { check, near, finish } = makeChecker();
const B = CONFIG.BOSS;

const LEVEL = {
  id: 'boss-test', coreHp: 20, holdSeconds: 30, hpMul: 1,
  roster: [{ type: 'corpse', weight: 1 }],
  boss: { type: 'baiguiyexing', at: 5 },
};

function battle(level, density) {
  const g = makeGame();
  g.currentLevelData = level;
  g.coreHp = g.maxCoreHp = 20;
  g.resetBattleState(level);
  g.result = null;
  g.gameOver = function(v) { this.gameEnded = true; this.victory = v; this.result = v ? 'win' : 'lose'; this.battleActive = false; };
  BattleDirector.begin(g, density || 'normal');
  return g;
}
const step = (g, sec) => { for (let i = 0; i < Math.round(sec * 60); i++) { if (g.gameEnded) break; BattleDirector.update(g, 1 / 60); } };
// 让首领出场并返回它（静止）
function withBoss(g) {
  step(g, LEVEL.boss.at + 0.1);
  const b = g.boss;
  b.baseSpeed = b.speed = 0;
  return b;
}
const kill = (b) => b.hit(1e9, { kind: 'water' });
// 首领逐字打碎直到最后（rebirth 会拦下最后一击，需要的话多打一次）
const slay = (b) => { for (let i = 0; i < 6 && !b.dead; i++) kill(b); };

// ---------- 配置 ----------
check('BOSS 配置集中：缓冲期、早杀系数、到达核心扣比例与次数、决战停刷', B.entryCalmSeconds === 10 && B.entryCalmRateMul === 0.5 && B.killEarlyHoldMul === 0.5
  && B.coreHitRatio === 0.5 && B.maxCoreHits === 1 && B.duelSpawnStop === true);
check('首领血量倍率按档位 0.75 / 0.9 / 1.0', B.hpMulByDensity.sparse === 0.75 && B.hpMulByDensity.normal === 0.9 && B.hpMulByDensity.flood === 1);

// ---------- 情况 1：计时结束，首领已死，核心血量 > 0 → 胜利 ----------
{
  const g = battle(LEVEL);
  const b = withBoss(g);
  g.holdLeft = 20;
  slay(b);
  check('斩首：首领死亡、bossSlain 置位', b.dead && g.bossSlain === true);
  check('情况 3：计时结束前斩首，剩余坚守时间立即减半', near(g.holdLeft, 10, 0.1), String(g.holdLeft));
  check('情况 3：横幅「首级已斩」', g.bossBanner && g.bossBanner.text === '首级已斩');
  check('情况 3：倒计时文字附「首级已斩」', /首级已斩/.test(BattleDirector.holdLabel(g)));
  step(g, 5);
  check('减半后计时继续，没有立刻胜利', !g.gameEnded);
  step(g, 6);
  check('情况 1：计时结束、首领已死、核心血量 > 0 → 胜利', g.gameEnded && g.victory === true && g.coreHp === 20);
}

// ---------- 情况 2：计时结束但首领还活着 → 决战 ----------
{
  const g = battle(LEVEL);
  const b = withBoss(g);
  g.holdLeft = 0.05;
  step(g, 0.2);
  check('情况 2：计时结束而首领活着 → 进入决战，没有结算', g.duel === true && !g.gameEnded);
  check('决战：倒计时文字变「斩首」', BattleDirector.holdLabel(g) === '斩首');
  const normals = g.enemies.filter((e) => !e.summoned && e.type !== 'baiguiyexing').length;
  step(g, 5);
  check('决战期间停止普通刷怪', g.enemies.filter((e) => !e.summoned && e.type !== 'baiguiyexing').length === normals);
  const summoned = g.enemies.filter((e) => e.summoned).length;
  b.ab.summon.cd = 0.01;
  b.ab.summon.n = 0;
  b.sealed = false;
  run(g, 0.2);
  check('决战期间召唤物照出（首领的能力不受影响）', g.enemies.filter((e) => e.summoned).length > summoned);
  slay(b);
  step(g, 0.2);
  check('决战中首领死亡且核心血量 > 0 → 胜利', g.gameEnded && g.victory === true);
}

// ---------- 情况 4、5：首领到达核心 ----------
{
  const g = battle(LEVEL);
  const b = withBoss(g);
  b.hit(900, { kind: 'water' });
  const hp = b.hp;
  b.s = b.track.total - 3;
  b.baseSpeed = b.speed = 1;
  b.advance(16);
  check('情况 4：首领第 1 次到达核心，扣核心上限的 50%（10 点）', g.coreHp === 10 && !g.gameEnded);
  check('首领带着当前血量回到入口重新走，没有死亡', !b.dead && b.s === 0 && b.hp === hp);
  check('卷土重来：入场后 2 秒内免疫一切伤害', b.invulnT > 1.9 && (b.hit(500, { kind: 'water' }), b.hp === hp));
  check('横幅「首领破阵 · 卷土重来」', g.bossBanner && g.bossBanner.text === '首领破阵 · 卷土重来');
  check('首领的 damage 字段不再用来扣核心血量', g.coreHp === 10);
  b.s = b.track.total - 3;
  b.advance(16);
  check('情况 5：首领第 2 次到达核心 → 直接失败，原因「首领破阵」', g.gameEnded && g.victory === false && g.failReason === 'boss');
}
{
  // 回到入口时清空状态
  const g = battle(LEVEL);
  const b = withBoss(g);
  b.carried = {}; b.stun = 3; b.slowTime = 3; b.burnTime = 3; b.stagger = 50; b.exposeTime = 3;
  b.s = b.track.total - 1;
  b.advance(16);
  check('回到入口时清空 carried、stun 与各种状态', b.carried === null && b.stun === 0 && b.slowTime === 0 && b.burnTime === 0 && b.stagger === 0 && b.exposeTime === 0);
}

// ---------- 情况 6：核心血量归零 → 失败（失败优先） ----------
{
  const g = battle(LEVEL);
  const b = withBoss(g);
  g.coreHp = 0;
  slay(b);
  step(g, 1);
  check('情况 6：核心血量为 0 时斩首也不判胜（失败优先）', g.victory !== true && !(g.gameEnded && g.victory));
  const g2 = battle(LEVEL);
  withBoss(g2);
  g2.coreHp = 5;
  g2.boss.s = g2.boss.track.total - 1;
  g2.boss.advance(16);
  check('首领到达核心扣完核心血量 → 失败', g2.gameEnded && g2.victory === false);
}

// ---------- 复生期间计时结束 ----------
{
  const lv4 = Object.assign({}, LEVEL, { boss: { type: 'wanjiebufu', at: 5 } });
  const g2 = battle(lv4);
  step(g2, 5.1);
  const w = g2.boss;
  w.baseSpeed = w.speed = 0;
  w.hit(3000, { kind: 'water' }); w.hit(3000, { kind: 'water' }); w.hit(3000, { kind: 'water' });
  w.hit(99999, { kind: 'water' });
  check('复生蓄生中：首领不死', !w.dead && w.lethalHold);
  g2.holdLeft = 0.05;
  step(g2, 0.2);
  check('情况 6（复生）：计时结束时首领正处于蓄生 → 进入决战，等复生结束后照常判定', g2.duel === true && !g2.gameEnded);
  run(g2, 3.2);
  slay(w);
  step(g2, 0.2);
  check('复生结束后斩首 → 胜利', g2.gameEnded && g2.victory === true);
}

// ---------- 没有首领的关卡：行为与改动前完全一样 ----------
{
  const lv = { id: 'plain', coreHp: 20, holdSeconds: 10, roster: [{ type: 'corpse', weight: 1 }] };
  const g = battle(lv);
  step(g, 9.9);
  check('无首领：倒计时文字是 mm:ss', /^00:0\d$/.test(BattleDirector.holdLabel(g)) && !g.gameEnded);
  step(g, 0.3);
  check('无首领：计时结束且核心血量 > 0 即胜', g.gameEnded && g.victory === true && g.holdLeft === 0);
  const g2 = battle(lv);
  g2.coreHp = 0;
  step(g2, 11);
  check('无首领：核心血量为 0 时不判胜', !(g2.gameEnded && g2.victory));
}

// ---------- 首领出场信息 ----------
{
  const g = battle(LEVEL);
  step(g, 5.1);
  check('首领出场：横幅显示首领名', g.bossBanner && /百鬼夜行/.test(g.bossBanner.text));
  check('首领出场：BossFlow.active 为真', BossFlow.active(g));
  slay(g.boss);
  check('首领被斩后 active 为假', !BossFlow.active(g));
  const heavy = CONFIG.BOSS.killHeavyMul;
  check('首领击杀的重击反馈倍率配置存在', heavy === 2);
}

finish('首领胜负流程测试通过');
