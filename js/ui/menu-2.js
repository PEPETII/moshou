// UI：菜单、主题、关卡和自定义入口（续）
/**
   * 显示关卡列表（兼容旧方法）
   * @param {number} themeId - 主题ID
   */
UI.prototype.showLevelList = function(themeId) {
    this.showLevelSelect(themeId);
  
};
/**
   * 填充关卡列表（兼容旧方法）
   * @param {number} themeId - 主题ID
   */
UI.prototype.populateLevelList = function(themeId) {
    this.renderLevelSelect(themeId);
  
};
