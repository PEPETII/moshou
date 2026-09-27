// 未归类兼容方法
/**
   * 初始化错误上报机制
   */
Game.prototype._initErrorReporting = function() {
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
  
};
/**
   * 上报错误
   */
Game.prototype._reportError = function(errorInfo) {
    console.error('游戏错误:', errorInfo.message);

    this.errorLog.push(errorInfo);

    // 限制日志大小
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog.shift();
    }

    // 保存到本地存储
    this._saveErrorLog();
  
};
/**
   * 手动上报错误（用于捕获的异常）
   */
Game.prototype.reportError = function(message, extra = {}) {
    this._reportError({
      type: 'manual',
      message,
      ...extra,
      time: Date.now()
    });
  
};
/**
   * 保存错误日志到本地存储
   */
Game.prototype._saveErrorLog = function() {
    try {
      localStorage.setItem('moshou_error_log', JSON.stringify(this.errorLog));
    } catch (e) {
      console.warn('无法保存错误日志:', e);
    }
  
};
/**
   * 从本地存储加载错误日志
   */
Game.prototype._loadErrorLog = function() {
    try {
      const saved = localStorage.getItem('moshou_error_log');
      if (saved) {
        this.errorLog = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('无法加载错误日志:', e);
      this.errorLog = [];
    }
  
};
/**
   * 获取错误日志
   */
Game.prototype.getErrorLog = function() {
    return this.errorLog;
  
};
/**
   * 清空错误日志
   */
Game.prototype.clearErrorLog = function() {
    this.errorLog = [];
    try {
      localStorage.removeItem('moshou_error_log');
    } catch (e) {
      console.warn('无法清空错误日志:', e);
    }
  
};
/**
   * 从本地存储加载已完成的关卡
   */
Game.prototype._loadCompletedLevels = function() {
    try {
      const saved = localStorage.getItem('moshou_completed_levels');
      if (saved) {
        this.completedLevels = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('无法加载已完成的关卡:', e);
      this.completedLevels = [];
    }
  
};
/**
   * 保存已完成的关卡到本地存储
   */
Game.prototype._saveCompletedLevels = function() {
    try {
      localStorage.setItem('moshou_completed_levels', JSON.stringify(this.completedLevels));
    } catch (e) {
      console.warn('无法保存已完成的关卡:', e);
    }
  
};
/**
   * 标记关卡为已完成
   */
Game.prototype.markLevelCompleted = function(levelId) {
    if (!this.completedLevels.includes(levelId)) {
      this.completedLevels.push(levelId);
      this._saveCompletedLevels();
    }
  
};
Game.prototype.loadLevel = function(levelId) {
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
  
};
