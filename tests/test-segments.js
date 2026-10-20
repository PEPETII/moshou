/**
 * 多字分段与能力框架（工单 07、09）。
 * 覆盖：分段扣血与溢出顺延、碎字后能力失效、能力冻结（被卷、眩晕不触发主动能力）、
 * 不可选中与范围显形、召唤出生位置与 ENEMY_CAP、白骨精骨字复原、尸鬼巨不受影响。
 */
const { createEnv, makeChecker } = require('./helpers/glyph-env');

const env = createEnv();
const { X, vt, run, spawnAt, makeGame, mk, CELL } = env;
const { CONFIG, EnemyAbilities, ControlRules, GlyphKit } = X;
const { check, near, finish } = makeChecker();

// 一只静止的多字敌人（速度 0），放在里程 s
function still(g, type, s) {
  const e = spawnAt(g, type, s);
  return e;
}

// ---------- 分段扣血 ----------
{
  const g = makeGame();
  const e = still(g, 'zhenmushou', 3 * CELL);
  check('三字敌人：字数、体量、总血量由配置推导', e.glyphCount === 3 && e.mass === 6 && near(e.maxHp, 1100) && e.isBoss === false && e.tier === 'greater');
  e.hit(300, { kind: 'fire' });
  check('受到正好等于第一段血量的伤害：第一段碎、第二段满血', e.segs[0].broken && !e.segs[1].broken && e.segs[1].hp === 300 && e.segIndex === 1);
  e.hit(450, { kind: 'fire' });
  check('一次溢出伤害连续打碎第二段并顺延到第三段', e.segs[1].broken && near(e.segs[2].hp, 500 - 150) && e.segIndex === 2 && !e.dead, `seg3=${e.segs[2].hp}`);
  const e2 = still(g, 'zhenmushou', 3 * CELL);
  e2.hit(700, { kind: 'water' });
  check('溢出伤害一次打碎两段', e2.segs[0].broken && e2.segs[1].broken && !e2.segs[2].broken && near(e2.segs[2].hp, 400));
  const kills = g.kills || 0;
  e2.hit(100000, { kind: 'water' });
  check('全部碎完才死亡，奖励只结算一次', e2.dead && (g.ink >= 90));
  check('碎字不算击杀（只有最后一字碎才计入）', (g.kills || 0) - kills === 1);
}

// ---------- 碎字后能力失效 ----------
{
  const g = makeGame();
  const zm = still(g, 'zhenmushou', 5 * CELL);
  const c = spawnAt(g, 'corpse', 5 * CELL, 100000);
  run(g, 0.2);
  check('镇字还在：光环内小怪受到的硬控时长 × 0.5', c.wardT > 0 && near(c.wardMul, 0.5));
  zm.hit(300, { kind: 'fire' });
  c.wardT = 0;
  run(g, 0.2);
  check('镇字碎后：镇压光环失效', !(c.wardT > 0));
  // 傀儡：傀字在时儡免疫硬控，傀字碎后速度 ×0.75 并可被控
  const p = still(g, 'puppet', 6 * CELL);
  const before = p.baseSpeed;
  run(g, 0.05);
  ControlRules.stun(p, 1, 'thunder');
  check('傀字还在：儡免疫眩晕', p.stun <= 0 && p.ccImmune);
  p.hit(150, { kind: 'fire' });
  check('傀字碎后：儡永久变慢（×0.75，基础速度为 0 时仍按倍率）', near(p.baseSpeed, before * 0.75));
  run(g, 0.05);
  check('傀字碎后：儡可以被控制（按双字 ×0.5）', near(ControlRules.stun(p, 1, 'thunder'), 0.5));
}

// ---------- 能力冻结：被潮卷着、眩晕不触发主动能力 ----------
{
  const g = makeGame();
  const f = spawnAt(g, 'fox', 4 * CELL);
  f.ab.blink.cd = 0.01;
  f.stun = 3;
  const s0 = f.s;
  run(g, 0.3);
  check('眩晕中：狐不触发幻步', near(f.s, s0));
  f.stun = 0;
  f.carried = {};
  run(g, 0.3);
  check('被潮卷着：狐不触发幻步', near(f.s, s0));
  f.carried = null;
  f.ab.blink.cd = 0.01;
  run(g, 0.3);
  check('恢复后立刻触发', f.s > s0 + 40 * CONFIG.GLYPH_SCALE);
}

// ---------- 不可选中与显形 ----------
{
  const g = makeGame();
  const t = mk(g, 'fire', 3, 2);
  const y = spawnAt(g, 'yaksha', env.sNear(g, t) + 5);
  // 把夜叉放到塔的 revealRadius 之外
  y.s = env.sNear(g, t) + 6 * CELL;
  y.syncPosition();
  run(g, 0.1);
  const far = Math.hypot(y.x - t.x, y.y - t.y) > 110 * CONFIG.GLYPH_SCALE;
  check('夜字没碎：塔 revealRadius 之外不可选中，单体选目标过滤它', far && y.untargetable && !y.isTargetable() && GlyphKit.targetable([y]).length === 0);
  check('frontTarget 默认不选隐身者，any 时仍可参考', X.GlyphTower.frontTarget([y]) === null && X.GlyphTower.frontTarget([y], true) === y);
  y.hit(5, { kind: 'earth', delivery: 'ground', aoe: true });
  check('被范围伤害命中后显形 1.5 秒', y.revealT > 1.4 && y.isTargetable());
  run(g, 1.7);
  check('显形结束后再次不可选中', !y.isTargetable());
  y.hit(5, { kind: 'bow', delivery: 'projectile' });
  check('单体攻击不会让它显形', !(y.revealT > 0));
  y.hit(120, { kind: 'fire' });
  run(g, 0.1);
  check('夜字碎后永久显形', y.segs[0].broken && !y.untargetable && y.isTargetable());
}

// ---------- 召唤 ----------
{
  const g = makeGame();
  const b = spawnAt(g, 'baigujing', 6 * CELL);
  b.s = 6 * CELL;
  const got = EnemyAbilities.summon(b, 'bone', 2);
  check('召唤物出生在召唤者后方 10～40px 内、同一路径', got.length === 2 && got.every((c) => b.s - c.s >= 9 * CONFIG.GLYPH_SCALE && b.s - c.s <= 41 * CONFIG.GLYPH_SCALE && c.track === b.track));
  check('召唤物奖励固定 1 墨、标记 summoned，不吃关卡倍率', got.every((c) => c.reward === CONFIG.SUMMON_REWARD && c.summoned && c.summoner === b));
  // ENEMY_CAP
  const saved = CONFIG.ENEMY_CAP;
  CONFIG.ENEMY_CAP = g.aliveEnemyCount();
  check('召唤也遵守 ENEMY_CAP：到顶直接跳过', EnemyAbilities.summon(b, 'bone', 3).length === 0);
  CONFIG.ENEMY_CAP = saved;
}

// ---------- 白骨精：化形、骨字复原 ----------
{
  const g = makeGame();
  const b = spawnAt(g, 'baigujing', 5 * CELL);
  check('白字还在：弓排序按尸的血量参与', b.visibleHp() === 40 && b.hp > 40);
  b.hit(160, { kind: 'water' });
  check('白字碎：现出真身，血量按真实值排序', b.visibleHp() === b.hp);
  b.hit(220, { kind: 'water' });
  check('骨字被（非火雷）打碎：精字还在', b.segs[1].broken && !b.segs[2].broken && b.segIndex === 2);
  run(g, 3.8);
  check('4 秒内尚未复原', b.segs[1].broken);
  run(g, 0.5);
  check('4 秒后骨字以 50% 血量复原，segIndex 回退到骨字', !b.segs[1].broken && near(b.segs[1].hp, 110) && b.segIndex === 1, `hp=${b.segs[1].hp} idx=${b.segIndex}`);
  b.hit(1000, { kind: 'water' });
  run(g, 4.5);
  check('只复原一次', b.segs[1].broken || b.dead);
  // 被火打碎的骨字不复原
  const b2 = spawnAt(g, 'baigujing', 5 * CELL);
  b2.hit(160, { kind: 'water' });
  b2.hit(220, { kind: 'fire' });
  run(g, 4.5);
  check('火打碎的骨字不会复原', b2.segs[1].broken);
  // 在 4 秒内打碎精字阻止复原
  const b3 = spawnAt(g, 'baigujing', 5 * CELL);
  b3.hit(160, { kind: 'water' });
  b3.hit(220, { kind: 'water' });
  run(g, 1);
  b3.hit(260, { kind: 'water' });
  check('4 秒内打碎精字：敌人死亡，骨字不再复原', b3.dead);
}

// ---------- 镇墓兽：开墓、狂暴 ----------
{
  const g = makeGame();
  const z = spawnAt(g, 'zhenmushou', 6 * CELL);
  const n0 = g.enemies.length;
  z.hit(300, { kind: 'water' });
  check('镇字碎：尚无召唤', g.enemies.length === n0);
  z.hit(300, { kind: 'water' });
  const born = g.enemies.length - n0;
  check('墓字碎的瞬间召唤 4 尸 + 1 巨', born === 5 && g.enemies.filter((e) => e.summoned && e.type === 'giant').length === 1
    && g.enemies.filter((e) => e.summoned && e.type === 'corpse').length === 4);
  z.baseSpeed = z.speed = 1;
  run(g, 0.05);
  check('只剩兽字：移速 ×1.5，且不被击退', near(z.abSpeedMul, 1.5) && z.knockImmune);
  const s0 = z.s;
  ControlRules.knock(z, 100, 'water');
  check('兽字不被击退', z.s >= s0 - 1e-6);
}

// ---------- 尸、鬼、巨走旧路径，行为不变 ----------
{
  const g = makeGame();
  const c = spawnAt(g, 'corpse', 3 * CELL);
  const giant = spawnAt(g, 'giant', 3 * CELL);
  check('尸、鬼、巨：单段、无能力、tier 与体量', c.adv === false && c.glyphCount === 1 && c.tier === 'minor' && c.mass === 1
    && giant.tier === 'heavy' && giant.mass === 3 && !giant.segs);
  const hp = c.hp;
  c.hit(10, { kind: 'fire' });
  check('尸受伤走旧管线：扣 10 点', near(c.hp, hp - 10));
}

finish('多字分段与能力框架测试通过');
