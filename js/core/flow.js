// Game：胜负、关卡和场景流程
Game.prototype.gameOver = function(victory) {
    this.gameEnded = true;
    this.victory = victory;
    this.battleActive = false;
    this.inputLocked = true;

    if (victory) {
      // 标记当前关卡为已完成
      this.markLevelCompleted(this.currentLevel);

      const reward = 100 + this.currentLevelData.difficulty * 10;
      this.ink += reward;

      const hpPercent = this.coreHp / this.maxCoreHp;
      let stars = 1;
      if (hpPercent >= 0.8) stars = 3;
      else if (hpPercent >= 0.5) stars = 2;

      // 按钮组（P5）：最右为朱红主按钮
      const actions = [{ label: "重来", onClick: () => this.restartLevel() }];
      if (levelManager.hasNext(this.currentLevel)) {
        actions.push({ label: "选关", onClick: () => this.returnToLevelSelect() });
        actions.push({ label: "下一关", primary: true, onClick: () => this.nextLevel() });
      } else {
        actions.push({ label: "主菜单", onClick: () => this.returnToMenu() });
        actions.push({ label: "选关", primary: true, onClick: () => this.returnToLevelSelect() });
      }

      InkModal.show({
        scene: "victory",
        title: "胜",
        lines: [`守境已成 · 第 ${this.currentLevel} 境`, `赏墨 ${reward}`].concat(this.bossKillLine()),
        stars,
        actions,
      });
    } else {
      InkModal.show({
        scene: "defeat",
        title: "破",
        lines: [`${this.failReason === 'boss' ? '首领破阵' : '守印已裂'} · 第 ${this.currentLevel} 境`],
        actions: [
          { label: "主菜单", onClick: () => this.returnToMenu() },
          { label: "选关", onClick: () => this.returnToLevelSelect() },
          { label: "重来", primary: true, onClick: () => this.restartLevel() },
        ],
      });
    }
  
};
// 关底胜利结算多一行「斩首用时」（首领出场到被斩的时间）
Game.prototype.bossKillLine = function() {
    if (this.bossSlainAt == null || this.bossEntryAt == null) return [];
    return [`斩首用时 ${BattleDirector.formatHold(this.bossSlainAt - this.bossEntryAt)}`];
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
      if (!InkUI.motionReduced()) this.inkTrailAnimation.play(this.currentLevelData);
    }

    this.gameStarted = true;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.start();
    this.promptDensity();
  
};
Game.prototype.restartLevel = function() {
    this.loadLevel(this.currentLevel);

    // 确保先停止可能存在的旧动画实例，防止重复启动
    if (this.inkTrailAnimation) {
      if (this.inkTrailAnimation.active) {
        this.inkTrailAnimation.stop();
      }
      if (!InkUI.motionReduced()) this.inkTrailAnimation.play(this.currentLevelData);
    }

    this.gameStarted = true;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.start();
    this.promptDensity();
  
};
/**
   * 返回关卡选择界面（征服模式）
   */
Game.prototype.returnToLevelSelect = function() {
    DensityPicker.close();

    this.stop();
    this.gameStarted = false;

    if (this.inkTrailAnimation) this.inkTrailAnimation.stop();

    document.getElementById("main-container").classList.add("hidden");
    document.getElementById("main-menu").classList.remove("hidden");

    if (this.menuInkBg) this.menuInkBg.start();

    this.towers = [];
    this.enemies = [];
    this.runtimeIndexes.rebuildTowers();
    this.runtimeIndexes.rebuildEnemies();
    this.gameEnded = false;
    this.victory = false;
    this.battleActive = false;

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
    // 与征服容器互斥：两者同处一个 flex 行时缩放基准会按叠加宽度计算
    const conquestContainer = document.getElementById("conquest-container");
    if (conquestContainer) conquestContainer.classList.add("hidden");
    // 上一次进入征服模式时塔防容器被隐藏过，这里必须解除
    const gameContainer = document.getElementById("game-container");
    if (gameContainer) gameContainer.classList.remove("hidden");

    if (this.menuInkBg) this.menuInkBg.stop();

    this.loadLevel(levelId);

    // 确保先停止可能存在的旧动画实例，防止重复启动
    if (this.inkTrailAnimation) {
      if (this.inkTrailAnimation.active) {
        this.inkTrailAnimation.stop();
      }
      if (!InkUI.motionReduced()) this.inkTrailAnimation.play(this.currentLevelData);
    }

    this.gameStarted = true;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.start();
    this.promptDensity();

    // 内容尺寸在这里才确定（塔卡是 loadLevel 里重建的），必须重新计算缩放。
    // 旧实现只在 window.load 时算一次，进入战斗后缩放与实际内容不符。
    if (typeof window.applyGameScale === "function") window.applyGameScale();
  
};
Game.prototype.returnToMenu = function() {
    DensityPicker.close();

    // 先停止动画，再停止游戏循环，确保状态干净
    if (this.inkTrailAnimation && this.inkTrailAnimation.active) {
      this.inkTrailAnimation.stop();
    }

    this.stop();
    this.gameStarted = false;

    // 清理本局的 UI 事件监听器。destroy 会连菜单按钮的监听一并移除，
    // 必须立即重新绑定，否则回到菜单后所有按钮失灵（P3 修复）。
    if (this.ui && this.ui.destroy) {
      this.ui.destroy();
      this.ui.setupMenuEventListeners();
      this.ui.setupEventListeners();
      UI._eventsBound = true;
    }

    document.getElementById("main-container").classList.add("hidden");
    document.getElementById("main-menu").classList.remove("hidden");
    // 「返回主菜单」回到首页，而不是停留在开局前的选关页
    if (this.ui && this.ui.returnToMainMenu) this.ui.returnToMainMenu();

    if (this.menuInkBg) this.menuInkBg.start();

    this.towers = [];
    this.enemies = [];
    this.runtimeIndexes.rebuildTowers();
    this.runtimeIndexes.rebuildEnemies();
    this.gameEnded = false;
    this.victory = false;
    this.battleActive = false;
    this.inputLocked = false;
    this.menuPaused = false;

    // 清理粒子系统和子弹池
    if (this.particleSystem) {
      this.particleSystem.clear();
    }
  
};
