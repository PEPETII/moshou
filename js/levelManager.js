/**
 * 关卡管理器 - 支持主题分类的关卡系统
 * 4 个主题，每个主题 5 个关卡，共 20 关；主题表与关卡数据都来自 levelsData.js / data/levels/
 * 关卡ID格式: "主题-关卡" 如 "1-1", "4-5"
 */
class LevelManager {
  constructor() {
    this._registry = new Map();
    this._cache = new Map();
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
    // 主题表只有 levelsData.js 的 THEMES 一份
    const themeConfigs = typeof THEMES !== 'undefined' ? THEMES : {};
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
    // 按实际注册的关卡取，theme 字段匹配，按关卡序号排序
    const levels = [];
    for (const [id, raw] of this._registry) {
      if (raw.theme !== themeId) continue;
      const n = parseInt(String(id).split('-')[1], 10);
      levels.push({ n, id });
    }
    levels.sort((a, b) => a.n - b.n);
    return levels.map((l) => this.get(l.id)).filter(Boolean);
  }

  /**
   * 检查主题是否已解锁
   * 第一个主题默认解锁，其他主题需要满足 unlockRequirement 条件
   */
  isThemeUnlocked() {
    // 所有主题、关卡全部解锁（决策 E7）；unlockRequirement 保留但不再参与判断，通关记录照常保存与显示
    return true;
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

    return {
      id: rawData.id,
      name: rawData.name,
      theme: rawData.theme,
      difficulty: rawData.difficulty || 1,
      tags: rawData.tags || [],
      prerequisites: rawData.prerequisites || [],
      startInk: rawData.startInk,
      coreHp: rawData.coreHp,
      path: paths.length === 1 ? paths[0] : paths,
      core: rawData.core,
      placementGrid: placementGrid,
      // 连续刷怪（工单 04）：不再有固定波次；可选 holdSeconds 覆盖默认坚守时长
      holdSeconds: rawData.holdSeconds,
      // 刷怪编排（工单 01）：本关敌人、重敌、精英、首领、加压时段与血量倍率。归一化白名单必须列全，否则会被静默丢弃
      hpMul: rawData.hpMul || 1,
      roster: rawData.roster || null,
      heavy: rawData.heavy || null,
      elites: rawData.elites || null,
      boss: rawData.boss || null,
      surges: rawData.surges || null,
      desc: rawData.desc || '',
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
}

const levelManager = new LevelManager();
