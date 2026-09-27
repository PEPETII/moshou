/**
 * 数值平衡性测试脚本
 * 用于验证重新设计后的炮塔和敌人数值
 * 基于 full-balance-spec.md 的验收标准
 */

// 直接定义配置数据（基于 js/config.js 的实际值）
const CONFIG = {
  TOWERS: {
    fire: { cost: 120, damage: 1.1, cooldown: 900, range: 4.2 },
    water: { cost: 100, damage: 0, cooldown: 750, range: 3.2, slow: 0.45, slowDuration: 2800 },
    mountain: { cost: 150, damage: 1.8, cooldown: 0, range: 0, hp: 22, onPath: true },
    wood: { cost: 105, damage: 0.45, cooldown: 380, range: 4.0 },
    gold: { cost: 190, damage: 3.2, cooldown: 1650, range: 7.5, pierce: true },
    earth: { cost: 230, damage: 2.8, cooldown: 1550, range: 3.2, aoe: true, aoeRange: 2.2 },
    xinZhongYan: { cost: 260, damage: 3.2, cooldown: 1450, range: 6.0, burn: true, burnDamage: 1.2, burnDuration: 3200 },
    ruFengSiZhen: { cost: 310, damage: 2.6, cooldown: 1100, range: 5.2, chain: true, chainCount: 4, chainRange: 160 },
    thunder: { cost: 210, damage: 2.1, cooldown: 1150, range: 5.2, chain: true, chainCount: 3, chainDecay: 0.23 },
    ice: { cost: 170, damage: 1.1, cooldown: 850, range: 4.2, slow: 0.38, freezeDuration: 1200 },
    poison: { cost: 180, damage: 0.8, cooldown: 650, range: 4.2, poisonDamage: 0.35, poisonDuration: 4200 },
    wind: { cost: 185, damage: 1.4, cooldown: 1000, range: 5.2, knockback: 1.2, knockbackCooldown: 2800 },
    light: { cost: 200, damage: 1.7, cooldown: 1050, range: 6.2, pierce: true, pierceCount: 2, revealDuration: 4500 },
    dark: { cost: 240, damage: 2.4, cooldown: 1200, range: 5.2, killHeal: 1.2, healPerWaveMax: 12 },
    star: { cost: 270, damage: 2.2, cooldown: 900, range: 5.2, comboBonus: 0.35 },
    frost: { cost: 250, damage: 2.6, cooldown: 1450, range: 3.2, aoe: true, aoeRange: 2.2, frostSlow: 0.30 },
    drum: { cost: 155, damage: 0, cooldown: 0, range: 0, aura: true, auraRange: 3.2, auraValue: 0.18 },
    banner: { cost: 140, damage: 0, cooldown: 0, range: 0, aura: true, auraRange: 4.2, auraValue: 1.1 },
    bell: { cost: 210, damage: 1.2, cooldown: 2200, range: 3.5, stunDuration: 1200, stunRange: 3.2 },
    mirror: { cost: 190, damage: 0, cooldown: 0, range: 0, aura: true, auraRange: 3.2, auraValue: 0.32, mountainBonus: 0.6 },
    zither: { cost: 170, damage: 0, cooldown: 0, range: 0, aura: true, auraRange: 3.2, auraValue: 0.24 },
    talisman: { cost: 150, damage: 0.9, cooldown: 1200, range: 5.2, markBonus: 0.35, markDuration: 5500, markCount: 2 },
    formation: { cost: 220, damage: 0, cooldown: 0, range: 0, aura: true, auraRange: 2.2, auraValue: 0.9, auraSlow: 0.22 },
    lantern: { cost: 130, damage: 0, cooldown: 0, range: 0, aura: true, auraRange: 4.2, auraValue: 0.18 },
    wall: { cost: 190, damage: 0, cooldown: 0, range: 0, hp: 42, onPath: true, repairRatio: 0.55 },
    moat: { cost: 120, damage: 0.35, cooldown: 0, range: 0, hp: 14, onPath: true, slow: 0.38, slowDuration: 3200 },
    trap: { cost: 170, damage: 6.0, cooldown: 0, range: 0, hp: 10, onPath: true, stunDuration: 1700, triggerCount: 4 },
    arrow: { cost: 180, damage: 1.1, cooldown: 600, range: 3.2, hp: 12, onPath: true, pierce: true, pierceCount: 1 },
    bunker: { cost: 300, damage: 2.4, cooldown: 1100, range: 2.2, hp: 34, onPath: true, reflectDamage: 2.6, damageReduction: 0.22 },
    palisade: { cost: 80, damage: 0.6, cooldown: 0, range: 0, hp: 8, onPath: true, repairRatio: 0.35 },
    treasure: { cost: 110, damage: 0, cooldown: 0, range: 0, inkPerWave: 30, interestBonus: 6, maxCount: 2 },
    healer: { cost: 160, damage: 0, cooldown: 0, range: 0, healPerWave: 4, emergencyThreshold: 0.35, emergencyBonus: 2.5 },
    soul: { cost: 230, damage: 0, cooldown: 7500, range: 4.2, summonHp: 6, summonDamage: 1.2, maxSummons: 2 },
    shadow: { cost: 210, damage: 0, cooldown: 0, range: 0, copyEfficiency: 0.58 },
    time: { cost: 320, damage: 0, cooldown: 0, range: 0, globalSlow: 0.18 },
    detonator: { cost: 130, damage: 9.0, cooldown: 0, range: 3.2, explodeRange: 3.2, stunDuration: 1200 },
    parasite: { cost: 200, damage: 1.1, cooldown: 800, range: 4.2, parasiteDuration: 6500, explosionDamage: 3.5 },
    wheel: { cost: 240, damage: 1.2, cooldown: 500, range: 4.8, rotationSpeed: 66, fanAngle: 34 },
    fusion: { cost: 0, damage: 0, cooldown: 1000, range: 0 }
  },
  ENEMIES: {
    corpse: { hp: 5, speed: 1.0, reward: 18, damage: 1 },
    ghost: { hp: 4, speed: 1.7, reward: 24, damage: 1 },
    armor: { hp: 10, speed: 0.75, reward: 34, damage: 1 },
    split: { hp: 6, speed: 1.0, reward: 24, damage: 1 },
    giant: { hp: 34, speed: 0.72, reward: 100, damage: 2 },
    superGiant: { hp: 86, speed: 0.62, reward: 250, damage: 3 },
    overlord: { hp: 240, speed: 0.52, reward: 680, damage: 4 },
    shadow: { hp: 10, speed: 2.2, reward: 50, damage: 1 },
    ironArmor: { hp: 18, speed: 0.62, reward: 60, damage: 2 },
    swiftGhost: { hp: 4, speed: 3.2, reward: 30, damage: 1 }
  }
};

/**
 * 计算DPS（每秒伤害）
 */
function calculateDPS(damage, cooldown) {
  if (!cooldown || cooldown <= 0) return 0;
  return damage / (cooldown / 1000);
}

/**
 * 计算DPS效率 = DPS / cost
 */
function calculateDPSEfficiency(dps, cost) {
  if (!cost || cost <= 0) return 0;
  return dps / cost;
}

/**
 * 计算效用分 - 控制塔
 */
function calculateControlUtility(tower) {
  if (!tower.slow && !tower.stunDuration && !tower.freezeDuration) return 0;
  
  let controlStrength = 0;
  let duration = 0;
  
  if (tower.slow) {
    controlStrength = tower.slow;
    duration = tower.slowDuration || 2000;
  } else if (tower.stunDuration) {
    controlStrength = 1.0;
    duration = tower.stunDuration;
  } else if (tower.freezeDuration) {
    controlStrength = 1.0;
    duration = tower.freezeDuration;
  }
  
  const coverage = tower.range || 3;
  const cost = tower.cost || 100;
  
  return (controlStrength * duration * coverage) / (cost * 100);
}

/**
 * 计算效用分 - 光环塔
 */
function calculateAuraUtility(tower) {
  if (!tower.aura) return 0;
  
  const auraRange = tower.auraRange || 3;
  const auraValue = tower.auraValue || 0.2;
  const cost = tower.cost || 100;
  
  // 覆盖面积系数 (简化为范围)
  const coverageFactor = auraRange;
  
  return (auraValue * coverageFactor) / cost;
}

/**
 * 计算效用分 - 经济塔
 */
function calculateEconUtility(tower) {
  if (!tower.inkPerWave) return 0;
  
  const inkPerWave = tower.inkPerWave;
  const interestBonus = tower.interestBonus || 0;
  const cost = tower.cost || 100;
  
  // 60秒期望收益 (假设每波20秒)
  const expectedGain = (inkPerWave * 3) + interestBonus;
  
  return expectedGain / cost;
}

/**
 * 计算效用分 - 召唤塔
 */
function calculateSummonUtility(tower) {
  if (!tower.summonHp) return 0;
  
  const summonEHP = tower.summonHp * (tower.maxSummons || 1);
  const summonDPS = (tower.summonDamage || 0) / 1; // 假设1秒攻击间隔
  const cost = tower.cost || 100;
  
  return (summonEHP + summonDPS * 10) / cost;
}

/**
 * 计算效用分 - 防御塔
 */
function calculateDefUtility(tower) {
  if (!tower.onPath && !tower.hp) return 0;
  
  const hp = tower.hp || 0;
  const damage = tower.damage || 0;
  const reflectDamage = tower.reflectDamage || 0;
  const cost = tower.cost || 100;
  
  // 承伤总量 + 反伤/阻挡收益
  const totalValue = hp + (damage * 5) + (reflectDamage * 3);
  
  return totalValue / cost;
}

/**
 * 测试炮塔平衡性
 */
function testTowerBalance() {
  console.log("=== 炮塔平衡性测试 ===\n");
  
  const damageTowers = [];
  const utilityTowers = [];
  
  // 分类炮塔
  for (const [key, tower] of Object.entries(CONFIG.TOWERS)) {
    if (key === 'fusion') continue;
    
    // 判断是否为伤害塔
    const isDamageTower = tower.damage > 0 && tower.cooldown > 0 && !tower.aura && !tower.onPath && !tower.inkPerWave && !tower.summonHp && !tower.globalSlow;
    
    if (isDamageTower) {
      const dps = calculateDPS(tower.damage, tower.cooldown);
      const efficiency = calculateDPSEfficiency(dps, tower.cost);
      
      damageTowers.push({
        key,
        cost: tower.cost,
        damage: tower.damage,
        cooldown: tower.cooldown,
        range: tower.range,
        dps: dps.toFixed(3),
        efficiency: efficiency.toFixed(4)
      });
    } else {
      // 计算效用分
      let utility = 0;
      let utilityType = '';
      
      if (tower.aura) {
        utility = calculateAuraUtility(tower);
        utilityType = 'aura';
      } else if (tower.slow || tower.stunDuration || tower.freezeDuration) {
        utility = calculateControlUtility(tower);
        utilityType = 'control';
      } else if (tower.inkPerWave) {
        utility = calculateEconUtility(tower);
        utilityType = 'econ';
      } else if (tower.summonHp) {
        utility = calculateSummonUtility(tower);
        utilityType = 'summon';
      } else if (tower.onPath || tower.hp) {
        utility = calculateDefUtility(tower);
        utilityType = 'def';
      }
      
      utilityTowers.push({
        key,
        cost: tower.cost,
        utilityType,
        utility: utility.toFixed(4)
      });
    }
  }
  
  // 检查伤害塔 DPS 效率
  console.log("【伤害塔 DPS 效率】");
  console.log("目标范围:");
  console.log("  T1 快攻单体: 0.0100 - 0.0115");
  console.log("  T2 穿透/多段: 0.0085 - 0.0100");
  console.log("  T3 AOE/链式/状态混伤: 0.0070 - 0.0085");
  console.log("  T4 强控制混伤: 0.0065 - 0.0075\n");
  
  console.table(damageTowers);
  
  // 统计各层达标情况
  const t1Count = damageTowers.filter(t => {
    const eff = parseFloat(t.efficiency);
    return eff >= 0.0100 && eff <= 0.0115;
  }).length;
  
  const t2Count = damageTowers.filter(t => {
    const eff = parseFloat(t.efficiency);
    return eff >= 0.0085 && eff <= 0.0100;
  }).length;
  
  const t3Count = damageTowers.filter(t => {
    const eff = parseFloat(t.efficiency);
    return eff >= 0.0070 && eff <= 0.0085;
  }).length;
  
  const t4Count = damageTowers.filter(t => {
    const eff = parseFloat(t.efficiency);
    return eff >= 0.0065 && eff <= 0.0075;
  }).length;
  
  const totalInRange = t1Count + t2Count + t3Count + t4Count;
  const damageTowerPassRate = (totalInRange / damageTowers.length * 100).toFixed(1);
  
  console.log(`\n伤害塔分层统计:`);
  console.log(`  T1 (0.0100-0.0115): ${t1Count}个`);
  console.log(`  T2 (0.0085-0.0100): ${t2Count}个`);
  console.log(`  T3 (0.0070-0.0085): ${t3Count}个`);
  console.log(`  T4 (0.0065-0.0075): ${t4Count}个`);
  console.log(`  达标率: ${damageTowerPassRate}% (目标 >= 90%)`);
  
  // 检查辅助塔效用分
  console.log("\n【辅助塔效用分】");
  console.log("目标阈值:");
  console.log("  U_control: 0.045 - 0.075");
  console.log("  U_aura: 0.030 - 0.045");
  console.log("  U_econ: 0.250 - 0.420");
  console.log("  U_summon: 0.380 - 0.620");
  console.log("  U_def: 0.140 - 0.280\n");
  
  console.table(utilityTowers);
  
  // 统计辅助塔达标情况
  let utilityPassCount = 0;
  for (const t of utilityTowers) {
    const utility = parseFloat(t.utility);
    let inRange = false;
    
    switch (t.utilityType) {
      case 'control':
        inRange = utility >= 0.045 && utility <= 0.075;
        break;
      case 'aura':
        inRange = utility >= 0.030 && utility <= 0.045;
        break;
      case 'econ':
        inRange = utility >= 0.250 && utility <= 0.420;
        break;
      case 'summon':
        inRange = utility >= 0.380 && utility <= 0.620;
        break;
      case 'def':
        inRange = utility >= 0.140 && utility <= 0.280;
        break;
    }
    
    if (inRange) utilityPassCount++;
  }
  
  const utilityPassRate = (utilityPassCount / utilityTowers.length * 100).toFixed(1);
  console.log(`\n辅助塔达标率: ${utilityPassRate}% (目标 >= 85%)`);
  
  const damagePass = parseFloat(damageTowerPassRate) >= 90;
  const utilityPass = parseFloat(utilityPassRate) >= 85;
  
  console.log(`\n炮塔平衡: ${damagePass && utilityPass ? '✓ 通过' : '✗ 未通过'}`);
  
  return { damagePass, utilityPass, damageTowerPassRate, utilityPassRate };
}

/**
 * 测试敌人平衡性
 */
function testEnemyBalance() {
  console.log("\n=== 敌人平衡性测试 ===\n");
  
  const results = [];
  
  for (const [key, enemy] of Object.entries(CONFIG.ENEMIES)) {
    const hpPerReward = enemy.hp / enemy.reward;
    
    // 分类
    let category = '普通型';
    if (enemy.speed >= 2.0) category = '高速脆皮';
    if (enemy.hp >= 30) category = '重甲/巨型';
    
    results.push({
      key,
      hp: enemy.hp,
      speed: enemy.speed,
      reward: enemy.reward,
      hpPerReward: hpPerReward.toFixed(3),
      category
    });
  }
  
  console.log("【HP奖励比目标】");
  console.log("  普通型: 0.22 - 0.30");
  console.log("  高速脆皮: 0.13 - 0.20");
  console.log("  重甲/巨型/Boss: 0.30 - 0.36\n");
  
  console.table(results);
  
  // 检查达标情况
  let passCount = 0;
  for (const r of results) {
    const ratio = parseFloat(r.hpPerReward);
    let inRange = false;
    
    switch (r.category) {
      case '普通型':
        inRange = ratio >= 0.22 && ratio <= 0.30;
        break;
      case '高速脆皮':
        inRange = ratio >= 0.13 && ratio <= 0.20;
        break;
      case '重甲/巨型':
        inRange = ratio >= 0.30 && ratio <= 0.36;
        break;
    }
    
    if (inRange) passCount++;
  }
  
  const passRate = (passCount / results.length * 100).toFixed(1);
  console.log(`\n敌人达标率: ${passRate}% (目标 >= 90%)`);
  
  const pass = parseFloat(passRate) >= 90;
  console.log(`敌人平衡: ${pass ? '✓ 通过' : '✗ 未通过'}`);
  
  return { pass, passRate };
}

/**
 * 测试战斗节奏
 */
function testCombatPacing() {
  console.log("\n=== 战斗节奏测试 ===\n");
  
  // 使用 fire 塔作为基准
  const fireTower = CONFIG.TOWERS.fire;
  const fireDPS = calculateDPS(fireTower.damage, fireTower.cooldown);
  
  const results = [];
  
  // 早期敌人 (corpse, ghost)
  const earlyEnemies = ['corpse', 'ghost'];
  console.log("【早期敌人 TTK (目标: 3~5秒)】");
  
  for (const key of earlyEnemies) {
    const enemy = CONFIG.ENEMIES[key];
    if (!enemy) continue;
    
    const ttk = enemy.hp / fireDPS;
    const inRange = ttk >= 3 && ttk <= 5;
    
    results.push({
      enemy: key,
      hp: enemy.hp,
      ttk: ttk.toFixed(2) + 's',
      target: '3-5s',
      status: inRange ? '✓' : '✗'
    });
  }
  
  console.table(results.filter(r => earlyEnemies.includes(r.enemy)));
  
  // 中期敌人 (armor, split, giant)
  const midEnemies = ['armor', 'split', 'giant'];
  console.log("\n【中期敌人 TTK (目标: 5~9秒)】");
  
  const midResults = [];
  for (const key of midEnemies) {
    const enemy = CONFIG.ENEMIES[key];
    if (!enemy) continue;
    
    const ttk = enemy.hp / fireDPS;
    const inRange = ttk >= 5 && ttk <= 9;
    
    midResults.push({
      enemy: key,
      hp: enemy.hp,
      ttk: ttk.toFixed(2) + 's',
      target: '5-9s',
      status: inRange ? '✓' : '✗'
    });
  }
  
  console.table(midResults);
  
  // 后期敌人 (superGiant, overlord)
  const lateEnemies = ['superGiant', 'overlord'];
  console.log("\n【后期敌人 TTK (目标: 9~16秒)】");
  
  const lateResults = [];
  for (const key of lateEnemies) {
    const enemy = CONFIG.ENEMIES[key];
    if (!enemy) continue;
    
    const ttk = enemy.hp / fireDPS;
    const inRange = ttk >= 9 && ttk <= 16;
    
    lateResults.push({
      enemy: key,
      hp: enemy.hp,
      ttk: ttk.toFixed(2) + 's',
      target: '9-16s',
      status: inRange ? '✓' : '✗'
    });
  }
  
  console.table(lateResults);
  
  // 综合评估
  const allResults = [...results, ...midResults, ...lateResults];
  const passCount = allResults.filter(r => r.status === '✓').length;
  const passRate = (passCount / allResults.length * 100).toFixed(1);
  
  console.log(`\n战斗节奏达标率: ${passRate}%`);
  
  const pass = parseFloat(passRate) >= 80;
  console.log(`战斗节奏: ${pass ? '✓ 通过' : '✗ 未通过'}`);
  
  return { pass, passRate };
}

/**
 * 测试融合炮塔价值
 */
function testFusionValue() {
  console.log("\n=== 融合炮塔价值测试 ===\n");
  
  // 测试几个典型融合配方
  const testCases = [
    { c1: 'fire', c2: 'wood', name: '火+木' },
    { c1: 'fire', c2: 'mountain', name: '火+山' },
    { c1: 'water', c2: 'ice', name: '水+冰' }
  ];
  
  const results = [];
  
  for (const test of testCases) {
    const tower1 = CONFIG.TOWERS[test.c1];
    const tower2 = CONFIG.TOWERS[test.c2];
    
    if (!tower1 || !tower2) continue;
    
    const combinedCost = tower1.cost + tower2.cost;
    
    // 计算融合成本 (使用新公式)
    const isPathFusion = tower1.onPath || tower2.onPath;
    let fusionCost = Math.round(combinedCost * 0.92);
    if (isPathFusion) {
      fusionCost = Math.round(fusionCost * 1.20);
    }
    
    const savings = combinedCost - fusionCost;
    const savingsPercent = (savings / combinedCost * 100).toFixed(1);
    
    // 计算融合DPS
    const c1Damage = tower1.damage || 0;
    const c2Damage = tower2.damage || 0;
    const fusionDamage = ((c1Damage + c2Damage) * 0.88).toFixed(2);
    const minCooldown = Math.min(tower1.cooldown || 1000, tower2.cooldown || 1000);
    const fusionCooldown = Math.round(minCooldown * 0.92);
    const fusionDPS = calculateDPS(parseFloat(fusionDamage), fusionCooldown);
    
    // 同成本专精塔参考 (fire)
    const refTower = CONFIG.TOWERS.fire;
    const refDPS = calculateDPS(refTower.damage, refTower.cooldown);
    
    const dpsDiffPercent = ((fusionDPS - refDPS) / refDPS * 100).toFixed(1);
    
    results.push({
      fusion: test.name,
      combinedCost,
      fusionCost,
      savings: savings + ` (${savingsPercent}%)`,
      fusionDPS: fusionDPS.toFixed(3),
      refDPS: refDPS.toFixed(3),
      dpsDiff: dpsDiffPercent + '%'
    });
  }
  
  console.log("【融合价值分析】");
  console.log("目标: 成本节省率 10%~22%，融合DPS不高于同成本专精塔 +8%\n");
  
  console.table(results);
  
  // 检查是否达标
  let passCount = 0;
  for (const r of results) {
    const savingsMatch = r.savings.match(/\(([\d.]+)%\)/);
    const savingsPercent = savingsMatch ? parseFloat(savingsMatch[1]) : 0;
    
    const dpsMatch = r.dpsDiff.match(/([\d.-]+)%/);
    const dpsDiff = dpsMatch ? parseFloat(dpsMatch[1]) : 0;
    
    const savingsOk = savingsPercent >= 10 && savingsPercent <= 22;
    const dpsOk = dpsDiff <= 8;
    
    if (savingsOk && dpsOk) passCount++;
  }
  
  const passRate = (passCount / results.length * 100).toFixed(1);
  console.log(`\n融合价值达标率: ${passRate}%`);
  
  const pass = parseFloat(passRate) >= 80;
  console.log(`融合价值: ${pass ? '✓ 通过' : '✗ 未通过'}`);
  
  return { pass, passRate };
}

/**
 * 运行所有测试
 */
function runAllTests() {
  console.log("========================================");
  console.log("《墨守成规》数值平衡性测试");
  console.log("基于 full-balance-spec.md v1 标准");
  console.log("========================================\n");
  
  const towerResult = testTowerBalance();
  const enemyResult = testEnemyBalance();
  const pacingResult = testCombatPacing();
  const fusionResult = testFusionValue();
  
  console.log("\n========================================");
  console.log("=== 测试总结 ===");
  console.log("========================================");
  console.log(`炮塔平衡 (伤害塔达标率): ${towerResult.damagePass ? '✓' : '✗'} ${towerResult.damageTowerPassRate}%`);
  console.log(`炮塔平衡 (辅助塔达标率): ${towerResult.utilityPass ? '✓' : '✗'} ${towerResult.utilityPassRate}%`);
  console.log(`敌人平衡 (达标率): ${enemyResult.pass ? '✓' : '✗'} ${enemyResult.passRate}%`);
  console.log(`战斗节奏 (达标率): ${pacingResult.pass ? '✓' : '✗'} ${pacingResult.passRate}%`);
  console.log(`融合价值 (达标率): ${fusionResult.pass ? '✓' : '✗'} ${fusionResult.passRate}%`);
  
  const allPassed = towerResult.damagePass && towerResult.utilityPass && 
                    enemyResult.pass && pacingResult.pass && fusionResult.pass;
  
  console.log("\n----------------------------------------");
  console.log(`总体结果: ${allPassed ? '✓ 所有测试通过' : '✗ 需要进一步调整'}`);
  console.log("----------------------------------------\n");
  
  return allPassed;
}

// 运行测试
runAllTests();

// 导出模块
module.exports = { runAllTests };
