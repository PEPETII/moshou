// ConquestGame：征服关卡和实体流程
ConquestGame.prototype.showFusionEncyclopedia = function() {
    if (window.gameInstance && window.gameInstance.ui) {
      window.gameInstance.ui.showGameFusionEncyclopedia();
    }
  
};
ConquestGame.prototype.returnToMenu = function() {
    // 清理 spawn 定时器
    if (this.spawnTimerId) {
      clearTimeout(this.spawnTimerId);
      this.spawnTimerId = null;
    }

    // 调用 destroy 清理所有事件监听器和资源
    this.destroy();

    document.getElementById("conquest-container").classList.add("hidden");
    document.getElementById("main-menu").classList.remove("hidden");

    if (window.gameInstance && window.gameInstance.menuInkBg) {
      window.gameInstance.menuInkBg.start();
    }

    this.towers = [];
    this.enemies = [];
    this.spawnQueue = [];
    this.gameEnded = false;
    this.victory = false;
    this.waveInProgress = false;
    this._autoWaveStarted = false;
  
};
// 根据关卡ID启动对应关卡
ConquestGame.prototype.startLevel = function(levelId) {
    // 清理旧的 spawn 定时器
    if (this.spawnTimerId) {
      clearTimeout(this.spawnTimerId);
      this.spawnTimerId = null;
    }

    // 获取关卡配置
    let levelConfig = null;
    if (typeof conquestProgress !== "undefined" && conquestProgress.getLevelConfig) {
      levelConfig = conquestProgress.getLevelConfig(levelId);
    }

    if (!levelConfig) {
      console.error(`关卡 ${levelId} 配置不存在`);
      return;
    }

    // 停止菜单背景动画
    if (window.gameInstance && window.gameInstance.menuInkBg) {
      window.gameInstance.menuInkBg.stop();
    }

    // 重置游戏状态
    this.stop();
    this.towers = [];
    this.enemies = [];
    this.spawnQueue = [];
    this.gameEnded = false;
    this.victory = false;
    this.waveInProgress = false;
    this._autoWaveStarted = false;

    // 更新关卡配置
    this.levelConfig = levelConfig;
    this.currentLevelId = levelId;

    // 使用新配置初始化
    this.ink = this.levelConfig.startInk || 300;
    this.summonCost = this.levelConfig.summonCost || 80;
    this.maxWave = this.levelConfig.maxWave || 3;
    this.maxAliveEnemies = this.levelConfig.maxAliveEnemies || 50;
    this.coreHp = this.levelConfig.coreHp || 20;
    this.wave = 0;
    this.nextPlacementIndex = 0;

    // 重新初始化放置网格
    this.placementGrid = this.buildPlacementGrid();
    this._placementGridSet = new Set(
      this.placementGrid.map((c) => `${c.x},${c.y}`)
    );

    // 重新设置UI事件监听（如果之前被destroy清理过）
    if (!this._uiEventsActive) {
      this.setupUI();
      this.setupKeyboardShortcuts();
    }

    // 显示征服模式容器
    // 注意：#conquest-container 位于 #main-container 之内，
    // 只解除自身 hidden、父级仍 hidden 会导致整屏空白（实测已复现）。
    document.getElementById("main-container").classList.remove("hidden");
    document.getElementById("conquest-container").classList.remove("hidden");
    // 与塔防容器互斥：两者同处一个 flex 行时内容宽会叠加到 2000px+，
    // 缩放基准随之崩塌，手机上战场会被挤出屏幕。
    const tdContainer = document.getElementById("game-container");
    if (tdContainer) tdContainer.classList.add("hidden");

    // 更新UI并启动游戏
    this.updateUI();
    this.start();

    // 征服模式内容宽 1072px、塔防模式 960px，尺寸不同，必须重算缩放
    if (typeof window.applyGameScale === "function") window.applyGameScale();
  
};
// 获取下一关卡ID
ConquestGame.prototype.getNextLevelId = function() {
    // 优先使用 conquestProgress 的方法
    if (typeof conquestProgress !== "undefined" && conquestProgress.getNextLevelId) {
      return conquestProgress.getNextLevelId(this.currentLevelId);
    }

    // 默认逻辑：正确解析 "主题-关卡" 格式
    const [theme, level] = String(this.currentLevelId).split('-').map(Number);

    // 假设每个主题5关
    const levelsPerTheme = 5;
    const totalThemes = 5;

    if (level < levelsPerTheme) {
      // 同一主题下一关
      return `${theme}-${level + 1}`;
    } else if (theme < totalThemes) {
      // 下一个主题第一关
      return `${theme + 1}-1`;
    }

    // 已经是最后一关
    return null;
  
};
// 返回关卡选择界面
ConquestGame.prototype.returnToLevelSelect = function() {
    // 清理 spawn 定时器
    if (this.spawnTimerId) {
      clearTimeout(this.spawnTimerId);
      this.spawnTimerId = null;
    }

    // 调用 destroy 清理所有事件监听器和资源
    this.destroy();

    // 隐藏征服模式容器
    document.getElementById("conquest-container").classList.add("hidden");

    // 显示主菜单容器（征服模式关卡选择界面嵌套在 main-menu 内）
    document.getElementById("main-menu").classList.remove("hidden");

    // 显示征服模式关卡选择界面（如果存在）
    const conquestLevelSelect = document.getElementById("conquest-level-select-container");
    if (conquestLevelSelect) {
      conquestLevelSelect.classList.remove("hidden");
      // 刷新关卡选择UI以显示最新进度
      if (window.gameInstance && window.gameInstance.ui) {
        const themeId = this.currentLevelId ? parseInt(this.currentLevelId.split('-')[0]) : 1;
        window.gameInstance.ui.showConquestLevelSelect(themeId);
      }
    }

    // 恢复主菜单背景
    if (window.gameInstance && window.gameInstance.menuInkBg) {
      window.gameInstance.menuInkBg.start();
    }

    // 重置游戏状态
    this.towers = [];
    this.enemies = [];
    this.spawnQueue = [];
    this.gameEnded = false;
    this.victory = false;
    this.waveInProgress = false;
    this._autoWaveStarted = false;
  
};
ConquestGame.prototype.startGame = function() {
    document.getElementById("main-container").classList.remove("hidden");
    document.getElementById("conquest-container").classList.remove("hidden");
    document.getElementById("main-menu").classList.add("hidden");
    const tdContainer = document.getElementById("game-container");
    if (tdContainer) tdContainer.classList.add("hidden");

    if (window.gameInstance && window.gameInstance.menuInkBg) {
      window.gameInstance.menuInkBg.stop();
    }

    this.ink = 300;
    this.towers = [];
    this.enemies = [];
    this.wave = 0;
    this.waveInProgress = false;
    this.spawnQueue = [];
    this.gameEnded = false;
    this.victory = false;
    this.nextPlacementIndex = 0;

    if (!this._uiEventsActive) {
      this.setupUI();
      this.setupKeyboardShortcuts();
    }

    this.start();

    if (typeof window.applyGameScale === "function") window.applyGameScale();
  
};
ConquestGame.prototype.getTowerAt = function(gx, gy) {
    return this._towerIndex.get(`${gx},${gy}`);
  
};
ConquestGame.prototype._updateTowerIndex = function() {
    this._towerIndex.clear();
    for (const tower of this.towers) {
      const key = `${tower.gx},${tower.gy}`;
      this._towerIndex.set(key, tower);
    }
  
};
ConquestGame.prototype.removeTower = function(tower) {
    const index = this.towers.indexOf(tower);
    if (index > -1) {
      this.towers.splice(index, 1);
      this._towerIndex.delete(`${tower.gx},${tower.gy}`);
    }
  
};
ConquestGame.prototype.sellTower = function(tower) {
    this.ink += tower.getSellValue();
    this.removeTower(tower);
    this.updateUI();
  
};
ConquestGame.prototype.triggerExplosion = function(x, y, damage, range) {
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const dx = enemy.x - x;
      const dy = enemy.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= range * CONFIG.CELL_SIZE) {
        enemy.takeDamage(damage);
      }
    }
    this.particleSystem.createExplosion(x, y, damage * 5, "#ff6644");
  
};
ConquestGame.prototype.spawnSplitEnemy = function(parent) {
    for (let i = 0; i < parent.splitCount; i++) {
      const enemy = new ConquestEnemy("corpse", this.path, this);
      enemy.char = "小";
      enemy.maxHp = parent.splitHp;
      enemy.hp = parent.splitHp;
      enemy.reward = Math.floor(parent.reward / 3);
      enemy.x = parent.x + (i === 0 ? -15 : 15);
      enemy.y = parent.y;
      this.enemies.push(enemy);
    }
  
};
