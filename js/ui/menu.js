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
        el.classList.add('multi-character');
        charHtml = '<span>' + config.char.slice(0, 2) + '</span><span>' + config.char.slice(2) + '</span>';
      }

      el.innerHTML = '<span class="tower-char">' + charHtml + '</span><span class="tower-cost">' + config.cost + '</span>';

      this.addTrackedEventListener(el, 'pointerdown', (e) => {
        // 触摸要先判定是横滑底栏还是拖拽放置（见 input-card-gesture.js）
        if (e.pointerType === 'touch' && typeof this.beginCardGesture === 'function') {
          this.beginCardGesture(e, el, el.dataset.type);
        } else {
          this.beginPlacementDrag(e, el.dataset.type);
        }
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
    this.setMainMenuButtonsVisible(true);
    this.currentConquestThemeId = null;
  
};
/**
   * 隐藏所有菜单面板
   */
UI.prototype.hideAllMenuPanels = function() {
    [
      "theme-select-container", "level-list-container",
      "encyclopedia-container", "tower-encyclopedia-container", "enemy-encyclopedia-container",
      "conquest-theme-select-container", "conquest-level-select-container", "settings-container",
    ].forEach((id) => document.getElementById(id)?.classList.add("hidden"));
    this.setMainMenuButtonsVisible(true);

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
/**
 * 同步首页入口按钮和区域1标题的显示状态。
 * @param {boolean} visible - 是否显示主菜单首页入口
 */
UI.prototype.setMainMenuButtonsVisible = function(visible) {
    const menuButtons = document.querySelector(".menu-buttons");
    const title = document.getElementById("main-menu-title");
    const seal = document.querySelector(".menu-seal");
    if (menuButtons) menuButtons.style.display = visible ? "flex" : "none";
    if (title) title.classList.toggle("hidden", !visible);
    if (seal) seal.classList.toggle("hidden", !visible);
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
    const customContainer = document.getElementById("custom-container");

    this.setMainMenuButtonsVisible(false);
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
// 择卷、长卷选关见 js/ui/level-scroll.js
