// UI：菜单、主题、关卡和自定义入口
UI.prototype.createTowerSelects = function() {
    const bottomBar = document.getElementById('bottom-bar');
    if (!bottomBar) return;
    bottomBar.innerHTML = '';

    const unlockedTypes = this.game.getUnlockedTowers();

    for (const type of unlockedTypes) {
      const config = CONFIG.TOWERS[type];
      if (!config) continue;

      const el = document.createElement('div');
      el.className = 'tower-select';
      el.dataset.type = type;

      if (this.game.ink < config.cost) {
        el.classList.add('locked');
      }

      let charHtml = config.char;
      if (config.char && config.char.length >= 3) {
        charHtml = '<span>' + config.char.slice(0, 2) + '</span><span>' + config.char.slice(2) + '</span>';
      }

      el.innerHTML = '<span class="tower-char">' + charHtml + '</span><span class="tower-cost">' + config.cost + '</span>';

      this.addTrackedEventListener(el, 'pointerdown', (e) => {
        this.beginPlacementDrag(e, el.dataset.type);
      });

      bottomBar.appendChild(el);
    }

    this.refreshTowerSelectAffordability();
  
};
/**
 * 把"墨水不足"状态同步到塔卡（由 Game.updateUI 驱动，保证与墨水实时一致）
 */
UI.prototype.refreshTowerSelectAffordability = function() {
    const bottomBar = document.getElementById('bottom-bar');
    if (!bottomBar || !this.game) return;

    for (const el of bottomBar.querySelectorAll('.tower-select')) {
      const config = CONFIG.TOWERS[el.dataset.type];
      if (!config) continue;

      const locked = this.game.ink < config.cost;
      if (el.classList.contains('locked') !== locked) {
        el.classList.toggle('locked', locked);
      }
      el.setAttribute('aria-disabled', locked ? 'true' : 'false');
    }
};
UI.prototype.setupMenuEventListeners = function() {
    // 开始游戏按钮 - 默认进入第一关（故事模式）
    const btnStart = document.getElementById("btn-start");
    if (btnStart) {
      this.addTrackedEventListener(btnStart, "click", () => {
        this.game.startGame("1-1");
      });
    }

    // 图鉴按钮
    const btnEncyclopedia = document.getElementById("btn-encyclopedia");
    if (btnEncyclopedia) {
      this.addTrackedEventListener(btnEncyclopedia, "click", () => {
        this.showEncyclopedia();
      });
    }

    // 塔防模式按钮 - 显示主题选择界面
    const btnLevels = document.getElementById("btn-levels");
    if (btnLevels) {
      this.addTrackedEventListener(btnLevels, "click", () => {
        this.showThemeSelect();
      });
    }

    // 征服模式按钮 - 显示征服模式主题选择界面
    const btnConquest = document.getElementById("btn-conquest");
    if (btnConquest) {
      this.addTrackedEventListener(btnConquest, "click", () => {
        this.showConquestThemeSelect();
      });
    }

    // 自定义按钮 - 显示自定义主界面
    const btnCustom = document.getElementById("btn-custom");
    if (btnCustom) {
      this.addTrackedEventListener(btnCustom, "click", () => {
        this.showCustomMenu();
      });
    }

    // 征服模式返回主菜单按钮
    const backToMenuFromConquestTheme = document.getElementById("back-to-menu-from-conquest-theme");
    if (backToMenuFromConquestTheme) {
      this.addTrackedEventListener(backToMenuFromConquestTheme, "click", () => {
        this.returnToMainMenu();
      });
    }

    // 征服模式返回主题列表按钮
    const backToConquestThemes = document.getElementById("back-to-conquest-themes");
    if (backToConquestThemes) {
      this.addTrackedEventListener(backToConquestThemes, "click", () => {
        this.showConquestThemeSelect();
      });
    }

    // 返回主菜单按钮（菜单内）
    const backToMenu = document.getElementById("back-to-menu");
    if (backToMenu) {
      this.addTrackedEventListener(backToMenu, "click", () => {
        this.returnToMainMenu();
      });
    }

    // 返回主题按钮
    const backToThemes = document.getElementById("back-to-themes");
    if (backToThemes) {
      this.addTrackedEventListener(backToThemes, "click", () => {
        this.showThemeSelect();
      });
    }

    // 返回主菜单按钮（游戏中顶部栏）
    const backToMenuBtn = document.getElementById("back-to-menu-btn");
    if (backToMenuBtn) {
      this.addTrackedEventListener(backToMenuBtn, "click", () => {
        this.game.returnToLevelSelect();
      });
    }

    // 游戏内融合图鉴按钮
    const fusionEncyclopediaBtn = document.getElementById("fusion-encyclopedia-btn");
    if (fusionEncyclopediaBtn) {
      this.addTrackedEventListener(fusionEncyclopediaBtn, "click", () => {
        this.showGameFusionEncyclopedia();
      });
    }

    // 关闭游戏内融合图鉴模态窗口
    const closeGameFusionModal = document.getElementById("close-game-fusion-modal");
    if (closeGameFusionModal) {
      this.addTrackedEventListener(closeGameFusionModal, "click", () => {
        this.hideGameFusionEncyclopedia();
      });
    }

    // 关闭游戏内融合详情面板
    const closeGameFusionDetail = document.getElementById("close-game-fusion-detail");
    if (closeGameFusionDetail) {
      this.addTrackedEventListener(closeGameFusionDetail, "click", () => {
        this.hideGameFusionDetail();
      });
    }

    // === 图鉴系统事件监听 ===
    this.setupEncyclopediaEventListeners();

    // === 自定义功能事件监听 ===
    this.setupCustomEventListeners();
  
};
// ==================== 征服模式 UI ====================

  /**
   * 返回主菜单
   * 隐藏所有征服模式面板，显示主菜单按钮
   */
UI.prototype.returnToMainMenu = function() {
    // 清理长按定时器，防止切换界面后定时器回调仍然执行
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.hideAllMenuPanels();
    this.currentConquestThemeId = null;
  
};
/**
   * 隐藏所有菜单面板
   */
UI.prototype.hideAllMenuPanels = function() {
    const themeSelect = document.getElementById("theme-select-container");
    const levelList = document.getElementById("level-list-container");
    const backBtn = document.getElementById("back-to-menu");
    const backToThemes = document.getElementById("back-to-themes");
    const menuButtons = document.querySelector(".menu-buttons");
    const encyclopediaContainer = document.getElementById("encyclopedia-container");
    const towerEncyclopediaContainer = document.getElementById("tower-encyclopedia-container");
    const enemyEncyclopediaContainer = document.getElementById("enemy-encyclopedia-container");
    const fusionEncyclopediaContainer = document.getElementById("fusion-encyclopedia-container");
    const conquestThemeSelect = document.getElementById("conquest-theme-select-container");
    const conquestLevelSelect = document.getElementById("conquest-level-select-container");

    if (themeSelect) themeSelect.classList.add("hidden");
    if (levelList) levelList.classList.add("hidden");
    if (backBtn) backBtn.classList.add("hidden");
    if (backToThemes) backToThemes.classList.add("hidden");
    if (menuButtons) menuButtons.style.display = "flex";
    if (encyclopediaContainer) encyclopediaContainer.classList.add("hidden");
    if (towerEncyclopediaContainer) towerEncyclopediaContainer.classList.add("hidden");
    if (enemyEncyclopediaContainer) enemyEncyclopediaContainer.classList.add("hidden");
    if (fusionEncyclopediaContainer) fusionEncyclopediaContainer.classList.add("hidden");
    if (conquestThemeSelect) conquestThemeSelect.classList.add("hidden");
    if (conquestLevelSelect) conquestLevelSelect.classList.add("hidden");

    // 隐藏自定义相关容器
    const customContainer = document.getElementById("custom-container");
    const customTowersContainer = document.getElementById("custom-towers-container");
    const customLevelsContainer = document.getElementById("custom-levels-container");
    const customExportContainer = document.getElementById("custom-export-container");

    if (customContainer) customContainer.classList.add("hidden");
    if (customTowersContainer) customTowersContainer.classList.add("hidden");
    if (customLevelsContainer) customLevelsContainer.classList.add("hidden");
    if (customExportContainer) customExportContainer.classList.add("hidden");
  
};
// ==================== 自定义功能方法 ====================

  /**
   * 设置自定义功能事件监听
   */
UI.prototype.setupCustomEventListeners = function() {
    // 返回主菜单按钮（从自定义主界面）
    const backToMenuFromCustom = document.getElementById("back-to-menu-from-custom");
    if (backToMenuFromCustom) {
      this.addTrackedEventListener(backToMenuFromCustom, "click", () => {
        this.returnToMainMenu();
      });
    }

    // 自定义炮塔卡片
    const btnCustomTowers = document.getElementById("btn-custom-towers");
    if (btnCustomTowers) {
      this.addTrackedEventListener(btnCustomTowers, "click", () => {
        this.showCustomTowers();
      });
    }

    // 自定义关卡卡片
    const btnCustomLevels = document.getElementById("btn-custom-levels");
    if (btnCustomLevels) {
      this.addTrackedEventListener(btnCustomLevels, "click", () => {
        this.showCustomLevels();
      });
    }

    // 导出/导入卡片
    const btnCustomExport = document.getElementById("btn-custom-export");
    if (btnCustomExport) {
      this.addTrackedEventListener(btnCustomExport, "click", () => {
        this.showCustomExport();
      });
    }

    // 返回自定义主界面（从子界面）
    const backToCustomFromTowers = document.getElementById("back-to-custom-from-towers");
    if (backToCustomFromTowers) {
      this.addTrackedEventListener(backToCustomFromTowers, "click", () => {
        this.hideCustomTowers();
        this.showCustomMenu();
      });
    }

    const backToCustomFromLevels = document.getElementById("back-to-custom-from-levels");
    if (backToCustomFromLevels) {
      this.addTrackedEventListener(backToCustomFromLevels, "click", () => {
        this.hideCustomLevels();
        this.showCustomMenu();
      });
    }

    const backToCustomFromExport = document.getElementById("back-to-custom-from-export");
    if (backToCustomFromExport) {
      this.addTrackedEventListener(backToCustomFromExport, "click", () => {
        this.hideCustomExport();
        this.showCustomMenu();
      });
    }
  
};
/**
   * 显示自定义主界面
   */
UI.prototype.showCustomMenu = function() {
    const menuButtons = document.querySelector(".menu-buttons");
    const customContainer = document.getElementById("custom-container");

    if (menuButtons) menuButtons.style.display = "none";
    if (customContainer) customContainer.classList.remove("hidden");
  
};
/**
   * 隐藏自定义主界面
   */
UI.prototype.hideCustomMenu = function() {
    const customContainer = document.getElementById("custom-container");
    if (customContainer) customContainer.classList.add("hidden");
  
};
/**
   * 显示自定义炮塔界面（占位）
   */
UI.prototype.showCustomTowers = function() {
    this.hideCustomMenu();
    const container = document.getElementById("custom-towers-container");
    if (container) container.classList.remove("hidden");
  
};
/**
   * 隐藏自定义炮塔界面
   */
UI.prototype.hideCustomTowers = function() {
    const container = document.getElementById("custom-towers-container");
    if (container) container.classList.add("hidden");
  
};
/**
   * 显示自定义关卡界面（占位）
   */
UI.prototype.showCustomLevels = function() {
    this.hideCustomMenu();
    const container = document.getElementById("custom-levels-container");
    if (container) container.classList.remove("hidden");
  
};
/**
   * 隐藏自定义关卡界面
   */
UI.prototype.hideCustomLevels = function() {
    const container = document.getElementById("custom-levels-container");
    if (container) container.classList.add("hidden");
  
};
/**
   * 显示导出/导入界面（占位）
   */
UI.prototype.showCustomExport = function() {
    this.hideCustomMenu();
    const container = document.getElementById("custom-export-container");
    if (container) container.classList.remove("hidden");
  
};
/**
   * 隐藏导出/导入界面
   */
UI.prototype.hideCustomExport = function() {
    const container = document.getElementById("custom-export-container");
    if (container) container.classList.add("hidden");
  
};
/**
   * 渲染主题选择界面
   * 遍历 CONQUEST_THEMES 创建主题卡片，显示解锁状态和进度
   */
UI.prototype.renderThemeSelect = function() {
    const container = document.getElementById("theme-select-container");
    if (!container) return;

    container.innerHTML = "";

    const themes = levelManager.getThemes();
    const completedLevels = this.game && this.game.completedLevels ? this.game.completedLevels : [];

    for (const theme of themes) {
      const card = document.createElement("div");
      card.className = "theme-card";
      card.style.setProperty('--theme-color', theme.color);

      // 检查主题解锁状态
      const isUnlocked = this.isThemeUnlocked(theme.id, completedLevels);
      const progress = this.getThemeProgress(theme.id, completedLevels);

      // 根据解锁状态设置样式
      if (!isUnlocked) {
        card.classList.add("locked");
      }

      // 构建进度显示
      let progressHtml = `<div class="theme-progress">进度: ${progress.completed}/${progress.total}</div>`;
      if (!isUnlocked && theme.unlockRequirement) {
        const req = theme.unlockRequirement;
        progressHtml = `<div class="theme-progress locked">需完成主题${req.theme}的第${req.level}关</div>`;
      }

      card.innerHTML = `
        <span class="theme-icon">${theme.icon}</span>
        <div class="theme-name">${theme.name}</div>
        <div class="theme-desc">${theme.desc}</div>
        ${progressHtml}
      `;

      // 绑定点击事件：只有解锁的主题才能点击
      if (isUnlocked) {
        const cardClickHandler = () => {
          this.showLevelSelect(theme.id);
        };
        this.addTrackedEventListener(card, "click", cardClickHandler);
      }

      container.appendChild(card);
    }
  
};
/**
   * 显示主题选择界面
   */
UI.prototype.showThemeSelect = function() {
    const themeSelect = document.getElementById("theme-select-container");
    const levelList = document.getElementById("level-list-container");
    const backBtn = document.getElementById("back-to-menu");
    const backToThemes = document.getElementById("back-to-themes");
    const menuButtons = document.querySelector(".menu-buttons");

    // 隐藏其他面板
    if (levelList) levelList.classList.add("hidden");
    if (backToThemes) backToThemes.classList.add("hidden");
    if (menuButtons) menuButtons.style.display = "none";

    // 显示主题选择
    if (themeSelect) {
      themeSelect.classList.remove("hidden");
      this.renderThemeSelect();
    }

    // 显示返回主菜单按钮
    if (backBtn) {
      backBtn.classList.remove("hidden");
      backBtn.textContent = "主菜单";
    }

    // 重置当前主题
    this.currentThemeId = null;
  
};
/**
   * 显示关卡选择界面
   * @param {number} themeId - 主题ID
   */
UI.prototype.showLevelSelect = function(themeId) {
    const themeSelect = document.getElementById("theme-select-container");
    const levelList = document.getElementById("level-list-container");
    const backBtn = document.getElementById("back-to-menu");
    const backToThemes = document.getElementById("back-to-themes");

    // 隐藏主题选择
    if (themeSelect) themeSelect.classList.add("hidden");

    // 隐藏征服模式容器
    document.getElementById("conquest-theme-select-container")?.classList.add("hidden");
    document.getElementById("conquest-level-select-container")?.classList.add("hidden");

    // 显示关卡选择
    if (levelList) {
      levelList.classList.remove("hidden");
      this.renderLevelSelect(themeId);
    }

    // 更新按钮显示
    if (backBtn) backBtn.classList.add("hidden");
    if (backToThemes) {
      backToThemes.classList.remove("hidden");
      backToThemes.textContent = "主题选择";
    }
  
};
/**
   * 检查主题是否已解锁
   * @param {number} themeId - 主题ID
   * @param {string[]} completedLevels - 已完成的关卡列表
   * @returns {boolean}
   */
UI.prototype.isThemeUnlocked = function(themeId, completedLevels) {
    // 所有主题默认解锁
    return true;
  
};
/**
   * 获取主题进度
   * @param {number} themeId - 主题ID
   * @param {string[]} completedLevels - 已完成的关卡列表
   * @returns {Object} { completed, total }
   */
UI.prototype.getThemeProgress = function(themeId, completedLevels) {
    const levels = levelManager.getLevelsByTheme(themeId);
    const completed = levels.filter(l => completedLevels.includes(l.id)).length;
    return { completed, total: levels.length };
  
};
// ==================== 兼容旧方法 ====================

  /**
   * 填充主题选择界面（兼容旧方法）
   */
UI.prototype.populateThemeSelect = function() {
    this.renderThemeSelect();
  
};
