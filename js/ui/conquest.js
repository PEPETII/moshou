// UI：征服模式的择卷与长卷选关（工单 P3：与塔防共用 js/ui/level-scroll.js 的渲染）
// 征服关卡没有关名，按「主题名 + 其一、其二…」称呼；点节点只选中，点「入境」才开局。

UI.prototype.showConquestThemeSelect = function() {
    this.setMainMenuButtonsVisible(false);
    ["theme-select-container", "level-list-container", "encyclopedia-container",
      "tower-encyclopedia-container", "enemy-encyclopedia-container", "conquest-level-select-container"]
      .forEach((id) => this.setMenuPage(id, false));
    this.setMenuPage("conquest-theme-select-container", true);
    this.renderConquestThemeSelect();
    this.currentConquestThemeId = null;
};

UI.prototype.conquestCompletedLevels = function() {
    const progress = conquestProgress ? conquestProgress.getProgress() : { completedLevels: [] };
    return progress.completedLevels || [];
};

UI.prototype.renderConquestThemeSelect = function() {
    const completed = this.conquestCompletedLevels();
    const themes = CONQUEST_THEMES.map((theme) => {
      const progress = this.getConquestThemeProgress(theme.id, completed);
      return { id: theme.id, icon: theme.icon, name: theme.name, desc: theme.desc,
        done: progress.completed, total: progress.total };
    });
    this.renderThemeShelf(document.getElementById("cq-theme-shelf"), themes,
      (id) => this.showConquestLevelSelect(id));
};

UI.prototype.isConquestThemeUnlocked = function() {
    return true; // 所有主题默认解锁
};

UI.prototype.getConquestThemeProgress = function(themeId, completedLevels) {
    let completed = 0;
    for (let i = 1; i <= CONQUEST_LEVELS_PER_THEME; i++) {
      if (completedLevels.includes(`${themeId}-${i}`)) completed++;
    }
    return { completed, total: CONQUEST_LEVELS_PER_THEME };
};

UI.prototype.showConquestLevelSelect = function(themeId) {
    this.currentConquestThemeId = themeId;
    this.setMainMenuButtonsVisible(false);
    ["conquest-theme-select-container", "theme-select-container", "level-list-container"]
      .forEach((id) => this.setMenuPage(id, false));
    this.setMenuPage("conquest-level-select-container", true);
    this.renderConquestLevelSelect(themeId);
};

UI.prototype.renderConquestLevelSelect = function(themeId) {
    const theme = CONQUEST_THEMES.find((t) => t.id === themeId);
    if (!theme) return;
    const completed = this.conquestCompletedLevels();
    const levels = [];
    for (let i = 1; i <= CONQUEST_LEVELS_PER_THEME; i++) {
      const id = `${themeId}-${i}`;
      const data = CONQUEST_LEVELS_DATA[id] || {};
      const done = completed.includes(id);
      levels.push({
        id, num: i, done,
        name: `${theme.name}其${LEVEL_SCROLL_NUMERALS[i - 1] || i}`,
        meta: [`坚守 ${data.holdSeconds || CONFIG.HOLD_SECONDS} 秒`, `初墨 ${data.startInk}`,
          `召唤 ${data.summonCost} 墨起`, done ? "已守成" : "未守"],
      });
    }
    document.getElementById("conquest-current-theme-name").textContent = theme.name;
    const progress = this.getConquestThemeProgress(themeId, completed);
    document.getElementById("cq-level-progress").textContent = `已守 ${progress.completed} / ${progress.total}`;
    this.renderLevelScroll(document.getElementById("cq-level-scroll"), levels,
      { enterId: "conquest-enter-level", onEnter: (level) => this.startConquestLevel(level.id) });
};

/**
 * 开始征服模式关卡
 * @param {string} levelId - 关卡ID (格式: "主题-关卡")
 */
UI.prototype.startConquestLevel = function(levelId) {
    if (conquestProgress) conquestProgress.setLastPlayedLevel(levelId);

    document.getElementById("main-menu").classList.add("hidden");
    document.getElementById("conquest-level-select-container").classList.add("hidden");

    if (window.conquestGame) window.conquestGame.startLevel(levelId);
};
