class Game {
  constructor() {
    this.canvas = document.getElementById("game-canvas");
    this.ctx = this.canvas.getContext("2d");
    // 画布尺寸必须与网格匹配：20列 x 48px = 960px，9行 x 48px = 432px
    this.canvas.width = 960;
    this.canvas.height = 432;

    this.inkRenderer = new InkRenderer(this.ctx);

    this.currentLevel = "1-1";
    this.currentLevelData = null;
    this.ink = 300;
    this.coreHp = 20;
    this.maxCoreHp = 20;

    this.towers = [];
    this.enemies = [];
    this.path = [];
    this.core = null;
    this.placementGrid = [];

    this.wave = 0;
    this.maxWave = 3;
    this.waveInProgress = false;
    this.spawnQueue = [];
    this.spawnTimer = null;
    this.spawnTimerId = null;

    this.MAX_SPAWN_COUNT = 500;
    this.spawnedCount = 0;

    this.gameEnded = false;
    this.victory = false;
    this.paused = false;
    this.isPaused = false;
    this.inputLocked = false;

    // 已完成的关卡列表（用于解锁主题）
    this.completedLevels = [];
    this._loadCompletedLevels();

    this.ui = new UI(this);

    this.lastTime = 0;
    this.animationId = null;

    this.particleSystem = new ParticleSystem();
    this.projectilePool = new ProjectilePool();
    this.runtimeIndexes = new RuntimeIndexes(this);
    this.staticLayer = new StaticCanvasLayer(this);
    this.debugStats = new DebugStatsOverlay(this);

    this.freeUpgrades = 0;
    this.rareItems = [];

    this._waveCompleteChecking = false;

    this.gameStarted = false;

    this._placementGridSet = null;
    this._pathCellSet = new Set();

    this.menuInkBg = new MenuInkBackground();
    this.inkTrailAnimation = new InkTrailAnimation(this);

    // UI 更新帧计数器（避免每帧都刷新 UI）
    this.uiUpdateCounter = 0;
    this.uiUpdateInterval = 10; // 每 10 帧更新一次 UI

    // 敌人数量追踪（用于优化 rebuildEnemies 调用频率）
    this._lastEnemyCount = 0;

    // 初始化错误上报机制
    this._initErrorReporting();

    // 页面可见性变化监听（自动暂停/恢复）
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.isPaused = true;
      } else {
        this.isPaused = false;
        this.lastTime = performance.now();
      }
    });
  
  }

  _initErrorReporting() {
    this.errorLog = [];
    this.maxErrorLogSize = 50;

    // 监听全局错误
    window.addEventListener('error', (e) => {
      this._reportError({
        type: 'error',
        message: e.message,
        stack: e.error?.stack,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        time: Date.now()
      });
    });

    // 监听未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', (e) => {
      this._reportError({
        type: 'unhandledrejection',
        message: e.reason?.message || String(e.reason),
        stack: e.reason?.stack,
        time: Date.now()
      });
    });

    // 加载之前存储的错误
    this._loadErrorLog();
  
  }

  _reportError(errorInfo) {
    console.error('游戏错误:', errorInfo.message);

    this.errorLog.push(errorInfo);

    // 限制日志大小
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog.shift();
    }

    // 保存到本地存储
    this._saveErrorLog();
  
  }

  reportError(message, extra = {}) {
    this._reportError({
      type: 'manual',
      message,
      ...extra,
      time: Date.now()
    });
  
  }

  _saveErrorLog() {
    try {
      localStorage.setItem('moshou_error_log', JSON.stringify(this.errorLog));
    } catch (e) {
      console.warn('无法保存错误日志:', e);
    }
  
  }

  _loadErrorLog() {
    try {
      const saved = localStorage.getItem('moshou_error_log');
      if (saved) {
        this.errorLog = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('无法加载错误日志:', e);
      this.errorLog = [];
    }
  
  }

  getErrorLog() {
    return this.errorLog;
  
  }

  clearErrorLog() {
    this.errorLog = [];
    try {
      localStorage.removeItem('moshou_error_log');
    } catch (e) {
      console.warn('无法清空错误日志:', e);
    }
  
  }

  _loadCompletedLevels() {
    try {
      const saved = localStorage.getItem('moshou_completed_levels');
      if (saved) {
        this.completedLevels = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('无法加载已完成的关卡:', e);
      this.completedLevels = [];
    }
  
  }

  _saveCompletedLevels() {
    try {
      localStorage.setItem('moshou_completed_levels', JSON.stringify(this.completedLevels));
    } catch (e) {
      console.warn('无法保存已完成的关卡:', e);
    }
  
  }

  markLevelCompleted(levelId) {
    if (!this.completedLevels.includes(levelId)) {
      this.completedLevels.push(levelId);
      this._saveCompletedLevels();
    }
  
  }

  loadLevel(levelId) {
    const level = levelManager.get(levelId);
    if (!level) return;

    this.currentLevel = levelId;
    this.currentLevelData = level;
    this.ink = level.startInk;
    this.coreHp = level.coreHp;
    this.maxCoreHp = level.coreHp;
    this.wave = 0;
    this.maxWave = level.waves.length;
    this.towers = [];
    this.enemies = [];
    this.gameEnded = false;
    this.victory = false;

    this.path = level.path;
    this.core = level.core;
    this.placementGrid = level.placementGrid;
    this._placementGridSet = new Set(
      level.placementGrid.map(c => `${c.x},${c.y}`)
    );
    this._pathCellSet = new Set();
    const paths = Array.isArray(this.path[0]) ? this.path : [this.path];
    for (const p of paths) {
      for (const point of p) {
        this._pathCellSet.add(gridKey(point.x, point.y));
      }
    }
    this.runtimeIndexes.rebuildTowers();
    this.runtimeIndexes.rebuildEnemies();
    this.staticLayer.invalidate();

    this.ui.updateUnlocks(this.getUnlockedTowers());
    this.updateUI();
  
  }
}


window.addEventListener("load", () => {
  window.gameInstance = new Game();
});
