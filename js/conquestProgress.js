/**
 * 征服进度管理器
 * 管理玩家的关卡完成进度和主题解锁状态
 */
class ConquestProgressManager {
  constructor() {
    this.storageKey = 'moshou_conquest_progress';
    this.defaultProgress = {
      completedLevels: [],
      unlockedThemes: [1],
      lastPlayedLevel: '1-1'
    };
    this.totalLevelsPerTheme = 5;  // 每个主题5个关卡
    this.totalThemes = 5;
    this._memoryProgress = null;  // 内存降级备份
    this._storageWarningShown = false;  // 防止重复提示
  }

  /**
   * 获取所有进度数据
   * @returns {Object} 进度数据对象
   */
  getProgress() {
    // 优先检查内存备份（降级方案）
    if (this._memoryProgress) {
      return {
        completedLevels: this._memoryProgress.completedLevels || [],
        unlockedThemes: this._memoryProgress.unlockedThemes || [1],
        lastPlayedLevel: this._memoryProgress.lastPlayedLevel || '1-1'
      };
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          completedLevels: parsed.completedLevels || [],
          unlockedThemes: parsed.unlockedThemes || [1],
          lastPlayedLevel: parsed.lastPlayedLevel || '1-1'
        };
      }
    } catch (e) {
      console.warn('读取进度失败:', e);
      // 如果 localStorage 读取失败但有内存备份，返回内存中的进度
      if (this._memoryProgress) {
        return {
          completedLevels: this._memoryProgress.completedLevels || [],
          unlockedThemes: this._memoryProgress.unlockedThemes || [1],
          lastPlayedLevel: this._memoryProgress.lastPlayedLevel || '1-1'
        };
      }
    }
    return { ...this.defaultProgress };
  }

  /**
   * 保存进度数据
   * @param {Object} progress - 进度数据对象
   */
  saveProgress(progress) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(progress));
      this._memoryProgress = null; // 清除内存备份
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22 || e.number === 22) {
        this._memoryProgress = progress;
        this._showStorageWarning();
        console.warn('存储空间不足，进度将保存在内存中（页面刷新后丢失）');
      } else {
        this._memoryProgress = progress;
        console.warn('保存进度失败，进度将保存在内存中:', e);
      }
    }
  }

  /**
   * 标记关卡完成
   * @param {string} levelId - 关卡ID，格式如 "1-1", "2-5"
   */
  markLevelCompleted(levelId) {
    const progress = this.getProgress();
    
    if (!progress.completedLevels.includes(levelId)) {
      progress.completedLevels.push(levelId);
      progress.completedLevels.sort((a, b) => {
        const [themeA, levelA] = a.split('-').map(Number);
        const [themeB, levelB] = b.split('-').map(Number);
        if (themeA !== themeB) return themeA - themeB;
        return levelA - levelB;
      });
    }
    
    this._updateUnlockedThemes(progress);
    this.saveProgress(progress);
  }

  /**
   * 检查关卡是否完成
   * @param {string} levelId - 关卡ID
   * @returns {boolean} 是否完成
   */
  isLevelCompleted(levelId) {
    const progress = this.getProgress();
    return progress.completedLevels.includes(levelId);
  }

  /**
   * 检查主题是否解锁
   * @param {number} themeId - 主题ID (1-5)
   * @returns {boolean} 是否解锁
   */
  isThemeUnlocked(themeId) {
    // 所有主题默认解锁
    return true;
  }

  /**
   * 获取主题进度
   * @param {number} themeId - 主题ID (1-5)
   * @returns {Object} 主题进度对象 { completed: number, total: number, percentage: number }
   */
  getThemeProgress(themeId) {
    const progress = this.getProgress();
    const themeLevels = progress.completedLevels.filter(id => {
      const [theme] = id.split('-').map(Number);
      return theme === themeId;
    });
    
    const completed = themeLevels.length;
    const total = this.totalLevelsPerTheme;
    const percentage = Math.round((completed / total) * 100);
    
    return {
      completed,
      total,
      percentage
    };
  }

  /**
   * 获取最后游玩的关卡
   * @returns {string} 关卡ID
   */
  getLastPlayedLevel() {
    const progress = this.getProgress();
    return progress.lastPlayedLevel;
  }

  /**
   * 设置最后游玩的关卡
   * @param {string} levelId - 关卡ID
   */
  setLastPlayedLevel(levelId) {
    const progress = this.getProgress();
    progress.lastPlayedLevel = levelId;
    this.saveProgress(progress);
  }

  /**
   * 重置所有进度
   */
  resetProgress() {
    this.saveProgress({ ...this.defaultProgress });
  }

  /**
   * 获取已完成关卡总数
   * @returns {number} 已完成关卡数量
   */
  getTotalCompletedLevels() {
    const progress = this.getProgress();
    return progress.completedLevels.length;
  }

  /**
   * 获取总体进度百分比
   * @returns {number} 总体进度百分比
   */
  getOverallProgress() {
    const totalCompleted = this.getTotalCompletedLevels();
    const totalLevels = this.totalThemes * this.totalLevelsPerTheme;
    return Math.round((totalCompleted / totalLevels) * 100);
  }

  /**
   * 获取下一个可玩关卡
   * @returns {string|null} 下一个关卡ID，如果没有则返回null
   */
  getNextLevel() {
    const progress = this.getProgress();
    
    for (let theme = 1; theme <= this.totalThemes; theme++) {
      if (!this.isThemeUnlocked(theme)) continue;
      
      for (let level = 1; level <= this.totalLevelsPerTheme; level++) {
        const levelId = `${theme}-${level}`;
        if (!progress.completedLevels.includes(levelId)) {
          return levelId;
        }
      }
    }
    
    return null;
  }

  /**
   * 获取关卡配置
   * @param {string} levelId - 关卡ID，格式如 "1-1", "2-5"
   * @returns {Object|null} 关卡配置对象
   */
  getLevelConfig(levelId) {
    // 从 CONQUEST_LEVELS_DATA 获取关卡配置
    if (typeof CONQUEST_LEVELS_DATA !== 'undefined') {
      return CONQUEST_LEVELS_DATA[levelId] || null;
    }
    return null;
  }

  /**
   * 更新解锁的主题列表
   * @private
   * @param {Object} progress - 进度对象
   */
  _updateUnlockedThemes(progress) {
    // 所有主题默认解锁，无需更新
    progress.unlockedThemes = [1, 2, 3, 4, 5];
  }

  /**
   * 计算指定主题已完成的关卡数
   * @private
   * @param {Object} progress - 进度对象
   * @param {number} themeId - 主题ID
   * @returns {number} 已完成关卡数
   */
  _countCompletedLevelsInTheme(progress, themeId) {
    return progress.completedLevels.filter(id => {
      const [theme] = id.split('-').map(Number);
      return theme === themeId;
    }).length;
  }

  /**
   * 显示存储空间不足警告
   * @private
   */
  _showStorageWarning() {
    if (this._storageWarningShown) return;
    this._storageWarningShown = true;

    const message = '存储空间不足，游戏进度将临时保存在内存中。页面刷新后进度会丢失，请清理浏览器缓存以获得持久化存储。';
    console.warn(message);

    // 如果游戏UI可用，显示游戏内提示
    if (typeof showToast === 'function') {
      showToast('存储空间不足，进度将在页面刷新后丢失', 'warning');
    } else if (typeof alert !== 'undefined') {
      // 降级使用原生alert
      setTimeout(() => alert(message), 0);
    }
  }

  /**
   * 检查 localStorage 是否可用
   * @returns {boolean} 是否可用
   */
  isStorageAvailable() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }
}

const conquestProgress = new ConquestProgressManager();
