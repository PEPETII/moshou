// Game：炮塔放置与融合
Game.prototype.getUnlockedTowers = function() {
    // 所有炮塔默认解锁
    return Object.keys(CONFIG.TOWERS).filter(type => type !== 'fusion');
  
};
Game.prototype.canPlaceTower = function(type, gx, gy) {
    if (this.inkTrailAnimation && this.inkTrailAnimation.active) return false;
    const config = CONFIG.TOWERS[type];
    if (!config) return false;
    if (this.ink < config.cost) return false;

    if (config.onPath) {
      return this._pathCellSet.has(gridKey(gx, gy)) && !this.runtimeIndexes.getTowerAt(gx, gy);
    }

    if (this._placementGridSet && this._placementGridSet.has(`${gx},${gy}`)) {
      return !this.runtimeIndexes.getTowerAt(gx, gy);
    }

    return false;
  
};
/**
 * 返回"为什么放不下"的可读原因；可以放置时返回 null。
 *
 * 与 canPlaceTower 严格等价：reason 为 null ⇔ canPlaceTower 为 true。
 * 存在的意义是触摸端：那里没有 hover 预览，旧实现放置失败时静默 return false，
 * 玩家只能看到"点了没反应"，无法区分墨水不足 / 格子被占 / 位置非法。
 *
 * @param {string} type 炮塔类型
 * @param {number} gx 网格 x
 * @param {number} gy 网格 y
 * @returns {string|null} 失败原因，或 null 表示可放置
 */
Game.prototype.getPlacementBlockReason = function(type, gx, gy) {
    if (this.gameEnded) return '关卡已结束';
    if (this.inputLocked) return '当前无法操作';
    if (this.inkTrailAnimation && this.inkTrailAnimation.active) return '开场准备中…';

    const config = CONFIG.TOWERS[type];
    if (!config) return '未知的炮塔类型';

    if (gx < 0 || gy < 0 || gx >= CONFIG.GRID_COLS || gy >= CONFIG.GRID_ROWS) {
      return '超出战场范围';
    }

    if (config.onPath) {
      if (!this._pathCellSet.has(gridKey(gx, gy))) {
        return `「${config.char}」只能放在路径上`;
      }
    } else if (!(this._placementGridSet && this._placementGridSet.has(`${gx},${gy}`))) {
      return '这里不能建造';
    }

    if (this.runtimeIndexes.getTowerAt(gx, gy)) return '该位置已有炮塔';
    if (this.ink < config.cost) return `墨水不足（需 ${config.cost} 墨）`;

    return null;
};
Game.prototype.placeTower = function(type, gx, gy) {
    if (this.inputLocked || this.gameEnded) return false;
    if (!this.canPlaceTower(type, gx, gy)) return false;

    const config = CONFIG.TOWERS[type];
    if (this.ink < config.cost) return false;
    this.ink -= config.cost;
    if (this.ink < 0) this.ink = 0;

    const tower = new Tower(type, gx, gy, this);
    this.towers.push(tower);
    this.runtimeIndexes.rebuildTowers();

    this.updateUI();
    return true;
  
};
Game.prototype.getTowerAt = function(gx, gy) {
    return this.runtimeIndexes.getTowerAt(gx, gy);
  
};
Game.prototype.removeTower = function(tower) {
    const index = this.towers.indexOf(tower);
    if (index > -1) {
      this.towers.splice(index, 1);
      this.runtimeIndexes.rebuildTowers();
    }
  
};
Game.prototype.sellTower = function(tower) {
    this.ink += tower.getSellValue();
    this.removeTower(tower);
    this.updateUI();
  
};
Game.prototype.getFusionType = function(type1, type2) {
    return fusionSystem.getFusionType(type1, type2);
  
};
Game.prototype.canFuse = function(tower1, tower2) {
    const result = fusionSystem.canFuse(tower1.type, tower2.type, {
      tower1,
      tower2,
      ink: this.ink,
      path: this.path
    });
    return result.canFuse;
  
};
Game.prototype.fuseTowers = function(tower1, tower2) {
    try {
      const result = fusionSystem.canFuse(tower1.type, tower2.type, {
        tower1,
        tower2,
        ink: this.ink,
        path: this.path
      });
      if (!result.canFuse) return false;

      const fusionType = result.key;
    const fusionConfig = result.recipe;
    if (this.ink < fusionConfig.cost) return false;
    this.ink -= fusionConfig.cost;
    if (this.ink < 0) this.ink = 0;

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
  
};
Game.prototype.getFusionPreview = function(tower1, tower2) {
    return fusionSystem.getPreview(tower1.type, tower2.type, this.ink);
  
};
