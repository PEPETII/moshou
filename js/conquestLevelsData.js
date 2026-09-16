// 征服模式关卡数据
// 征服模式 - 5个主题，每个主题5个关卡

// 主题配置
const CONQUEST_THEMES = [
  {
    id: 1,
    name: "试炼",
    icon: "试",
    color: "#8B4513",
    desc: "初入墨境，以基础敌人磨练技艺",
    unlockRequirement: null
  },
  {
    id: 2,
    name: "疾风",
    icon: "风",
    color: "#2E8B57",
    desc: "迅捷如风的敌人考验你的反应",
    unlockRequirement: { themeId: 1, levelIndex: 4 }
  },
  {
    id: 3,
    name: "熔岩",
    icon: "熔",
    color: "#B22222",
    desc: "面对高血量敌人的持久战",
    unlockRequirement: { themeId: 2, levelIndex: 4 }
  },
  {
    id: 4,
    name: "寒冰",
    icon: "冰",
    color: "#4682B4",
    desc: "混合敌群的复杂战场",
    unlockRequirement: { themeId: 3, levelIndex: 4 }
  },
  {
    id: 5,
    name: "无尽",
    icon: "无",
    color: "#4B0082",
    desc: "所有敌类型的终极挑战",
    unlockRequirement: { themeId: 4, levelIndex: 4 }
  }
];

// 生成波次配置的辅助函数
function generateWaves(themeId, levelIndex, maxWave) {
  const waves = [];
  const difficultyMultiplier = (themeId - 1) * 5 + levelIndex + 1;
  
  // 主题对应的敌人类型
  const enemyTypesByTheme = {
    1: ['corpse', 'ghost', 'armor', 'split'],           // 试炼：基础敌人
    2: ['swiftGhost', 'ghost', 'corpse', 'split'],      // 疾风：迅捷幽灵为主
    3: ['giant', 'superGiant', 'armor', 'ironArmor'],   // 熔岩：高血量敌人
    4: ['corpse', 'ghost', 'armor', 'split', 'giant', 'shadow'], // 寒冰：混合
    5: ['corpse', 'ghost', 'armor', 'split', 'giant', 'superGiant', 'overlord', 'shadow', 'ironArmor', 'swiftGhost'] // 无尽：全部
  };
  
  const availableTypes = enemyTypesByTheme[themeId];
  
  for (let waveIndex = 0; waveIndex < maxWave; waveIndex++) {
    const waveDifficulty = difficultyMultiplier + waveIndex * 2;
    const enemyCount = Math.max(50, 5 + waveIndex * 5 + Math.floor(difficultyMultiplier / 2));
    const delay = Math.max(800 - waveIndex * 100 - difficultyMultiplier * 10, 300);
    
    // 根据波次选择敌人类型
    let typeIndex = Math.min(waveIndex, availableTypes.length - 1);
    // 后期波次可能混合更强敌人类型
    if (waveIndex >= 2 && themeId >= 3) {
      typeIndex = Math.min(waveIndex + 1, availableTypes.length - 1);
    }
    const enemyType = availableTypes[typeIndex] || availableTypes[0];
    
    waves.push({
      type: enemyType,
      count: enemyCount,
      delay: delay
    });
  }
  
  return waves;
}

// 生成单个关卡配置
function generateLevel(themeId, levelIndex) {
  const levelId = `${themeId}-${levelIndex + 1}`;
  const difficulty = (themeId - 1) * 10 + levelIndex * 2 + 1;
  
  // 初始金币配置
  const startGoldRanges = {
    1: { min: 300, max: 500 },
    2: { min: 400, max: 600 },
    3: { min: 500, max: 700 },
    4: { min: 600, max: 800 },
    5: { min: 700, max: 1000 }
  };
  const goldRange = startGoldRanges[themeId];
  const startGold = goldRange.min + Math.floor((goldRange.max - goldRange.min) * levelIndex / 4);
  
  // 召唤消耗随关卡递增
  const baseSummonCost = 50;
  const summonCost = baseSummonCost + (themeId - 1) * 10 + levelIndex * 5;
  
  // 波次数配置
  const maxWaveByTheme = {
    1: 3,
    2: 3,
    3: 4,
    4: 4,
    5: 5
  };
  const maxWave = maxWaveByTheme[themeId];
  
  // 生成波次
  const waves = generateWaves(themeId, levelIndex, maxWave);
  
  return {
    id: levelId,
    theme: themeId,
    difficulty: difficulty,
    startGold: startGold,
    summonCost: summonCost,
    maxWave: maxWave,
    waves: waves,
    maxAliveEnemies: 50
  };
}

// 生成所有25个关卡
const CONQUEST_LEVELS_DATA = {};

for (let themeId = 1; themeId <= 5; themeId++) {
  for (let levelIndex = 0; levelIndex < 5; levelIndex++) {
    const level = generateLevel(themeId, levelIndex);
    CONQUEST_LEVELS_DATA[level.id] = level;
  }
}

// 导出数据（兼容不同模块系统）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONQUEST_THEMES, CONQUEST_LEVELS_DATA };
}
