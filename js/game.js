class Game {
  constructor() {
    this.canvas = document.getElementById("game-canvas");
    this.ctx = this.canvas.getContext("2d");
    // 画布 = 视口（960×432，6 行 × 72px）；世界比视口宽，由镜头横向滚动查看
    // 位图按屏幕实际像素生成（高清），坐标系仍是逻辑 960×432
    RenderScale.setup(this.canvas, CONFIG.VIEW_W, CONFIG.VIEW_H);
    this.worldW = CONFIG.GRID_COLS * CONFIG.CELL_SIZE;

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

    // 连续刷怪 + 限时坚守（工单 04）：状态字段由 resetBattleState 统一初始化
    this.resetBattleState(null);

    this.gameEnded = false;
    this.victory = false;
    this.paused = false;
    this.isPaused = false;
    this.menuPaused = false; // 战斗暂停菜单打开时为 true，见 js/ui/battle-pause.js
    this.inputLocked = false;

    // 已完成的关卡列表（用于解锁主题）
    this.completedLevels = [];
    this._loadCompletedLevels();

    this.ui = new UI(this);
    this._setupCamera();

    this.lastTime = 0;
    this.animationId = null;

    this.particleSystem = new ParticleSystem();
    this.projectilePool = new ProjectilePool();
    this.runtimeIndexes = new RuntimeIndexes(this);
    this.staticLayer = new StaticCanvasLayer(this);
    this.debugStats = new DebugStatsOverlay(this);

    this.gameStarted = false;

    this._placementGridSet = null;
    this._pathCellSet = new Set();

    this.menuInkBg = new MenuInkBackground();
    this.menuMapBg = new MenuMapBackground();
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

  // 镜头：画布挂上 canvas.camera，所有坐标换算（utils.js）据此加上镜头偏移
  _setupCamera() {
    const ui = this.ui;
    this.camera = new Camera({
      canvas: this.canvas,
      worldW: this.worldW,
      viewW: CONFIG.VIEW_W,
      viewH: CONFIG.VIEW_H,
      hitTower: (cx, cy, isTouch) => !!ui.pickTowerNear(cx, cy, {
        tolerance: isTouch ? (window.DeviceProfile && window.DeviceProfile.tapTolerance) : undefined,
      }),
      // 信息面板是 DOM 浮层，不随镜头移动：镜头一滚就收起
      onScroll: () => { if (ui.selectedTower) ui.clearTowerSelection(); },
      getDragPoint: () => {
        if (ui.placementDrag && ui.placementDrag.active) return ui.placementDrag;
        if (ui.isDragging && ui.draggingTower && ui.dragCurrentPos) {
          return { clientX: ui.dragCurrentPos.x, clientY: ui.dragCurrentPos.y };
        }
        return null;
      },
    });
    this.camera.bindInput();
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
        const parsed = JSON.parse(saved);
        // 丢弃已不存在的关卡 ID（旧存档兼容，不改写存档）
        this.completedLevels = Array.isArray(parsed)
          ? parsed.filter((id) => typeof levelManager === 'undefined' || levelManager.get(id))
          : [];
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
    this.resetBattleState(level);
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
    // 开局镜头对准入口（左端）
    if (this.camera) this.camera.jumpTo(0);

    this.ui.updateUnlocks(this.getUnlockedTowers());
    this.updateUI();
  
  }
}


window.addEventListener("load", () => {
  window.gameInstance = new Game();
});
