const fs = require('fs');
const vm = require('vm');

function loadConfig() {
  const source = fs.readFileSync('js/config.js', 'utf8');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${source}\nthis.__CONFIG__ = CONFIG;`, sandbox);
  return sandbox.__CONFIG__;
}

function parseDocRows(config) {
  const markdown = fs.readFileSync('docs/fusion-tower-designs.md', 'utf8').split(/\r?\n/);
  const charToKey = new Map(
    Object.entries(config.TOWERS).map(([key, tower]) => [String(tower.char), key]),
  );
  const rows = [];
  for (const line of markdown) {
    const match = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
    if (!match) continue;
    const combo = match[1].trim();
    if (!combo.includes('+')) continue;
    const result = match[2].trim();
    const [left, right] = combo.split('+').map((item) => item.trim());
    const keyLeft = charToKey.get(left);
    const keyRight = charToKey.get(right);
    if (!keyLeft || !keyRight) continue;
    const key = [keyLeft, keyRight].sort().join('+');
    rows.push({ combo, result, key, left, right });
  }
  return rows;
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function main() {
  const config = loadConfig();
  const rows = parseDocRows(config);
  const errors = [];

  const firstSeen = new Map();
  for (const row of rows) {
    if (!firstSeen.has(row.key)) firstSeen.set(row.key, row);
  }

  assert(firstSeen.size === 39, `文档去重后的无序组合应为 39，实际 ${firstSeen.size}`, errors);

  const expectedConflicts = {
    'mountain+water': '山清水秀',
    'earth+fire': '火土相生',
    'fire+wind': '烈火',
  };
  for (const [key, expectedName] of Object.entries(expectedConflicts)) {
    const row = firstSeen.get(key);
    assert(!!row, `缺少冲突键 ${key}`, errors);
    if (row) {
      assert(row.result === expectedName, `冲突键 ${key} 应为 ${expectedName}，实际 ${row.result}`, errors);
    }
  }

  for (const [key, row] of firstSeen.entries()) {
    const recipe = config.FUSION_TOWERS[key];
    assert(!!recipe, `CONFIG.FUSION_TOWERS 缺少配方 ${key} (${row.combo})`, errors);
    if (recipe) {
      assert(typeof recipe.skillId === 'string' && recipe.skillId.length > 0, `配方 ${key} 缺少 skillId`, errors);
      assert(typeof recipe.tier === 'number' && recipe.tier >= 1, `配方 ${key} 缺少 tier`, errors);
    }
  }

  const evolutionKeys = Object.keys(config.FUSION_EVOLUTION_RECIPES || {});
  assert(evolutionKeys.length === 5, `二阶段白名单应为 5 条，实际 ${evolutionKeys.length}`, errors);
  for (const key of evolutionKeys) {
    const recipe = config.FUSION_TOWERS[key];
    assert(!!recipe, `白名单对应配方缺失: ${key}`, errors);
    if (recipe) {
      assert(recipe.isEvolution === true, `白名单配方 ${key} 必须标记 isEvolution=true`, errors);
      assert(recipe.tier === 2, `白名单配方 ${key} 应为 tier=2`, errors);
    }
  }

  if (errors.length > 0) {
    console.error('融合配方测试失败:');
    for (const item of errors) {
      console.error(`- ${item}`);
    }
    process.exit(1);
  }

  console.log('融合配方测试通过');
  console.log(`- 文档无序组合: ${firstSeen.size}`);
  console.log(`- 白名单进化: ${evolutionKeys.length}`);
}

main();
