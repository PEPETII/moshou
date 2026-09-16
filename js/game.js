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
    this.gold = 300;
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

  /**
   * 初始化错误上报机制
   */
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

  /**
   * 上报错误
   */
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

  /**
   * 手动上报错误（用于捕获的异常）
   */
  reportError(message, extra = {}) {
    this._reportError({
      type: 'manual',
      message,
      ...extra,
      time: Date.now()
    });
  }

  /**
   * 保存错误日志到本地存储
   */
  _saveErrorLog() {
    try {
      localStorage.setItem('moshou_error_log', JSON.stringify(this.errorLog));
    } catch (e) {
      console.warn('无法保存错误日志:', e);
    }
  }

  /**
   * 从本地存储加载错误日志
   */
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

  /**
   * 获取错误日志
   */
  getErrorLog() {
    return this.errorLog;
  }

  /**
   * 清空错误日志
   */
  clearErrorLog() {
    this.errorLog = [];
    try {
      localStorage.removeItem('moshou_error_log');
    } catch (e) {
      console.warn('无法清空错误日志:', e);
    }
  }

  /**
   * 从本地存储加载已完成的关卡
   */
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

  /**
   * 保存已完成的关卡到本地存储
   */
  _saveCompletedLevels() {
    try {
      localStorage.setItem('moshou_completed_levels', JSON.stringify(this.completedLevels));
    } catch (e) {
      console.warn('无法保存已完成的关卡:', e);
    }
  }

  /**
   * 标记关卡为已完成
   */
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
    this.gold = level.startGold;
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

  getUnlockedTowers() {
    // 所有炮塔默认解锁
    return Object.keys(CONFIG.TOWERS).filter(type => type !== 'fusion');
  }

  canPlaceTower(type, gx, gy) {
    if (this.inkTrailAnimation && this.inkTrailAnimation.active) return false;
    const config = CONFIG.TOWERS[type];
    if (!config) return false;
    if (this.gold < config.cost) return false;

    if (config.onPath) {
      return this._pathCellSet.has(gridKey(gx, gy)) && !this.runtimeIndexes.getTowerAt(gx, gy);
    }

    if (this._placementGridSet && this._placementGridSet.has(`${gx},${gy}`)) {
      return !this.runtimeIndexes.getTowerAt(gx, gy);
    }

    return false;
  }

  placeTower(type, gx, gy) {
    if (this.inputLocked || this.gameEnded) return false;
    if (!this.canPlaceTower(type, gx, gy)) return false;

    const config = CONFIG.TOWERS[type];
    if (this.gold < config.cost) return false;
    this.gold -= config.cost;
    if (this.gold < 0) this.gold = 0;

    const tower = new Tower(type, gx, gy, this);
    this.towers.push(tower);
    this.runtimeIndexes.rebuildTowers();

    this.updateUI();
    return true;
  }

  getTowerAt(gx, gy) {
    return this.runtimeIndexes.getTowerAt(gx, gy);
  }

  removeTower(tower) {
    const index = this.towers.indexOf(tower);
    if (index > -1) {
      this.towers.splice(index, 1);
      this.runtimeIndexes.rebuildTowers();
    }
  }

  sellTower(tower) {
    this.gold += tower.getSellValue();
    this.removeTower(tower);
    this.updateUI();
  }

  getFusionType(type1, type2) {
    return fusionSystem.getFusionType(type1, type2);
  }

  canFuse(tower1, tower2) {
    const result = fusionSystem.canFuse(tower1.type, tower2.type, {
      tower1,
      tower2,
      gold: this.gold,
      path: this.path
    });
    return result.canFuse;
  }

  fuseTowers(tower1, tower2) {
    try {
      const result = fusionSystem.canFuse(tower1.type, tower2.type, {
        tower1,
        tower2,
        gold: this.gold,
        path: this.path
      });
      if (!result.canFuse) return false;

      const fusionType = result.key;
    const fusionConfig = result.recipe;
    if (this.gold < fusionConfig.cost) return false;
    this.gold -= fusionConfig.cost;
    if (this.gold < 0) this.gold = 0;

      let gx, gy;
      if (fusionConfig.onPath) {
        const anchorTower = tower1.onPath ? tower1 : (tower2.onPath ? tower2 : tower1);
        gx = anchorTower.gx;
        gy = anchorTower.gy;
      } else {
        gx = tower1.gx;
        gy = tower1.gy;
      }

      this.removeTower(tower1);
      this.removeTower(tower2);

      const fusionTower = new FusionTower(fusionType, gx, gy, this);
      this.towers.push(fusionTower);
      this.runtimeIndexes.rebuildTowers();

      const pos = gridToPixel(gx, gy);
      this.particleSystem.createExplosion(pos.x, pos.y, 20, fusionConfig.color);

      this.updateUI();
      return true;
    } finally {
      // 确保无论融合成功与否，缓存都会被清理
      fusionSystem.clearCache();
    }
  }

  getFusionPreview(tower1, tower2) {
    return fusionSystem.getPreview(tower1.type, tower2.type, this.gold);
  }

  startWave() {
    if (this.inputLocked || this.waveInProgress || this.gameEnded) return;
    if (this.wave >= this.maxWave) return;
    if (this.inkTrailAnimation && this.inkTrailAnimation.active) return;

    this._waveCompleteChecking = false;

    if (this.spawnTimerId) {
      clearTimeout(this.spawnTimerId);
      this.spawnTimerId = null;
    }

    this.wave++;
    this.waveInProgress = true;

    for (const tower of this.towers) {
      if (tower.type === 'treasure') {
        tower.waveCount++;
        let gold = tower.goldPerWave;
        if (tower.waveCount % tower.interestInterval === 0) {
          gold += tower.interestBonus;
        }
        this.gold += gold;
      }
    }

    const level = this.currentLevelData;
    const waveData = level.waves[this.wave - 1];

    this.spawnQueue = [];
    for (const enemyGroup of waveData.enemies) {
      for (let i = 0; i < enemyGroup.count; i++) {
        this.spawnQueue.push({
          type: enemyGroup.type,
          delay: enemyGroup.delay,
        });
      }
    }

    this.spawnedCount = 0;

    this.spawnNextEnemy();
    this.updateUI();
  }

  spawnNextEnemy() {
    if (this.spawnedCount >= this.MAX_SPAWN_COUNT) {
      console.warn('达到最大生成数量限制');
      return;
    }

    if (this.spawnQueue.length === 0) {
      this.checkWaveComplete();
      return;
    }

    const data = this.spawnQueue.shift();

    const paths = Array.isArray(this.path[0]) ? this.path : [this.path];
    const randomPath = paths[Math.floor(Math.random() * paths.length)];

    const enemy = new Enemy(data.type, randomPath, this);
    this.enemies.push(enemy);
    this.spawnedCount++;
    this.runtimeIndexes.rebuildEnemies();

    if (this.spawnQueue.length > 0) {
      const nextDelay = this.spawnQueue[0].delay;
      this.spawnTimerId = setTimeout(() => this.spawnNextEnemy(), nextDelay);
    } else {
      this.checkWaveComplete();
    }
  }

  spawnSplitEnemy(parent) {
    for (let i = 0; i < parent.splitCount; i++) {
      const enemy = new Enemy(
        "corpse",
        parent.path.slice(parent.pathIndex),
        this,
      );
      enemy.char = "小";
      enemy.maxHp = parent.splitHp;
      enemy.hp = parent.splitHp;
      enemy.speed = 1.5;
      enemy.reward = Math.floor(parent.reward / 3);
      enemy.x = parent.x + (i === 0 ? -15 : 15);
      enemy.y = parent.y;
      this.enemies.push(enemy);
    }
    this.runtimeIndexes.rebuildEnemies();
  }

  // 在指定位置召唤敌人
  spawnEnemyAt(enemyType, pathIndex, x, y) {
    const paths = Array.isArray(this.path[0]) ? this.path : [this.path];
    const randomPath = paths[Math.floor(Math.random() * paths.length)];

    const enemy = new Enemy(enemyType, randomPath, this);
    enemy.pathIndex = Math.min(pathIndex, randomPath.length - 1);
    enemy.x = x + (Math.random() - 0.5) * 30;
    enemy.y = y + (Math.random() - 0.5) * 30;
    this.enemies.push(enemy);
    this.runtimeIndexes.rebuildEnemies();
    
    // 创建召唤特效
    if (this.particleSystem) {
      this.particleSystem.createExplosion(x, y, 8, '#9c27b0');
    }
  }

  triggerExplosion(x, y, damage, range) {
    const rangeSq = (range * CONFIG.CELL_SIZE) ** 2;
    for (const enemy of this.runtimeIndexes.aliveEnemies) {
      if (enemy.dead) continue;

      if (distanceSq(x, y, enemy.x, enemy.y) <= rangeSq) {
        enemy.takeDamage(damage);
      }
    }

    this.particleSystem.createExplosion(x, y, damage * 5, '#ff6644');
  }

  spawnEnemy(enemyType) {
    const paths = Array.isArray(this.path[0]) ? this.path : [this.path];
    const randomPath = paths[Math.floor(Math.random() * paths.length)];

    const enemy = new Enemy(enemyType, randomPath, this);
    this.enemies.push(enemy);
    this.runtimeIndexes.rebuildEnemies();
    this.updateUI();
  }

  updateAuras() {
    for (const tower of this.towers) {
      if (!tower.aura) continue;
      const auraEntries = [];
      if (tower.auraType && (tower.auraType === 'attackSpeed' || tower.auraType === 'range' || tower.auraType === 'reflect')) {
        auraEntries.push({ type: tower.auraType, value: tower.auraValue });
      }
      if (Array.isArray(tower.extraAuras) && tower.extraAuras.length > 0) {
        for (const extra of tower.extraAuras) {
          if (!extra?.type) continue;
          auraEntries.push({ type: extra.type, value: extra.value || 0 });
        }
      }
      if (auraEntries.length === 0) continue;

      const rangePx = tower.auraRange * CONFIG.CELL_SIZE;
      const rangeSq = rangePx * rangePx;
      for (const other of this.towers) {
        if (other === tower || other.isFusion) continue;
        if (distanceSq(tower.x, tower.y, other.x, other.y) > rangeSq) continue;

        for (const auraEntry of auraEntries) {
          if (auraEntry.type === 'attackSpeed') {
            other.auraBonuses.attackSpeed = Math.max(
              other.auraBonuses.attackSpeed || 0, auraEntry.value
            );
          } else if (auraEntry.type === 'range') {
            other.auraBonuses.range = Math.max(
              other.auraBonuses.range || 0, auraEntry.value
            );
          } else if (auraEntry.type === 'reflect') {
            let reflectValue = auraEntry.value;
            if (other.onPath && tower.mountainBonus) {
              reflectValue += tower.mountainBonus;
            }
            other.auraBonuses.reflect = Math.max(
              other.auraBonuses.reflect || 0, reflectValue
            );
          }
        }
      }
    }
  }

  updateGlobalSlow() {
    let maxSlow = 0;
    for (const tower of this.towers) {
      if (tower.type === 'time' && tower.globalSlow > maxSlow) {
        maxSlow = tower.globalSlow;
      }
    }
    for (const enemy of this.enemies) {
      if (maxSlow > 0 && !enemy.flying) {
        enemy._globalSlow = maxSlow;
      } else {
        enemy._globalSlow = 0;
      }
    }
  }

  updateSpecialTowers() {
  }

  checkWaveComplete() {
    if (this._waveCompleteChecking) return;
    this._waveCompleteChecking = true;

    this.runtimeIndexes.rebuildEnemies();
    const aliveEnemies = this.runtimeIndexes.aliveEnemies;

    if (aliveEnemies.length === 0 && this.spawnQueue.length === 0) {
      this.waveInProgress = false;

      for (const tower of this.towers) {
        if (tower.type === 'healer') {
          let heal = tower.healPerWave;
          if (this.coreHp / this.maxCoreHp < tower.emergencyThreshold) {
            heal += tower.emergencyBonus;
          }
          this.coreHp = Math.min(this.maxCoreHp, this.coreHp + heal);
        }
      }

      for (const tower of this.towers) {
        if (tower.onPath && tower.repairRatio > 0 && tower.hp < tower.maxHp) {
          tower.hp = Math.min(tower.maxHp, tower.hp + Math.floor(tower.maxHp * tower.repairRatio));
        }
        if (tower.type === 'trap') {
          tower.triggerCount = tower.maxTriggers;
        }
      }

      this.updateUI();

      if (this.wave >= this.maxWave) {
        this.gameOver(true);
      }
    }

    this._waveCompleteChecking = false;
  }

  gameOver(victory) {
    this.gameEnded = true;
    this.victory = victory;
    this.inputLocked = true;

    if (victory) {
      // 标记当前关卡为已完成
      this.markLevelCompleted(this.currentLevel);

      const reward = 100 + this.currentLevelData.difficulty * 10;
      this.gold += reward;

      const hpPercent = this.coreHp / this.maxCoreHp;
      let stars = 1;
      if (hpPercent >= 0.8) stars = 3;
      else if (hpPercent >= 0.5) stars = 2;

      // 判断是否有下一关
      const hasNextLevel = levelManager.hasNext(this.currentLevel);

      // 如果是从征服模式进入，显示返回关卡选择按钮
      const isConquestMode = this.ui.currentConquestThemeId !== null;

      let buttonText, onClick;
      if (isConquestMode) {
        buttonText = "关卡选择";
        onClick = () => this.returnToLevelSelect();
      } else if (hasNextLevel) {
        buttonText = "下一关";
        onClick = () => this.nextLevel();
      } else {
        buttonText = "菜单";
        onClick = () => this.returnToMenu();
      }

      this.ui.showModal(
        "胜利!",
        `关卡 ${this.currentLevel} 完成!\n星级: ${"★".repeat(stars)}${"☆".repeat(3 - stars)}\n奖励: ${reward}金`,
        buttonText,
        onClick
      );
    } else {
      // 失败时，如果是征服模式则返回关卡选择
      const isConquestMode = this.ui.currentConquestThemeId !== null;
      const buttonText = isConquestMode ? "关卡选择" : "菜单";
      const onClick = isConquestMode ? () => this.returnToLevelSelect() : () => this.returnToMenu();
      
      this.ui.showModal(
        "失败",
        `核心被摧毁...\n关卡 ${this.currentLevel}`,
        buttonText,
        onClick
      );
    }
  }

  nextLevel() {
    const nextId = levelManager.getNextId(this.currentLevel);
    if (nextId !== null) {
      this.loadLevel(nextId);
    } else {
      this.loadLevel(levelManager.getAll()[0]?.id || 1);
    }

    // 确保先停止可能存在的旧动画实例，防止重复启动
    if (this.inkTrailAnimation) {
      if (this.inkTrailAnimation.active) {
        this.inkTrailAnimation.stop();
      }
      this.inkTrailAnimation.play(this.currentLevelData);
    }

    this.gameStarted = true;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.start();
  }

  restartLevel() {
    this.loadLevel(this.currentLevel);

    // 确保先停止可能存在的旧动画实例，防止重复启动
    if (this.inkTrailAnimation) {
      if (this.inkTrailAnimation.active) {
        this.inkTrailAnimation.stop();
      }
      this.inkTrailAnimation.play(this.currentLevelData);
    }

    this.gameStarted = true;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.start();
  }

  /**
   * 返回关卡选择界面（征服模式）
   */
  returnToLevelSelect() {
    if (this.spawnTimerId) {
      clearTimeout(this.spawnTimerId);
      this.spawnTimerId = null;
    }

    this.stop();
    this.gameStarted = false;

    if (this.inkTrailAnimation) this.inkTrailAnimation.stop();

    document.getElementById("main-container").classList.add("hidden");
    document.getElementById("main-menu").classList.remove("hidden");

    if (this.menuInkBg) this.menuInkBg.start();

    this.towers = [];
    this.enemies = [];
    this.spawnQueue = [];
    this.runtimeIndexes.rebuildTowers();
    this.runtimeIndexes.rebuildEnemies();
    this.gameEnded = false;
    this.victory = false;
    this.waveInProgress = false;

    // 显示关卡选择界面
    if (this.ui.currentConquestThemeId) {
      // 征服模式：显示征服模式关卡选择
      this.ui.showConquestLevelSelect(this.ui.currentConquestThemeId);
    } else if (this.ui.currentThemeId) {
      // 普通模式：显示普通模式关卡选择
      this.ui.showLevelSelect(this.ui.currentThemeId);
    }
  }

  startGame(levelId) {
    document.getElementById("main-container").classList.remove("hidden");
    document.getElementById("main-menu").classList.add("hidden");

    if (this.menuInkBg) this.menuInkBg.stop();

    this.loadLevel(levelId);

    // 确保先停止可能存在的旧动画实例，防止重复启动
    if (this.inkTrailAnimation) {
      if (this.inkTrailAnimation.active) {
        this.inkTrailAnimation.stop();
      }
      this.inkTrailAnimation.play(this.currentLevelData);
    }

    this.gameStarted = true;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.start();
  }

  returnToMenu() {
    if (this.spawnTimerId) {
      clearTimeout(this.spawnTimerId);
      this.spawnTimerId = null;
    }

    // 先停止动画，再停止游戏循环，确保状态干净
    if (this.inkTrailAnimation && this.inkTrailAnimation.active) {
      this.inkTrailAnimation.stop();
    }

    this.stop();
    this.gameStarted = false;

    // 清理 UI 事件监听器
    if (this.ui && this.ui.destroy) {
      this.ui.destroy();
    }

    document.getElementById("main-container").classList.add("hidden");
    document.getElementById("main-menu").classList.remove("hidden");

    if (this.menuInkBg) this.menuInkBg.start();

    this.towers = [];
    this.enemies = [];
    this.spawnQueue = [];
    this.runtimeIndexes.rebuildTowers();
    this.runtimeIndexes.rebuildEnemies();
    this.gameEnded = false;
    this.victory = false;
    this.waveInProgress = false;
    this.inputLocked = false;

    // 清理粒子系统和子弹池
    if (this.particleSystem) {
      this.particleSystem.clear();
    }
    if (this.projectilePool) {
      this.projectilePool.clear();
    }
  }

  updateUI() {
    document.getElementById("gold").textContent = this.gold;
    document.getElementById("wave").textContent =
      `${this.wave}/${this.maxWave}`;
    this.runtimeIndexes.rebuildEnemies();
    const remainingEnemies = this.spawnQueue.length + this.runtimeIndexes.aliveEnemies.length;
    document.getElementById("enemies").textContent = remainingEnemies;
    document.getElementById("core-hp").textContent =
      `${this.coreHp}/${this.maxCoreHp}`;

    const waveBtn = document.getElementById("start-wave");
    waveBtn.disabled =
      this.waveInProgress || this.wave >= this.maxWave || this.gameEnded;
    waveBtn.textContent = this.wave >= this.maxWave ? "通关" : "开始波次";
  }

  update(now) {
    if (this.gameEnded) return;

    if (this.isPaused) return;

    if (this.paused) {
      this.lastTime = now;
      return;
    }

    // 计算 deltaTime（毫秒），限制最大值为 50ms 防止卡顿时游戏跳变
    const deltaTime = Math.min(now - this.lastTime, 50);
    this.lastTime = now;

    this.inkTrailAnimation.update();

    for (const tower of this.towers) {
      tower.update(now, deltaTime, this.runtimeIndexes.aliveEnemies);
      tower.updateProjectiles(deltaTime);
    }

    this.updateAuras();
    this.updateGlobalSlow();
    this.updateSpecialTowers();

    for (const enemy of this.enemies) {
      enemy.update(now, deltaTime);
    }

    this.enemies = this.enemies.filter((e) => !e.dead);
    this.runtimeIndexes.rebuildTowers();
    if (this.enemies.length !== this._lastEnemyCount) {
      this.runtimeIndexes.rebuildEnemies();
      this._lastEnemyCount = this.enemies.length;
    }

    if (this.waveInProgress) {
      this.checkWaveComplete();
    }

    this.particleSystem.update(deltaTime);
    this.debugStats.update(now);

    // 定期更新 UI（每 10 帧一次）
    this.uiUpdateCounter++;
    if (this.uiUpdateCounter >= this.uiUpdateInterval) {
      this.uiUpdateCounter = 0;
      this.updateUI();
    }
  }

  draw() {
    this.staticLayer.draw(this.ctx);
    this.drawPlacementPreview();

    const timestamp = performance.now();
    for (const tower of this.towers) {
      tower.draw(this.ctx, timestamp);
    }

    for (const enemy of this.enemies) {
      enemy.draw(this.ctx, this.inkRenderer);
    }

    this.particleSystem.draw(this.ctx);

    this.inkTrailAnimation.draw(this.ctx);

    this.ui.drawDragPreview(this.ctx);

    this.debugStats.draw(this.ctx);
  }

  drawGrid() {
    this.ctx.strokeStyle = CONFIG.COLORS.grid;
    this.ctx.lineWidth = 1;

    const gridHeight = CONFIG.GRID_ROWS * CONFIG.CELL_SIZE;

    for (let x = 0; x <= CONFIG.GRID_COLS; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * CONFIG.CELL_SIZE, 0);
      this.ctx.lineTo(x * CONFIG.CELL_SIZE, gridHeight);
      this.ctx.stroke();
    }

    for (let y = 0; y <= CONFIG.GRID_ROWS; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * CONFIG.CELL_SIZE);
      this.ctx.lineTo(this.canvas.width, y * CONFIG.CELL_SIZE);
      this.ctx.stroke();
    }
  }

  drawPath() {
    const paths = Array.isArray(this.path[0]) ? this.path : [this.path];

    for (const path of paths) {
      this.ctx.strokeStyle = CONFIG.COLORS.pathLine;
      this.ctx.lineWidth = CONFIG.CELL_SIZE - 4;
      this.ctx.lineCap = "round";
      this.ctx.lineJoin = "round";

      this.ctx.beginPath();
      for (let i = 0; i < path.length; i++) {
        const pos = gridToPixel(path[i].x, path[i].y);
        if (i === 0) {
          this.ctx.moveTo(pos.x, pos.y);
        } else {
          this.ctx.lineTo(pos.x, pos.y);
        }
      }
      this.ctx.stroke();

      this.ctx.fillStyle = "#666";
      this.ctx.font = "12px Microsoft YaHei";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";

      const start = gridToPixel(path[0].x, path[0].y);
      this.ctx.fillText("入口", start.x, start.y - 25);
    }
  }

  drawCore() {
    if (!this.core) return;

    const pos = gridToPixel(this.core.x, this.core.y);

    this.inkRenderer.drawInkWash(pos.x, pos.y + 15, 35, '#1a1a1a', 0.4);

    const size = 22;
    const height = 16;
    const isoAngle = 0.5;

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    this.ctx.beginPath();
    this.ctx.ellipse(
      pos.x,
      pos.y + height + 6,
      size * 0.8,
      size * 0.4,
      0,
      0,
      Math.PI * 2,
    );
    this.ctx.fill();

    this.ctx.fillStyle = CONFIG.COLORS.coreInner;
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x - size, pos.y + height);
    this.ctx.lineTo(pos.x, pos.y + height + height * isoAngle);
    this.ctx.lineTo(pos.x + size, pos.y + height);
    this.ctx.lineTo(pos.x, pos.y + height - height * isoAngle);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = "#8b3a2f";
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x + size, pos.y + height);
    this.ctx.lineTo(pos.x, pos.y + height + height * isoAngle);
    this.ctx.lineTo(pos.x, pos.y + height * isoAngle);
    this.ctx.lineTo(pos.x + size, pos.y);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = "#8b3a2f";
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x - size, pos.y + height);
    this.ctx.lineTo(pos.x, pos.y + height * isoAngle);
    this.ctx.lineTo(pos.x, pos.y - height * isoAngle);
    this.ctx.lineTo(pos.x - size, pos.y);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = CONFIG.COLORS.core;
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x - size, pos.y);
    this.ctx.lineTo(pos.x, pos.y - height * isoAngle);
    this.ctx.lineTo(pos.x + size, pos.y);
    this.ctx.lineTo(pos.x, pos.y + height * isoAngle);
    this.ctx.closePath();
    this.ctx.fill();

    this.inkRenderer.drawInkText("★", pos.x, pos.y - 2, 28, "#f5f5f5", true);

    this.ctx.font = '12px "ZCOOL XiaoWei", serif';
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "#c45c48";
    this.ctx.fillText("·核心·", pos.x, pos.y + height + 22);
  }

  drawPlacementPreview() {
    if (!this.ui.selectedTowerType || !this.ui.hoveredCell) return;

    const { gx, gy } = this.ui.hoveredCell;
    const canPlace = this.canPlaceTower(this.ui.selectedTowerType, gx, gy);

    this.ctx.fillStyle = canPlace
      ? "rgba(0, 255, 0, 0.3)"
      : "rgba(255, 0, 0, 0.3)";
    this.ctx.fillRect(
      gx * CONFIG.CELL_SIZE,
      gy * CONFIG.CELL_SIZE,
      CONFIG.CELL_SIZE,
      CONFIG.CELL_SIZE,
    );

    if (canPlace) {
      const config = CONFIG.TOWERS[this.ui.selectedTowerType];
      const pos = gridToPixel(gx, gy);

      this.ctx.beginPath();
      this.ctx.arc(
        pos.x,
        pos.y,
        config.range * CONFIG.CELL_SIZE,
        0,
        Math.PI * 2,
      );
      this.ctx.strokeStyle = "rgba(255, 255, 0, 0.5)";
      this.ctx.stroke();
    }
  }

  drawLevelInfo() {
    const level = this.currentLevelData;

    this.ctx.fillStyle = "#888";
    this.ctx.font = "14px Microsoft YaHei";
    this.ctx.textAlign = "left";
    this.ctx.fillText(
      `第${this.currentLevel}关: ${level ? level.name : ""}`,
      10,
      20,
    );
  }

  start() {
    this.lastTime = performance.now();

    const gameLoop = (timestamp) => {
      this.update(timestamp);
      this.draw();
      this.animationId = requestAnimationFrame(gameLoop);
    };

    this.animationId = requestAnimationFrame(gameLoop);
  }

  /**
   * 设置游戏暂停状态
   */
  setPaused(paused) {
    this.isPaused = paused;
    if (!paused) {
      this.lastTime = performance.now();
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

window.addEventListener("load", () => {
  window.gameInstance = new Game();
});
