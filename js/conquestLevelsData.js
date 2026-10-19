// 征服模式关卡数据
// 征服模式 - 实验阶段仅保留 1 个主题、2 个关卡（其余主题的生成参数保留在 generateLevel 内）

// 主题配置
const CONQUEST_THEMES = [
  {
    id: 1,
    name: "试炼",
    icon: "试",
    color: "#8B4513",
    desc: "初入墨境，以基础敌人磨练技艺",
    unlockRequirement: null
  }
];

// 生成单个关卡配置
function generateLevel(themeId, levelIndex) {
  const levelId = `${themeId}-${levelIndex + 1}`;
  const difficulty = (themeId - 1) * 10 + levelIndex * 2 + 1;
  
  // 初始墨水配置
  const startInkRanges = {
    1: { min: 300, max: 500 },
    2: { min: 400, max: 600 },
    3: { min: 500, max: 700 },
    4: { min: 600, max: 800 },
    5: { min: 700, max: 1000 }
  };
  const inkRange = startInkRanges[themeId];
  const startInk = inkRange.min + Math.floor((inkRange.max - inkRange.min) * levelIndex / 4);
  
  // 召唤消耗随关卡递增
  const baseSummonCost = 50;
  const summonCost = baseSummonCost + (themeId - 1) * 10 + levelIndex * 5;
  
  return {
    id: levelId,
    theme: themeId,
    difficulty: difficulty,
    startInk: startInk,
    summonCost: summonCost,
    summonCostGrowth: 0.04, // 每已召唤 1 座，下次召唤费用 +4%
    // 连续刷怪（工单 04）：不再有固定波次；坚守时长默认 CONFIG.HOLD_SECONDS，
    // 失败线默认 CONFIG.CONQUEST_DANGER_LIMIT，需要时可在此用 holdSeconds / dangerLimit 覆盖
  };
}

// 实验阶段（工单 02）：仅主题 1，共 2 关
const CONQUEST_LEVELS_PER_THEME = 2;
const CONQUEST_LEVELS_DATA = {};

for (let themeId = 1; themeId <= CONQUEST_THEMES.length; themeId++) {
  for (let levelIndex = 0; levelIndex < CONQUEST_LEVELS_PER_THEME; levelIndex++) {
    const level = generateLevel(themeId, levelIndex);
    CONQUEST_LEVELS_DATA[level.id] = level;
  }
}

// 导出数据（兼容不同模块系统）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONQUEST_THEMES, CONQUEST_LEVELS_DATA };
}
