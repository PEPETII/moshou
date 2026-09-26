// Game：胜负、关卡和场景流程
Game.prototype.gameOver = function(victory) {
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
  
};
Game.prototype.nextLevel = function() {
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
  
};
Game.prototype.restartLevel = function() {
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
  
};
/**
   * 返回关卡选择界面（征服模式）
   */
Game.prototype.returnToLevelSelect = function() {
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
  
};
Game.prototype.startGame = function(levelId) {
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

    // 内容尺寸在这里才确定（塔卡是 loadLevel 里重建的），必须重新计算缩放。
    // 旧实现只在 window.load 时算一次，进入战斗后缩放与实际内容不符。
    if (typeof window.applyGameScale === "function") window.applyGameScale();
  
};
Game.prototype.returnToMenu = function() {
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
  
};
