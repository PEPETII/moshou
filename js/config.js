// 防止重复声明
if (window.CONFIG) {
  console.warn('CONFIG already defined, skipping redefinition');
}

const CONFIG = window.CONFIG || {
  CELL_SIZE: 48,  // 保持48px，9行占432px（留白48px）
  GRID_COLS: 20,
  GRID_ROWS: 9,  // 上下各4行 + 中间1行路 = 9行

  TOWERS: {
    fire: {
      char: "火",
      cost: 120,
      damage: 1.1,
      range: 4.2,
      cooldown: 900,
      upgradeCost: 60,
      maxLevel: 3,
      desc: "发射旋转的火字追踪导弹",
      upgradeParams: { damageInc: 1, rangeInc: 0.5, cooldownDec: 100 },
    },
    water: {
      char: "水",
      cost: 100,
      damage: 0,
      range: 3.2,
      cooldown: 750,
      slow: 0.45,
      slowDuration: 2800,
      upgradeCost: 45,
      maxLevel: 3,
      desc: "延缓敌人移动速度45%",
      upgradeParams: { rangeInc: 1, cooldownDec: 100, slowInc: 0.1 },
    },
    mountain: {
      char: "山",
      cost: 150,
      hp: 22,
      damage: 1.8,
      upgradeCost: 70,
      maxLevel: 3,
      onPath: true,
      desc: "放置在路径上阻挡敌人并反伤",
      upgradeParams: { hpInc: 2, damageInc: 1 },
    },
    wood: {
      char: "木",
      cost: 105,
      damage: 0.45,
      range: 4.0,
      cooldown: 380,
      upgradeCost: 50,
      maxLevel: 3,
      unlockLevel: 2,
      desc: "快速连射",
      upgradeParams: { damageInc: 1, rangeInc: 0.5, cooldownDec: 100 },
    },
    gold: {
      char: "金",
      cost: 190,
      damage: 3.2,
      range: 7.5,
      cooldown: 1650,
      pierce: true,
      upgradeCost: 90,
      maxLevel: 3,
      unlockLevel: 3,
      desc: "直线穿透攻击",
      upgradeParams: { damageInc: 1, rangeInc: 0.5, cooldownDec: 100 },
    },
    earth: {
      char: "土",
      cost: 230,
      damage: 2.8,
      range: 3.2,
      cooldown: 1550,
      aoe: true,
      aoeRange: 2.2,
      upgradeCost: 110,
      maxLevel: 3,
      unlockLevel: 4,
      desc: "范围AOE伤害",
      upgradeParams: { damageInc: 1, rangeInc: 0.5, cooldownDec: 100 },
    },
    xinZhongYan: {
      char: "心中炎",
      cost: 260,
      damage: 3.2,
      range: 6.0,
      cooldown: 1450,
      burn: true,
      burnDuration: 3200,
      burnDamage: 1.2,
      upgradeCost: 120,
      maxLevel: 3,
      unlockLevel: 5,
      desc: "心火攻击，高伤害带灼烧",
      upgradeParams: { damageInc: 1, rangeInc: 0.5, cooldownDec: 100 },
    },
    ruFengSiZhen: {
      char: "如风似真",
      cost: 310,
      damage: 2.6,
      range: 5.2,
      cooldown: 1100,
      chain: true,
      chainCount: 4,
      chainRange: 160,
      upgradeCost: 150,
      maxLevel: 3,
      unlockLevel: 6,
      desc: "风链弹射，攻击在敌人间弹跳",
      upgradeParams: { damageInc: 1, rangeInc: 0.5, cooldownDec: 100 },
    },
    thunder: {
      char: '雷',
      cost: 210,
      damage: 2.1,
      range: 5.2,
      cooldown: 1150,
      chain: true,
      chainCount: 3,
      chainRange: 180,
      chainDecay: 0.23,
      conductBonus: 1.5,
      upgradeCost: 100,
      maxLevel: 3,
      unlockLevel: 4,
      desc: '雷电弹射，对灼烧/潮湿敌人伤害加成',
      upgradeParams: { damageInc: 0.6, rangeInc: 0.5, cooldownDec: 140, chainCountInc: 1 },
    },
    ice: {
      char: '冰',
      cost: 170,
      damage: 1.1,
      range: 4.2,
      cooldown: 850,
      slow: 0.38,
      slowDuration: 2500,
      freezeDuration: 1200,
      freezeCooldown: 8000,
      upgradeCost: 80,
      maxLevel: 3,
      unlockLevel: 3,
      desc: '减速敌人并触发冻结',
      upgradeParams: { damageInc: 0.24, rangeInc: 0.5, cooldownDec: 100, slowInc: 0.1, freezeDurationInc: 300 },
    },
    poison: {
      char: '毒',
      cost: 180,
      damage: 0.8,
      range: 4.2,
      cooldown: 650,
      poisonDamage: 0.35,
      poisonDuration: 4200,
      poisonStackMax: 5,
      ulcerDuration: 5000,
      upgradeCost: 85,
      maxLevel: 3,
      unlockLevel: 5,
      desc: '叠加毒层，3层触发溃烂破甲',
      upgradeParams: { damageInc: 0.15, rangeInc: 0.5, cooldownDec: 70, poisonDamageInc: 0.1, ulcerDurationInc: 1000 },
    },
    wind: {
      char: '风',
      cost: 185,
      damage: 1.4,
      range: 5.2,
      cooldown: 1000,
      knockback: 1.2,
      knockbackCooldown: 2800,
      dispel: true,
      upgradeCost: 90,
      maxLevel: 3,
      unlockLevel: 5,
      desc: '击退敌人并清除增益',
      upgradeParams: { damageInc: 0.36, rangeInc: 0.5, cooldownDec: 110, knockbackInc: 0.5 },
    },
    light: {
      char: '光',
      cost: 200,
      damage: 1.7,
      range: 6.2,
      cooldown: 1050,
      pierce: true,
      pierceCount: 2,
      revealDuration: 4500,
      revealBonus: 1.8,
      upgradeCost: 95,
      maxLevel: 3,
      unlockLevel: 6,
      desc: '显形隐身敌人，穿透攻击',
      upgradeParams: { damageInc: 0.45, rangeInc: 0.5, cooldownDec: 120, pierceCountInc: 1, revealDurationInc: 1000 },
    },
    dark: {
      char: '暗',
      cost: 240,
      damage: 2.4,
      range: 5.2,
      cooldown: 1200,
      killHeal: 1.2,
      shadowMarkDuration: 5000,
      shadowMarkBonusHeal: 1,
      healPerWaveMax: 12,
      upgradeCost: 115,
      maxLevel: 3,
      unlockLevel: 7,
      desc: '击杀敌人回复核心HP',
      upgradeParams: { damageInc: 0.66, rangeInc: 0.5, cooldownDec: 130, killHealInc: 1 },
    },
    star: {
      char: '星',
      cost: 270,
      damage: 2.2,
      range: 5.2,
      cooldown: 900,
      elementChances: { fire: 0.3, water: 0.25, thunder: 0.2, ice: 0.25 },
      comboBonus: 0.35,
      upgradeCost: 130,
      maxLevel: 3,
      unlockLevel: 8,
      desc: '随机元素攻击，连击加成',
      upgradeParams: { damageInc: 0.54, rangeInc: 0.5, cooldownDec: 100, comboBonusInc: 0.1 },
    },
    frost: {
      char: '霜',
      cost: 250,
      damage: 2.6,
      range: 3.2,
      cooldown: 1450,
      aoe: true,
      aoeRange: 2.2,
      frostSlow: 0.30,
      frostSlowDuration: 2000,
      deepColdBonus: 2.0,
      frostGroundDuration: 3000,
      upgradeCost: 120,
      maxLevel: 3,
      unlockLevel: 7,
      desc: '范围冰霜，对冰冻敌人双倍伤害',
      upgradeParams: { damageInc: 0.6, rangeInc: 0.5, cooldownDec: 180, aoeRangeInc: 0.5, frostSlowInc: 0.05 },
    },
    drum: {
      char: '鼓',
      cost: 155,
      damage: 0,
      range: 0,
      cooldown: 0,
      aura: true,
      auraRange: 3.2,
      auraType: 'attackSpeed',
      auraValue: 0.18,
      upgradeCost: 75,
      maxLevel: 3,
      unlockLevel: 4,
      desc: '为范围内炮塔提供攻速加成',
      upgradeParams: { auraRangeInc: 0.5, auraValueInc: 0.08 },
    },
    banner: {
      char: '旗',
      cost: 140,
      damage: 0,
      range: 0,
      cooldown: 0,
      aura: true,
      auraRange: 4.2,
      auraType: 'range',
      auraValue: 1.1,
      upgradeCost: 65,
      maxLevel: 3,
      unlockLevel: 5,
      desc: '为范围内炮塔提供射程加成',
      upgradeParams: { auraRangeInc: 0.5, auraValueInc: 0.5 },
    },
    bell: {
      char: '钟',
      cost: 210,
      damage: 1.2,
      range: 3.5,
      cooldown: 2200,
      stunDuration: 1200,
      stunRange: 3.2,
      upgradeCost: 100,
      maxLevel: 3,
      unlockLevel: 6,
      desc: '周期性眩晕范围内敌人',
      upgradeParams: { damageInc: 0.15, rangeInc: 0.5, cooldownDec: 300, stunDurationInc: 300 },
    },
    mirror: {
      char: '镜',
      cost: 190,
      damage: 0,
      range: 0,
      cooldown: 0,
      aura: true,
      auraRange: 3.2,
      auraType: 'reflect',
      auraValue: 0.32,
      mountainBonus: 0.6,
      upgradeCost: 90,
      maxLevel: 3,
      unlockLevel: 7,
      desc: '为范围内炮塔提供伤害反射',
      upgradeParams: { auraRangeInc: 0.5, auraValueInc: 0.1, mountainBonusInc: 0.15 },
    },
    zither: {
      char: '琴',
      cost: 170,
      damage: 0,
      range: 0,
      cooldown: 0,
      aura: true,
      auraRange: 3.2,
      auraType: 'slow',
      auraValue: 0.24,
      upgradeCost: 80,
      maxLevel: 3,
      unlockLevel: 5,
      desc: '减速范围内所有敌人',
      upgradeParams: { auraRangeInc: 0.5, auraValueInc: 0.08 },
    },
    talisman: {
      char: '符',
      cost: 150,
      damage: 0.9,
      range: 5.2,
      cooldown: 1200,
      markDuration: 5500,
      markBonus: 0.35,
      markCount: 2,
      upgradeCost: 70,
      maxLevel: 3,
      unlockLevel: 6,
      desc: '标记敌人使其受到伤害增加',
      upgradeParams: { rangeInc: 0.5, cooldownDec: 150, markDurationInc: 1000, markBonusInc: 0.1, markCountInc: 1 },
    },
    formation: {
      char: '阵',
      cost: 220,
      damage: 0,
      range: 0,
      cooldown: 0,
      aura: true,
      auraRange: 2.2,
      auraType: 'dot',
      auraValue: 0.9,
      auraSlow: 0.22,
      upgradeCost: 105,
      maxLevel: 3,
      unlockLevel: 8,
      desc: '阵法范围内持续伤害并减速',
      upgradeParams: { auraRangeInc: 0.5, auraValueInc: 0.3, auraSlowInc: 0.05 },
    },
    lantern: {
      char: '灯',
      cost: 130,
      damage: 0,
      range: 0,
      cooldown: 0,
      aura: true,
      auraRange: 4.2,
      auraType: 'reveal',
      auraValue: 0.18,
      upgradeCost: 60,
      maxLevel: 3,
      unlockLevel: 6,
      desc: '照明范围内隐身敌人显形',
      upgradeParams: { auraRangeInc: 0.5, auraValueInc: 0.05 },
    },
    wall: {
      char: '壁',
      cost: 190,
      hp: 42,
      damage: 0,
      onPath: true,
      repairRatio: 0.55,
      upgradeCost: 90,
      maxLevel: 3,
      unlockLevel: 5,
      desc: '高HP路径阻挡塔',
      upgradeParams: { hpInc: 15, repairRatioInc: 0.1 },
    },
    moat: {
      char: '壕',
      cost: 120,
      hp: 14,
      damage: 0.35,
      range: 0,
      cooldown: 0,
      slow: 0.38,
      slowDuration: 3200,
      onPath: true,
      upgradeCost: 55,
      maxLevel: 3,
      unlockLevel: 4,
      desc: '路径减速陷阱',
      upgradeParams: { hpInc: 6, slowInc: 0.08, slowDurationInc: 500, damageInc: 0.1 },
    },
    trap: {
      char: '陷',
      cost: 170,
      hp: 10,
      damage: 6.0,
      range: 0,
      cooldown: 0,
      stunDuration: 1700,
      triggerCount: 4,
      maxTriggers: 4,
      onPath: true,
      upgradeCost: 80,
      maxLevel: 3,
      unlockLevel: 7,
      desc: '触发式陷阱，造成大量伤害并眩晕',
      upgradeParams: { hpInc: 4, damageInc: 1.5, stunDurationInc: 500, triggerCountInc: 1 },
    },
    arrow: {
      char: '箭',
      cost: 180,
      hp: 12,
      damage: 1.1,
      range: 3.2,
      cooldown: 600,
      pierce: true,
      pierceCount: 1,
      onPath: true,
      upgradeCost: 80,
      maxLevel: 3,
      unlockLevel: 5,
      desc: '路径上自动攻击的箭塔',
      upgradeParams: { hpInc: 6, damageInc: 0.3, rangeInc: 0.5, cooldownDec: 60 },
    },
    bunker: {
      char: '碉',
      cost: 300,
      hp: 34,
      damage: 2.4,
      range: 2.2,
      cooldown: 1100,
      reflectDamage: 2.6,
      damageReduction: 0.22,
      onPath: true,
      upgradeCost: 140,
      maxLevel: 3,
      unlockLevel: 8,
      desc: '重型堡垒，攻防一体',
      upgradeParams: { hpInc: 12, damageInc: 0.6, reflectDamageInc: 0.6, damageReductionInc: 0.05 },
    },
    palisade: {
      char: '栅',
      cost: 80,
      hp: 8,
      damage: 0.6,
      onPath: true,
      repairRatio: 0.35,
      upgradeCost: 35,
      maxLevel: 3,
      unlockLevel: 2,
      desc: '低费路径路障',
      upgradeParams: { hpInc: 4, damageInc: 0.2, repairRatioInc: 0.1 },
    },
    treasure: {
      char: '财',
      cost: 110,
      damage: 0,
      range: 0,
      cooldown: 0,
      goldPerWave: 30,
      interestInterval: 3,
      interestBonus: 6,
      maxCount: 2,
      upgradeCost: 50,
      maxLevel: 3,
      unlockLevel: 3,
      desc: '每波产出生息金币',
      upgradeParams: { goldPerWaveInc: 10, interestBonusInc: 3 },
    },
    healer: {
      char: '医',
      cost: 160,
      damage: 0,
      range: 0,
      cooldown: 0,
      healPerWave: 4,
      emergencyThreshold: 0.35,
      emergencyBonus: 2.5,
      maxCount: 1,
      upgradeCost: 75,
      maxLevel: 3,
      unlockLevel: 5,
      desc: '每波回复核心HP',
      upgradeParams: { healPerWaveInc: 2, emergencyBonusInc: 1 },
    },
    soul: {
      char: '魂',
      cost: 230,
      damage: 0,
      range: 4.2,
      cooldown: 7500,
      summonHp: 6,
      summonDamage: 1.2,
      summonDuration: 10000,
      maxSummons: 2,
      upgradeCost: 110,
      maxLevel: 3,
      unlockLevel: 7,
      desc: '召唤灵魂守卫',
      upgradeParams: { cooldownDec: 1000, summonHpInc: 3, summonDamageInc: 0.3, maxSummonsInc: 1 },
    },
    shadow: {
      char: '影',
      cost: 210,
      damage: 0,
      range: 0,
      cooldown: 0,
      copyEfficiency: 0.58,
      upgradeCost: 100,
      maxLevel: 3,
      unlockLevel: 8,
      desc: '复制相邻炮塔的攻击',
      upgradeParams: { copyEfficiencyInc: 0.15 },
    },
    time: {
      char: '时',
      cost: 320,
      damage: 0,
      range: 0,
      cooldown: 0,
      globalSlow: 0.18,
      upgradeCost: 150,
      maxLevel: 3,
      unlockLevel: 9,
      desc: '减缓全局时间流速',
      upgradeParams: { globalSlowInc: 0.07 },
    },
    detonator: {
      char: '爆',
      cost: 130,
      damage: 9.0,
      range: 3.2,
      cooldown: 0,
      explodeRange: 3.2,
      stunDuration: 1200,
      isDetonator: true,
      upgradeCost: 60,
      maxLevel: 3,
      unlockLevel: 6,
      desc: '手动引爆，大范围伤害后销毁',
      upgradeParams: { damageInc: 3.0, explodeRangeInc: 0.5, stunDurationInc: 500 },
    },
    parasite: {
      char: '蛊',
      cost: 200,
      damage: 1.1,
      range: 4.2,
      cooldown: 800,
      parasiteDuration: 6500,
      explosionDamage: 3.5,
      explosionRange: 2,
      upgradeCost: 95,
      maxLevel: 3,
      unlockLevel: 8,
      desc: '寄生敌人，死亡时爆炸',
      upgradeParams: { damageInc: 0.24, rangeInc: 0.5, cooldownDec: 90, explosionDamageInc: 1.0, explosionRangeInc: 0.5 },
    },
    wheel: {
      char: '轮',
      cost: 240,
      damage: 1.2,
      range: 4.8,
      cooldown: 500,
      rotationSpeed: 66,
      fanAngle: 34,
      upgradeCost: 100,
      maxLevel: 3,
      unlockLevel: 7,
      desc: '旋转扫射攻击',
      upgradeParams: { damageInc: 0.45, rangeInc: 0.5, rotationSpeedInc: 12, fanAngleInc: 10 },
    },
    fusion: {
      char: "融合",
      cost: 0,
      damage: 0,
      range: 0,
      cooldown: 1000,
      maxLevel: 1,
      desc: "融合炮塔基类",
    },
  },

  ENEMIES: {
    corpse: {
      char: "尸",
      hp: 5,
      damage: 1,
      speed: 1.0,
      reward: 18,
    },
    ghost: {
      char: "鬼",
      hp: 4,
      damage: 1,
      speed: 1.7,
      reward: 24,
      flying: true,
    },
    armor: {
      char: "甲",
      hp: 10,
      damage: 1,
      speed: 0.75,
      reward: 34,
      armor: true,
      armorReduction: 0.2,
    },
    split: {
      char: "分",
      hp: 6,
      damage: 1,
      speed: 1.0,
      reward: 24,
      split: true,
      splitHp: 2,
      splitCount: 2,
    },
    giant: {
      char: "巨尸",
      hp: 34,
      damage: 2,
      speed: 0.72,
      reward: 100,
    },
    superGiant: {
      char: "超巨尸",
      hp: 86,
      damage: 3,
      speed: 0.62,
      reward: 250,
      armor: true,
      armorReduction: 0.15,
    },
    overlord: {
      char: "始终霸王",
      hp: 240,
      damage: 4,
      speed: 0.52,
      reward: 680,
      armor: true,
      armorReduction: 0.25,
    },
    // 新增特殊敌人
    shadow: {
      char: "影",
      hp: 10,
      damage: 1,
      speed: 2.2,
      reward: 50,
      invisible: true,
      invisibleDuration: 3000,
    },
    ironArmor: {
      char: "铁",
      hp: 18,
      damage: 2,
      speed: 0.62,
      reward: 60,
      armor: true,
      armorReduction: 0.4,
      immuneBurn: true,
    },
    swiftGhost: {
      char: "速",
      hp: 4,
      damage: 1,
      speed: 3.2,
      reward: 30,
      flying: true,
      explodeOnDeath: true,
      explodeDamage: 2,
      explodeRange: 2,
    },
    // T1 早期敌人（5个）
    crawler: {
      char: "爬",
      hp: 6,
      damage: 1,
      speed: 0.8,
      reward: 20,
    },
    bat: {
      char: "蝠",
      hp: 3,
      damage: 1,
      speed: 2.0,
      reward: 15,
      flying: true,
    },
    worm: {
      char: "蠕",
      hp: 8,
      damage: 1,
      speed: 0.9,
      reward: 28,
      split: true,
      splitHp: 2,
      splitCount: 2,
    },
    scout: {
      char: "侦",
      hp: 4,
      damage: 1,
      speed: 1.8,
      reward: 18,
      invisible: true,
      invisibleDuration: 3000,
    },
    leech: {
      char: "蚂",
      hp: 5,
      damage: 1,
      speed: 1.2,
      reward: 22,
      lifeSteal: 1,
    },
    // T2 中期敌人（6个）
    heavyArmor: {
      char: "重",
      hp: 22,
      damage: 2,
      speed: 0.6,
      reward: 75,
      armor: true,
      armorReduction: 0.35,
    },
    spitter: {
      char: "喷",
      hp: 15,
      damage: 1,
      speed: 1.1,
      reward: 55,
      ranged: true,
      range: 3,
    },
    charger: {
      char: "冲",
      hp: 18,
      damage: 2,
      speed: 1.5,
      reward: 60,
      chargeCooldown: 5000,
      chargeDuration: 2000,
      chargeSpeedMultiplier: 2.0,
    },
    swarm: {
      char: "群",
      hp: 12,
      damage: 1,
      speed: 1.3,
      reward: 40,
      summonOnDeath: true,
      summonType: 'corpse',
      summonCount: 2,
    },
    toxic: {
      char: "毒",
      hp: 16,
      damage: 1,
      speed: 0.9,
      reward: 58,
      poisonCloudOnDeath: true,
      poisonCloudDuration: 3000,
      poisonCloudDamage: 0.5,
    },
    flyer: {
      char: "翔",
      hp: 14,
      damage: 1,
      speed: 1.6,
      reward: 48,
      flying: true,
    },
    // T3 后期敌人（6个）
    juggernaut: {
      char: "霸",
      hp: 80,
      damage: 3,
      speed: 0.5,
      reward: 220,
      armor: true,
      armorReduction: 0.30,
      immuneKnockback: true,
    },
    necromancer: {
      char: "亡",
      hp: 45,
      damage: 2,
      speed: 0.7,
      reward: 140,
      summonCooldown: 8000,
      summonType: 'ghost',
      summonCount: 1,
    },
    bomber: {
      char: "炸",
      hp: 35,
      damage: 2,
      speed: 0.9,
      reward: 110,
      explodeOnDeath: true,
      explodeDamage: 8,
      explodeRange: 2,
    },
    phantom: {
      char: "幻",
      hp: 30,
      damage: 1,
      speed: 1.8,
      reward: 95,
      invisible: true,
      permanentInvisible: true,
    },
    regenerator: {
      char: "再",
      hp: 55,
      damage: 2,
      speed: 0.6,
      reward: 160,
      regenPerSecond: 1,
    },
    crystal: {
      char: "晶",
      hp: 65,
      damage: 3,
      speed: 0.5,
      reward: 185,
      armor: true,
      armorReduction: 0.25,
      shield: 20,
      shieldRegen: 2,
    },
    // T4 Boss级（3个）
    tyrant: {
      char: "暴君",
      hp: 320,
      damage: 5,
      speed: 0.45,
      reward: 850,
      armor: true,
      armorReduction: 0.30,
      immuneControl: true,
      rageBelowHp: 0.5,
      rageSpeedBonus: 0.5,
    },
    matriarch: {
      char: "母巢",
      hp: 280,
      damage: 4,
      speed: 0.4,
      reward: 780,
      summonCooldown: 6000,
      summonType: 'split',
      summonCount: 2,
      summonOnDeath: true,
      deathSummonType: 'corpse',
      deathSummonCount: 4,
    },
    doomsday: {
      char: "末日",
      hp: 400,
      damage: 6,
      speed: 0.35,
      reward: 1100,
      armor: true,
      armorReduction: 0.35,
      immuneBurn: true,
      immunePoison: true,
      explodeOnDeath: true,
      explodeDamage: 10,
      explodeRange: 10,
      globalExplosion: true,
    },
  },

  COLORS: {
    // 水墨基调：黑、浅黑（墨晕）、白
    bg: "#0c0c0c",           // 浓墨底色
    grid: "#1f1f1f",         // 淡墨网格
    gridHover: "#2a2a2a",    // 墨晕悬浮
    path: "#2d2d2d",         // 石板路底色
    pathLine: "#3a3a3a",     // 路径线条（润笔）
    pathEdge: "#1a1a1a",     // 路径边缘墨晕
    core: "#c45c48",         // 朱砂红（唯一彩色，用于核心）
    coreInner: "#8b3a2f",    // 核心深色
    tower: "#e8e8e8",        // 飞白（防御塔）
    towerShadow: "#666666",  // 塔影
    enemy: "#cccccc",        // 浅墨（敌人）
    enemyDark: "#888888",    // 浓墨敌人
    projectile: "#b0b0b0",   // 淡墨弹道
    inkTrail: "#4a4a4a",     // 墨线拖影
    text: "#f5f5f5",         // 纯白文字
    textDim: "#8a8a8a",      // 淡墨文字
    highlight: "#d4d4d4",    // 飞白高亮
    inkSplash: "#2a2a2a",    // 墨点飞溅
    inkWash: "#3d3d3d",
    thunder: '#b388ff',
    ice: '#80d8ff',
    poison: '#76ff03',
    wind: '#b0bec5',
    light: '#fff9c4',
    dark: '#7c4dff',
    star: '#e0e0e0',
    frost: '#b3e5fc',
    drum: '#ff8a65',
    banner: '#ef5350',
    bell: '#ffd54f',
    mirror: '#e0e0e0',
    zither: '#ce93d8',
    talisman: '#ffcc02',
    formation: '#ab47bc',
    lantern: '#ffe082',
    wall: '#78909c',
    moat: '#8d6e63',
    trap: '#5d4037',
    arrow: '#a1887f',
    bunker: '#607d8b',
    palisade: '#795548',
    treasure: '#ffd700',
    healer: '#81c784',
    soul: '#b0bec5',
    shadow: '#424242',
    time: '#9e9e9e',
    detonator: '#ff5722',
    parasite: '#69f0ae',
    wheel: '#ffab40',
    // 新增敌人颜色
    crawler: '#9e9e9e',
    bat: '#616161',
    worm: '#795548',
    scout: '#757575',
    leech: '#8d6e63',
    heavyArmor: '#455a64',
    spitter: '#558b2f',
    charger: '#bf360c',
    swarm: '#6d4c41',
    toxic: '#33691e',
    flyer: '#0277bd',
    juggernaut: '#263238',
    necromancer: '#4a148c',
    bomber: '#b71c1c',
    phantom: '#1a237e',
    regenerator: '#00695c',
    crystal: '#00838f',
    tyrant: '#880e4f',
    matriarch: '#4a148c',
    doomsday: '#212121',
  },

  // 融合炮塔配置（运行时由文档配方生成）
  FUSION_TOWERS: {},
  FUSION_EVOLUTION_RECIPES: {},

  // 水墨渲染配置
  INK: {
    brushRoughness: 0.3,     // 枯笔粗糙度
    inkBleed: 0.15,          // 墨晕扩散程度
    paperTexture: true,      // 纸张纹理
    trailLength: 8,          // 拖影长度
    splashCount: 12,         // 飞溅墨点数量
  },

  // 游戏玩法配置
  GAMEPLAY: {
    frozenImmunityDuration: 8000, // 冻结免疫持续时间(ms)
    burnTickInterval: 500,        // 燃烧伤害间隔(ms)
    attackAnimDuration: 200,      // 攻击动画持续时间(ms)
    shakeDuration: 150,           // 震动动画持续时间(ms)
    longPressDelay: 500,          // 长按阈值(ms)
  },
};

/**
 * 融合塔配置构建器：
 * 1. 按文档首次出现优先，构建 39 条无序配方；
 * 2. 数值采用统一推导公式；
 * 3. 追加同类型二阶段进化白名单配方。
 */
(function buildFusionConfig() {
  const PATH_COMPONENTS = new Set([
    'mountain', 'wall', 'bunker', 'moat', 'trap', 'arrow', 'palisade',
  ]);

  const BASE_FUSION_DESIGNS = [
    { key: 'fire+fire', name: '炎', desc: '强化火焰攻击，持续灼烧', components: ['fire', 'fire'] },
    { key: 'water+water', name: '淼', desc: '强化水流攻击，持续减速', components: ['water', 'water'] },
    { key: 'mountain+mountain', name: '岳', desc: '强化山脉，高血量阻挡', components: ['mountain', 'mountain'] },
    { key: 'wood+wood', name: '林', desc: '强化木塔，持续中毒', components: ['wood', 'wood'] },
    { key: 'gold+gold', name: '鑫', desc: '强化金塔，穿透攻击', components: ['gold', 'gold'] },
    { key: 'thunder+thunder', name: '霆', desc: '强化连锁效果', components: ['thunder', 'thunder'] },
    { key: 'ice+ice', name: '凌', desc: '强化冻结效果', components: ['ice', 'ice'] },
    { key: 'poison+poison', name: '蛊', desc: '强化中毒效果', components: ['poison', 'poison'] },
    { key: 'wind+wind', name: '岚', desc: '强化击退效果', components: ['wind', 'wind'] },
    { key: 'light+light', name: '辉', desc: '强化穿透效果', components: ['light', 'light'] },
    { key: 'dark+dark', name: '冥', desc: '强化生命偷取', components: ['dark', 'dark'] },
    { key: 'fire+water', name: '水火不容', desc: '高伤害+范围效果', components: ['water', 'fire'] },
    { key: 'gold+wood', name: '金枝玉叶', desc: '穿透攻击+持续伤害', components: ['gold', 'wood'] },
    { key: 'mountain+water', name: '山清水秀', desc: '阻挡+减速', components: ['mountain', 'water'] },
    { key: 'thunder+wind', name: '风雷激荡', desc: '连锁攻击+击退', components: ['wind', 'thunder'] },
    { key: 'dark+light', name: '阴阳调和', desc: '显形+生命偷取', components: ['light', 'dark'] },
    { key: 'earth+fire', name: '火土相生', desc: '高伤害+范围效果', components: ['fire', 'earth'] },
    { key: 'fire+gold', name: '真金烈火', desc: '穿透攻击+灼烧', components: ['gold', 'fire'] },
    { key: 'fire+wood', name: '钻木取火', desc: '快速攻击+持续伤害', components: ['wood', 'fire'] },
    { key: 'fire+thunder', name: '闪电', desc: '高伤害+连锁', components: ['thunder', 'fire'] },
    { key: 'fire+wind', name: '烈火', desc: '快速攻击+扩散', components: ['wind', 'fire'] },
    { key: 'ice+wind', name: '寒风', desc: '深度减速+范围效果', components: ['ice', 'wind'] },
    { key: 'fire+poison', name: '毒火', desc: '持续伤害+扩散', components: ['poison', 'fire'] },
    { key: 'ice+water', name: '冰霜', desc: '深度减速+冻结', components: ['water', 'ice'] },
    { key: 'thunder+water', name: '雷电', desc: '连锁攻击+减速', components: ['thunder', 'water'] },
    { key: 'water+wind', name: '风暴', desc: '范围伤害+减速', components: ['wind', 'water'] },
    { key: 'ice+thunder', name: '雷暴', desc: '高伤害+冻结', components: ['ice', 'thunder'] },
    { key: 'fire+mountain', name: '火山', desc: '发射火球并阻挡敌人', components: ['fire', 'mountain'] },
    { key: 'earth+water', name: '泥沼', desc: '减速+持续伤害', components: ['earth', 'water'] },
    { key: 'earth+wood', name: '根须', desc: '持续伤害+减速', components: ['earth', 'wood'] },
    { key: 'earth+gold', name: '金石', desc: '高伤害+穿透', components: ['gold', 'earth'] },
    { key: 'earth+ice', name: '冰岩', desc: '减速+阻挡', components: ['ice', 'earth'] },
    { key: 'thunder+wood', name: '雷击木', desc: '自行决定', components: ['thunder', 'wood'] },
    { key: 'banner+drum', name: '鼓旗', desc: '攻速+射程双增益', components: ['drum', 'banner'] },
    { key: 'mirror+wall', name: '壁上观', desc: '高HP阻挡+伤害反射', components: ['wall', 'mirror'] },
    { key: 'bunker+drum', name: '碉鼓', desc: '阻挡+攻速加成', components: ['bunker', 'drum'] },
    { key: 'parasite+poison', name: '蛊毒', desc: '寄生+腐蚀连锁', components: ['parasite', 'poison'] },
    { key: 'bell+drum', name: '鼓舞', desc: '攻速加成+眩晕', components: ['drum', 'bell'] },
    { key: 'banner+mirror', name: '旗帜鲜明', desc: '射程加成+反射', components: ['banner', 'mirror'] },
  ];

  // 同类型链式进化：仅白名单允许
  const EVOLUTION_DESIGNS = [
    { from: 'fire+fire', base: 'fire', char: '焱', desc: '炎火再聚，灼烧爆发' },
    { from: 'water+water', base: 'water', char: '沧', desc: '巨浪席卷，极寒水压' },
    { from: 'wood+wood', base: 'wood', char: '森', desc: '万木丛生，毒藤缠绕' },
    { from: 'gold+gold', base: 'gold', char: '鎏', desc: '鎏金贯杀，穿透增强' },
    { from: 'earth+earth', base: 'earth', char: '垚', desc: '厚土壁垒，极高阻挡' },
  ];

  // 仅用于土系链式进化入口（不计入文档 39 组统计）
  BASE_FUSION_DESIGNS.push({
    key: 'earth+earth',
    name: '圭',
    desc: '双土相叠，形成坚固土垒',
    components: ['earth', 'earth'],
  });

  function normalizeKey(a, b) {
    return [a, b].sort().join('+');
  }

  function round1(val) {
    return Math.round(val * 10) / 10;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function parseHex(hex) {
    const v = hex.replace('#', '');
    const value = v.length === 3 ? v.split('').map((ch) => ch + ch).join('') : v;
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    };
  }

  function mixHex(c1, c2) {
    const a = parseHex(c1);
    const b = parseHex(c2);
    const toHex = (v) => Math.round(v).toString(16).padStart(2, '0');
    return `#${toHex((a.r + b.r) / 2)}${toHex((a.g + b.g) / 2)}${toHex((a.b + b.b) / 2)}`;
  }

  function towerSnapshot(type, fusionRecipeMap) {
    if (CONFIG.TOWERS[type]) {
      return CONFIG.TOWERS[type];
    }
    return fusionRecipeMap[type] || null;
  }

  function computeSkillFlatDamage(desc, components) {
    let bonus = 0;
    if (desc.includes('高伤害')) bonus += 1.2;
    if (desc.includes('持续伤害')) bonus += 0.5;
    if (desc.includes('扩散')) bonus += 0.3;
    if (components.includes('thunder')) bonus += 0.4;
    return bonus;
  }

  function resolveActions(components, desc) {
    const attackComponents = new Set([
      'fire', 'water', 'wood', 'gold', 'earth', 'thunder',
      'ice', 'poison', 'wind', 'light', 'dark', 'bell', 'parasite',
    ]);
    const actions = [];
    for (const component of components) {
      if (attackComponents.has(component)) actions.push(component);
    }
    if (actions.length === 0) {
      if (desc.includes('阻挡')) actions.push('arrow');
      else actions.push('wood');
    }
    return actions;
  }

  function resolveAuras(components) {
    const extraAuras = [];
    for (const component of components) {
      if (component === 'drum') extraAuras.push({ type: 'attackSpeed', value: 0.2 });
      if (component === 'banner') extraAuras.push({ type: 'range', value: 0.2 });
      if (component === 'mirror') extraAuras.push({ type: 'reflect', value: 1.5 });
    }
    return extraAuras;
  }

  function buildRecipe(definition, tier, fusionRecipeMap, options) {
    const { isEvolution, evolutionFrom, evolutionBase } = options || {};
    const c1 = towerSnapshot(definition.components[0], fusionRecipeMap);
    const c2 = towerSnapshot(definition.components[1], fusionRecipeMap);
    if (!c1 || !c2) return null;

    const c1Cost = c1.cost || 0;
    const c2Cost = c2.cost || 0;
    const c1Damage = c1.damage || 0;
    const c2Damage = c2.damage || 0;
    const c1Range = c1.range || 0;
    const c2Range = c2.range || 0;
    const c1Cooldown = c1.cooldown || 1000;
    const c2Cooldown = c2.cooldown || 1000;
    const c1Hp = c1.hp || 0;
    const c2Hp = c2.hp || 0;

    const skillFlatDamage = computeSkillFlatDamage(definition.desc, definition.components);
    const onPath = definition.components.some((type) => {
      if (PATH_COMPONENTS.has(type)) return true;
      const snap = towerSnapshot(type, fusionRecipeMap);
      return !!snap?.onPath;
    });

    let cost = Math.round((c1Cost + c2Cost) * 0.92);
    if (isEvolution) {
      cost = Math.round(cost * 1.20);
    }

    const damage = round1((c1Damage + c2Damage) * 0.88 + skillFlatDamage);
    const cooldown = clamp(Math.round(Math.min(c1Cooldown, c2Cooldown) * 0.92), 300, 2600);
    const range = onPath ? round1(Math.max(c1Range, c2Range)) : round1(Math.max(c1Range, c2Range) + 0.4);
    const hp = onPath ? Math.round(c1Hp + c2Hp + 8) : 0;

    const color1 = CONFIG.COLORS[definition.components[0]] || CONFIG.COLORS.tower;
    const color2 = CONFIG.COLORS[definition.components[1]] || CONFIG.COLORS.tower;
    const actions = resolveActions(definition.components, definition.desc);
    const extraAuras = resolveAuras(definition.components);
    const passive = definition.desc.includes('增益') || definition.desc.includes('双增益');

    const recipe = {
      char: definition.name,
      components: definition.components.slice(),
      cost,
      damage,
      range,
      cooldown: passive ? 999999 : cooldown,
      onPath,
      hp: onPath ? hp : undefined,
      desc: definition.desc,
      color: mixHex(color1, color2),
      skillId: `fusion_${definition.key.replace(/\+/g, '_')}`,
      skillParams: {
        actions,
        damageMultiplier: tier >= 2 ? 1.25 : 1,
        extraAuras,
        passive,
      },
      tier,
      isEvolution: !!isEvolution,
      evolutionFrom: evolutionFrom || null,
      evolutionBase: evolutionBase || null,
    };

    if (extraAuras.length > 0) {
      recipe.aura = true;
      recipe.auraRange = Math.max(2, range || 0);
      recipe.auraType = extraAuras[0].type;
      recipe.auraValue = extraAuras[0].value;
      recipe.extraAuras = extraAuras.slice(1);
    }

    return recipe;
  }

  const fusionRecipeMap = {};
  for (const design of BASE_FUSION_DESIGNS) {
    const recipe = buildRecipe(design, 1, fusionRecipeMap, { isEvolution: false });
    if (recipe) {
      fusionRecipeMap[design.key] = recipe;
    }
  }

  const evolutionWhitelist = {};
  for (const evo of EVOLUTION_DESIGNS) {
    const key = normalizeKey(evo.from, evo.base);
    const source = fusionRecipeMap[evo.from];
    const baseTower = CONFIG.TOWERS[evo.base];
    if (!source || !baseTower) continue;

    const evolved = buildRecipe({
      key,
      name: evo.char,
      desc: evo.desc,
      components: [evo.from, evo.base],
    }, 2, fusionRecipeMap, {
      isEvolution: true,
      evolutionFrom: evo.from,
      evolutionBase: evo.base,
    });

    if (evolved) {
      evolved.skillId = `fusion_evo_${evo.from.replace(/\+/g, '_')}_${evo.base}`;
      evolved.skillParams.actions = Array.from(new Set([
        ...(source.skillParams?.actions || []),
        evo.base,
      ]));
      evolved.skillParams.repeat = 2;
      fusionRecipeMap[key] = evolved;
      evolutionWhitelist[key] = {
        from: evo.from,
        base: evo.base,
      };
    }
  }

  CONFIG.FUSION_TOWERS = fusionRecipeMap;
  CONFIG.FUSION_EVOLUTION_RECIPES = evolutionWhitelist;
})();
