/**
 * 融合（合字）回归测试（2026-10-20）：配方集中配置、相邻素材、冷却、墨水、占位校验，
 * 结算后素材消耗与合字塔落位，塔防与征服两种索引，链式合成（林 + 火 → 焚），本机合成记录。
 */
const { createEnv, makeChecker } = require('./helpers/glyph-env');

const env = createEnv();
const { X, makeGame, mk, run, spawnAt, store } = env;
const { CONFIG, Fusion, GlyphSystem } = X;
const { check, finish } = makeChecker();
const F = CONFIG.FUSION;
const recipe = (r) => Fusion.recipeOf(r);

// ---------- 配置 ----------
check('三条配方：炎、林、焚', F.recipes.map((r) => r.result).join() === 'yan,lin,fen');
check('配方素材与合字塔都有配置', F.recipes.every((r) => CONFIG.TOWERS[r.result] && CONFIG.TOWERS[r.result].fusion
  && r.materials.length === 2 && r.materials.every((m) => CONFIG.TOWERS[m]) && r.cost > 0 && r.formula));
check('公式：炎＝火＋火，林＝木＋木，焚＝林＋火', recipe('yan').materials.join() === 'fire,fire'
  && recipe('lin').materials.join() === 'wood,wood' && recipe('fen').materials.join() === 'lin,fire');
check('冷却与相邻范围集中配置', F.cooldown > 0 && F.adjacency === 1);
// 独立配置：合字塔有自己的招式参数集，而不是素材参数的合并
const ownKeys = (t) => Object.keys(CONFIG.TOWERS[t].glyph).filter((k) => !['range', 'chargePerSec', 'chargePerHit', 'rewriteAll'].includes(k));
check('合字塔招式参数独立配置，不由素材叠加', F.recipes.every((r) => {
  const mine = ownKeys(r.result);
  return mine.length > 0 && r.materials.every((m) => mine.some((k) => !ownKeys(m).includes(k)));
}));
check('配方查询：火可合炎、焚；林可合焚；水无配方',
  Fusion.recipesFor('fire').map((r) => r.result).join() === 'yan,fen'
  && Fusion.recipesFor('lin').map((r) => r.result).join() === 'fen' && Fusion.recipesFor('water').length === 0);

// ---------- 校验 ----------
{
  const g = makeGame();
  const a = mk(g, 'fire', 3, 2);
  check('缺相邻素材时给出原因', /相邻格缺少「火」/.test(Fusion.check(g, a, recipe('yan')).reason));
  mk(g, 'fire', 5, 2);
  check('隔一格不算相邻', !Fusion.check(g, a, recipe('yan')).ok);
  const b = mk(g, 'fire', 4, 3);
  g.ink = 10;
  const v = Fusion.check(g, a, recipe('yan'));
  check('墨水不足时给出原因并找到相邻素材', !v.ok && /墨水不足/.test(v.reason) && v.partner === b);
  g.ink = 500;
  check('条件满足时可合成', Fusion.check(g, a, recipe('yan')).ok);
  g.fusionCd = 2.4;
  check('冷却中不可合成，提示剩余秒数', /冷却中（3 秒）/.test(Fusion.check(g, a, recipe('yan')).reason));
  GlyphSystem.tick(g, 2.5);
  check('冷却由 GlyphSystem.tick 递减到 0', g.fusionCd === 0 && Fusion.check(g, a, recipe('yan')).ok);
  g.gameEnded = true;
  check('关卡结束后不可合成', !Fusion.check(g, a, recipe('yan')).ok);
}
{
  // 占位：路径塔与非路径塔不能互占（现役塔都不是路径塔，用一座桩路径塔验证校验分支）
  const g = makeGame();
  g.ink = 999;
  const m = mk(g, 'earth', 3, 1);
  m.onPath = true;
  mk(g, 'fire', 3, 2);
  const probe = { result: 'yan', materials: ['earth', 'fire'], cost: 1, formula: '' };
  check('结果塔放不进被选塔所在格时拒绝', /放不下/.test(Fusion.check(g, m, probe).reason));
}

// ---------- 结算（塔防）----------
{
  const g = makeGame();
  g.ink = 500;
  const a = mk(g, 'fire', 3, 2);
  const b = mk(g, 'fire', 4, 2);
  spawnAt(g, 'corpse', 4 * env.CELL, 100000);
  run(g, 0.5);
  const res = Fusion.perform(g, a, recipe('yan'));
  check('合成成功并返回合字塔', res.ok && res.tower.type === 'yan' && res.tower.gl && res.tower.gl.type === 'yan');
  check('两份素材被消耗，墨水扣除', !g.towers.includes(a) && !g.towers.includes(b) && g.towers.length === 1 && g.ink === 500 - recipe('yan').cost);
  check('合字塔落在被选塔所在格，另一格腾空', g.runtimeIndexes.getTowerAt(3, 2) === res.tower && !g.runtimeIndexes.getTowerAt(4, 2));
  check('合成后进入冷却', g.fusionCd === F.cooldown);
  check('本机记录已合成', JSON.parse(store.get(F.storageKey)).includes('yan'));
  check('冷却中再合成被拒', !Fusion.perform(g, res.tower, recipe('fen')).ok);
  let err = null;
  try { run(g, 4); } catch (e) { err = e; }
  check('素材塔已发出的弹道照常收尾，合字塔正常工作', !err, err ? String(err.stack).slice(0, 200) : '');
}

// ---------- 链式：木 + 木 → 林，林 + 火 → 焚 ----------
{
  const g = makeGame();
  g.ink = 1000;
  const w1 = mk(g, 'wood', 3, 2);
  mk(g, 'wood', 3, 3);
  const lin = Fusion.perform(g, w1, recipe('lin')).tower;
  check('木 + 木 → 林', lin && lin.type === 'lin');
  mk(g, 'fire', 4, 3);
  g.fusionCd = 0;
  const fen = Fusion.perform(g, lin, recipe('fen'));
  check('林 + 火 → 焚（合字也能作素材）', fen.ok && fen.tower.type === 'fen' && g.towers.length === 1);
}

// ---------- 结算（征服：_towerIndex）----------
{
  const g = makeGame();
  delete g.runtimeIndexes;
  g._towerIndex = new Map();
  g.removeTower = function(t) {
    const i = this.towers.indexOf(t);
    if (i > -1) { this.towers.splice(i, 1); this._towerIndex.delete(`${t.gx},${t.gy}`); }
  };
  g.ink = 300;
  const add = (type, gx, gy) => {
    const t = new X.Tower(type, gx, gy, g);
    g.towers.push(t);
    g._towerIndex.set(`${gx},${gy}`, t);
    return t;
  };
  const a = add('fire', 2, 2);
  add('fire', 3, 3);
  const res = Fusion.perform(g, a, recipe('yan'));
  check('征服：合成后索引指向合字塔，另一格移除', res.ok && g._towerIndex.get('2,2') === res.tower && !g._towerIndex.has('3,3'));
}

finish('融合测试通过');
