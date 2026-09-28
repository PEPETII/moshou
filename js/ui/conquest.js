// UI：征服模式 UI
// ==================== 征服模式UI方法 ====================

  /**
   * 显示征服模式主题选择界面
   */
UI.prototype.showConquestThemeSelect = function() {
    const conquestThemeSelect = document.getElementById("conquest-theme-select-container");
    const menuButtons = document.querySelector(".menu-buttons");
    const backBtn = document.getElementById("back-to-menu");

    // 隐藏其他面板
    if (menuButtons) menuButtons.style.display = "none";

    // 隐藏其他容器
    const containers = [
      "theme-select-container",
      "level-list-container",
      "encyclopedia-container",
      "tower-encyclopedia-container",
      "enemy-encyclopedia-container",
      "fusion-encyclopedia-container",
      "conquest-level-select-container"
    ];
    containers.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });

    // 显示征服模式主题选择
    if (conquestThemeSelect) {
      conquestThemeSelect.classList.remove("hidden");
      this.renderConquestThemeSelect();
    }

    // 征服模式主题选择容器内部已有返回按钮，不需要显示通用的返回按钮
    if (backBtn) {
      backBtn.classList.add("hidden");
    }

    // 重置当前主题
    this.currentConquestThemeId = null;
  
};
/**
   * 渲染征服模式主题选择界面
   */
UI.prototype.renderConquestThemeSelect = function() {
    const grid = document.querySelector("#conquest-theme-select-container .conquest-theme-grid");
    if (!grid) return;

    // 获取进度
    const progress = conquestProgress ? conquestProgress.getProgress() : { completedLevels: [], unlockedThemes: [1] };
    const completedLevels = progress.completedLevels || [];

    // 清空现有内容
    grid.innerHTML = "";

    // 渲染每个主题（所有主题默认解锁）
    CONQUEST_THEMES.forEach(theme => {
      const themeProgress = this.getConquestThemeProgress(theme.id, completedLevels);

      const card = document.createElement("div");
      card.className = "conquest-theme-card";
      card.dataset.theme = theme.id;

      card.innerHTML = `
        <span class="theme-icon">${theme.icon}</span>
        <div class="theme-name">${theme.name}</div>
        <div class="theme-progress">进度: ${themeProgress.completed}/${themeProgress.total}</div>
      `;

      const cardClickHandler = () => {
        this.showConquestLevelSelect(theme.id);
      };
      this.addTrackedEventListener(card, "click", cardClickHandler);

      grid.appendChild(card);
    });
  
};
/**
   * 检查征服模式主题是否已解锁
   * @param {number} themeId - 主题ID
   * @param {string[]} completedLevels - 已完成的关卡列表
   * @returns {boolean}
   */
UI.prototype.isConquestThemeUnlocked = function(themeId, completedLevels) {
    // 所有主题默认解锁
    return true;
  
};
/**
   * 获取征服模式主题进度
   * @param {number} themeId - 主题ID
   * @param {string[]} completedLevels - 已完成的关卡列表
   * @returns {Object} { completed, total }
   */
UI.prototype.getConquestThemeProgress = function(themeId, completedLevels) {
    let completed = 0;
    for (let i = 1; i <= 5; i++) {
      if (completedLevels.includes(`${themeId}-${i}`)) {
        completed++;
      }
    }
    return { completed, total: 5 };
  
};
/**
   * 显示征服模式关卡选择界面
   * @param {number} themeId - 主题ID
   */
UI.prototype.showConquestLevelSelect = function(themeId) {
    this.currentConquestThemeId = themeId;

    const conquestThemeSelect = document.getElementById("conquest-theme-select-container");
    const conquestLevelSelect = document.getElementById("conquest-level-select-container");
    const backBtn = document.getElementById("back-to-menu");

    // 隐藏征服主题选择
    if (conquestThemeSelect) conquestThemeSelect.classList.add("hidden");

    // 隐藏塔防模式容器
    document.getElementById("theme-select-container")?.classList.add("hidden");
    document.getElementById("level-list-container")?.classList.add("hidden");

    // 显示关卡选择
    if (conquestLevelSelect) {
      conquestLevelSelect.classList.remove("hidden");
      this.renderConquestLevelSelect(themeId);
    }

    // 关卡选择容器内部已有返回按钮，不需要显示通用的返回按钮
    if (backBtn) {
      backBtn.classList.add("hidden");
    }
  
};
/**
   * 渲染征服模式关卡选择界面
   * @param {number} themeId - 主题ID
   */
UI.prototype.renderConquestLevelSelect = function(themeId) {
    const theme = CONQUEST_THEMES.find(t => t.id === themeId);
    const titleEl = document.getElementById("conquest-current-theme-name");
    const grid = document.querySelector("#conquest-level-select-container .conquest-level-grid");

    if (titleEl && theme) {
      titleEl.textContent = theme.name;
      titleEl.style.color = theme.color;
    }

    if (!grid) return;

    // 获取进度
    const progress = conquestProgress ? conquestProgress.getProgress() : { completedLevels: [] };
    const completedLevels = progress.completedLevels || [];

    // 清空现有内容
    grid.innerHTML = "";

    // 渲染每个关卡（所有关卡默认解锁）
    for (let i = 1; i <= 5; i++) {
      const levelId = `${themeId}-${i}`;
      const isCompleted = completedLevels.includes(levelId);
      // 所有关卡默认解锁
      const isUnlocked = true;

      const item = document.createElement("div");
      item.className = `conquest-level-item ${isCompleted ? "completed" : ""}`;
      item.dataset.level = i;

      item.innerHTML = `
        <span class="level-num">关卡 ${i}</span>
        <span class="level-status">${isCompleted ? "✓" : ""}</span>
      `;

      const levelClickHandler = () => {
        this.startConquestLevel(levelId);
      };
      this.addTrackedEventListener(item, "click", levelClickHandler);

      grid.appendChild(item);
    }
  
};
/**
   * 开始征服模式关卡
   * @param {string} levelId - 关卡ID (格式: "主题-关卡")
   */
UI.prototype.startConquestLevel = function(levelId) {
    // 保存当前关卡
    if (conquestProgress) {
      conquestProgress.setLastPlayedLevel(levelId);
    }

    // 隐藏菜单
    document.getElementById("main-menu").classList.add("hidden");
    document.getElementById("conquest-level-select-container").classList.add("hidden");

    // 启动征服模式游戏
    if (window.conquestGame) {
      window.conquestGame.startLevel(levelId);
    }
  
};
