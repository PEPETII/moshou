// Game：炮塔放置与融合
Game.prototype.getUnlockedTowers = function() {
    // 所有炮塔默认解锁
    return Object.keys(CONFIG.TOWERS).filter(type => type !== 'fusion');
  
};
Game.prototype.canPlaceTower = function(type, gx, gy) {
    if (this.inkTrailAnimation && this.inkTrailAnimation.active) return false;
    const config = CONFIG.TOWERS[type];
    if (!config) return false;
    if (this.gold < config.cost) return false;

    if (config.onPath) {
      return this._pathCellSet.has(gridKey(gx, gy)) && !this.runtimeIndexes.getTowerAt(gx, gy);
    }

    if (this._placementGridSet && this._placementGridSet.has(`${gx},${gy}`)) {
      return !this.runtimeIndexes.getTowerAt(gx, gy);
    }

    return false;
  
};
Game.prototype.placeTower = function(type, gx, gy) {
    if (this.inputLocked || this.gameEnded) return false;
    if (!this.canPlaceTower(type, gx, gy)) return false;

    const config = CONFIG.TOWERS[type];
    if (this.gold < config.cost) return false;
    this.gold -= config.cost;
    if (this.gold < 0) this.gold = 0;

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
    this.gold += tower.getSellValue();
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
      gold: this.gold,
      path: this.path
    });
    return result.canFuse;
  
};
Game.prototype.fuseTowers = function(tower1, tower2) {
    try {
      const result = fusionSystem.canFuse(tower1.type, tower2.type, {
        tower1,
        tower2,
        gold: this.gold,
        path: this.path
      });
      if (!result.canFuse) return false;

      const fusionType = result.key;
    const fusionConfig = result.recipe;
    if (this.gold < fusionConfig.cost) return false;
    this.gold -= fusionConfig.cost;
    if (this.gold < 0) this.gold = 0;

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
    return fusionSystem.getPreview(tower1.type, tower2.type, this.gold);
  
};
