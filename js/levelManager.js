/**
 * 关卡管理器 - 支持主题分类的关卡系统
 * 5个主题，每个主题10个关卡，共50关
 * 关卡ID格式: "主题-关卡" 如 "1-1", "2-5", "5-10"
 */
class LevelManager {
  constructor() {
    this._registry = new Map();
    this._cache = new Map();
    this._waveTemplates = new Map();
    this._sortedIds = [];
    this._dirty = true;
    this._themes = new Map();
    
    // 初始化主题配置
    this._initThemes();
    // 加载关卡数据
    this._loadLevelData();
  }

  /**
   * 初始化主题配置
   */
  _initThemes() {
    const themeConfigs = {
      1: { id: 1, name: "初墨", icon: "墨", color: "#8a8a8a", desc: "水墨初染，入门试炼", unlockRequirement: null },
      2: { id: 2, name: "风林", icon: "风", color: "#81c784", desc: "疾风骤雨，速度试炼", unlockRequirement: { theme: 1, level: 5 } },
      3: { id: 3, name: "火山", icon: "火", color: "#ff7043", desc: "烈焰焚天，力量试炼", unlockRequirement: { theme: 1, level: 10 } },
      4: { id: 4, name: "玄冰", icon: "冰", color: "#4fc3f7", desc: "冰封千里，控制试炼", unlockRequirement: { theme: 2, level: 5 } },
      5: { id: 5, name: "终焉", icon: "终", color: "#ab47bc", desc: "末日降临，终极试炼", unlockRequirement: { theme: 3, level: 5 } }
    };
    
    for (const [id, config] of Object.entries(themeConfigs)) {
      this._themes.set(parseInt(id), config);
    }
  }

  /**
   * 加载关卡数据
   */
  _loadLevelData() {
    // 从LEVELS_DATA加载所有关卡
    if (typeof LEVELS_DATA !== 'undefined') {
      for (const [id, data] of Object.entries(LEVELS_DATA)) {
        this._registry.set(id, data);
      }
    }
    this._dirty = true;
  }

  /**
   * 获取所有主题
   */
  getThemes() {
    return Array.from(this._themes.values());
  }

  /**
   * 获取指定主题
   */
  getTheme(themeId) {
    return this._themes.get(themeId);
  }

  /**
   * 获取主题下的所有关卡
   */
  getLevelsByTheme(themeId) {
    const levels = [];
    for (let i = 1; i <= 10; i++) {
      const levelId = `${themeId}-${i}`;
      const level = this.get(levelId);
      if (level) {
        levels.push(level);
      }
    }
    return levels;
  }

  /**
   * 检查主题是否已解锁
   * 第一个主题默认解锁，其他主题需要满足 unlockRequirement 条件
   */
  isThemeUnlocked(themeId, completedLevels = []) {
    // 第一个主题默认解锁
    if (themeId === 1) return true;

    const theme = this.getTheme(themeId);
    if (!theme || !theme.unlockRequirement) return true;

    const { theme: reqTheme, level: reqLevel } = theme.unlockRequirement;
    const requiredLevelId = `${reqTheme}-${reqLevel}`;
    return completedLevels.includes(requiredLevelId);
  }

  /**
   * 获取主题进度
   */
  getThemeProgress(themeId, completedLevels = []) {
    const levels = this.getLevelsByTheme(themeId);
    const completed = levels.filter(l => completedLevels.includes(l.id)).length;
    return { total: levels.length, completed };
  }

  register(id, levelData) {
    if (this._registry.has(id)) {
      console.warn(`Level ${id} already registered, overwriting`);
    }
    this._registry.set(id, levelData);
    this._cache.delete(id);
    this._dirty = true;
  }

  registerBatch(levels) {
    for (const level of levels) {
      this._registry.set(level.id, level);
    }
    this._dirty = true;
  }

  registerWaveTemplate(templateId, template) {
    this._waveTemplates.set(templateId, template);
  }

  get(id) {
    // 支持向后兼容：如果传入数字，转换为 "1-x" 格式
    if (typeof id === 'number') {
      id = `1-${id}`;
    }
    
    if (this._cache.has(id)) {
      return this._cache.get(id);
    }

    const rawData = this._registry.get(id);
    if (!rawData) return null;

    const resolved = this._resolveLevel(rawData);
    this._cache.set(id, resolved);
    return resolved;
  }

  getAll() {
    if (this._dirty) {
      // 按主题和关卡号排序
      this._sortedIds = Array.from(this._registry.keys()).sort((a, b) => {
        const [themeA, levelA] = a.split('-').map(Number);
        const [themeB, levelB] = b.split('-').map(Number);
        if (themeA !== themeB) return themeA - themeB;
        return levelA - levelB;
      });
      this._dirty = false;
    }
    return this._sortedIds.map(id => this.get(id));
  }

  getCount() {
    return this._registry.size;
  }

  hasNext(currentId) {
    const ids = this._getSortedIds();
    const idx = ids.indexOf(currentId);
    return idx >= 0 && idx < ids.length - 1;
  }

  getNextId(currentId) {
    const ids = this._getSortedIds();
    const idx = ids.indexOf(currentId);
    if (idx < 0 || idx >= ids.length - 1) return null;
    return ids[idx + 1];
  }

  getByIds(ids) {
    return ids.map(id => this.get(id)).filter(Boolean);
  }

  getByDifficulty(minDiff, maxDiff) {
    return this.getAll().filter(l =>
      l.difficulty >= minDiff && l.difficulty <= maxDiff
    );
  }

  getByTag(tag) {
    return this.getAll().filter(l => l.tags && l.tags.includes(tag));
  }

  clearCache() {
    this._cache.clear();
  }

  _getSortedIds() {
    if (this._dirty) {
      this._sortedIds = Array.from(this._registry.keys()).sort((a, b) => {
        const [themeA, levelA] = a.split('-').map(Number);
        const [themeB, levelB] = b.split('-').map(Number);
        if (themeA !== themeB) return themeA - themeB;
        return levelA - levelB;
      });
      this._dirty = false;
    }
    return this._sortedIds;
  }

  _resolveLevel(rawData) {
    const paths = this._normalizePaths(rawData.path);
    const placementGrid = this._computePlacementGrid(paths, rawData.specialTerrain || []);
    const waves = this._resolveWaves(rawData.waves);

    return {
      id: rawData.id,
      name: rawData.name,
      theme: rawData.theme,
      difficulty: rawData.difficulty || 1,
      tags: rawData.tags || [],
      prerequisites: rawData.prerequisites || [],
      startGold: rawData.startGold,
      coreHp: rawData.coreHp,
      path: paths.length === 1 ? paths[0] : paths,
      core: rawData.core,
      placementGrid: placementGrid,
      waves: waves,
      unlocks: rawData.unlocks || [],
      specialTerrain: rawData.specialTerrain || [],
      metadata: rawData.metadata || {}
    };
  }

  _normalizePaths(pathData) {
    if (!pathData) return [];

    if (Array.isArray(pathData[0]) || (pathData[0] && typeof pathData[0] === 'object' && !('x' in pathData[0]))) {
      return pathData;
    }

    return [pathData];
  }

  _computePlacementGrid(paths, specialTerrain) {
    const pathSet = new Set();
    for (const p of paths) {
      for (const point of p) {
        pathSet.add(`${point.x},${point.y}`);
      }
    }

    const terrainSet = new Set();
    for (const t of specialTerrain) {
      terrainSet.add(`${t.x},${t.y}`);
    }

    const grid = [];
    for (let y = 0; y < CONFIG.GRID_ROWS; y++) {
      for (let x = 0; x < CONFIG.GRID_COLS; x++) {
        if (!pathSet.has(`${x},${y}`) && !terrainSet.has(`${x},${y}`)) {
          grid.push({ x, y });
        }
      }
    }
    return grid;
  }

  _resolveWaves(wavesData) {
    if (!wavesData) return [];

    const resolved = [];
    for (const wave of wavesData) {
      if (wave.template) {
        const template = this._waveTemplates.get(wave.template);
        if (template) {
          const merged = Object.assign({}, template, wave);
          delete merged.template;
          resolved.push(merged);
        } else {
          console.warn(`Wave template "${wave.template}" not found`);
          resolved.push(wave);
        }
      } else {
        resolved.push(wave);
      }
    }
    return resolved;
  }
}

const levelManager = new LevelManager();

// 注册波次模板
levelManager.registerWaveTemplate('basicSwarm', {
  enemies: [{type:"corpse",count:5,delay:1000}]
});

levelManager.registerWaveTemplate('ghostRush', {
  enemies: [{type:"ghost",count:3,delay:1500}]
});

levelManager.registerWaveTemplate('armoredFront', {
  enemies: [{type:"armor",count:2,delay:2000}]
});

levelManager.registerWaveTemplate('bossWave', {
  enemies: [{type:"superGiant",count:1,delay:3000},{type:"overlord",count:1,delay:5000}]
});
