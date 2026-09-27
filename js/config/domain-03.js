// CONFIG 领域注册
Object.assign(CONFIG, {

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
    bg: "#f4efe4",           // 宣纸底色
    grid: "#ded5c0",         // 淡墨网格（比纸底略深）
    gridHover: "#cbc2ad",    // 墨晕悬浮
    path: "#8a8377",         // 石板路底色
    pathLine: "#8a8377",     // 路径线条（润笔）
    pathEdge: "#6a6459",     // 路径边缘墨晕
    core: "#c45c48",         // 朱砂红（唯一彩色，用于核心）
    coreInner: "#8b3a2f",    // 核心深色
    tower: "#e8e8e8",        // 飞白（防御塔）
    towerShadow: "#666666",  // 塔影
    enemy: "#1c1a17",        // 浓墨（敌人）
    enemyDark: "#888888",    // 浓墨敌人
    projectile: "#4a4a4a",   // 中墨弹道（浅底上需足够的墨度）
    inkTrail: "#4a4a4a",     // 墨线拖影
    text: "#1c1a17",         // 浓墨文字
    textDim: "#6a6459",      // 淡墨文字（辅助文本）
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
});
