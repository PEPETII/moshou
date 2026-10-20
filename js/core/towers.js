// Game：炮塔放置
Game.prototype.getUnlockedTowers = function() {
    // 实验阶段：只开放 CONFIG.ACTIVE_TOWERS（火、水、土、木）；其余单字塔下架但配置保留
    return CONFIG.ACTIVE_TOWERS.filter((type) => CONFIG.TOWERS[type]);
  
};
// 配置了 maxCount 的塔（财、医）达到数量上限后不可再放置
Game.prototype.isTowerTypeAtLimit = function(type) {
    const max = CONFIG.TOWERS[type] && CONFIG.TOWERS[type].maxCount;
    if (!max) return false;
    return this.towers.filter((t) => t.type === type).length >= max;
  
};
Game.prototype.canPlaceTower = function(type, gx, gy) {
    if (this.inkTrailAnimation && this.inkTrailAnimation.active) return false;
    const config = CONFIG.TOWERS[type];
    if (!config) return false;
    if (this.ink < config.cost) return false;

    if (this.isTowerTypeAtLimit(type)) return false;

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

    if (this.isTowerTypeAtLimit(type)) return `「${config.char}」最多放置 ${config.maxCount} 座`;

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
    if (window.InkAudio) window.InkAudio.play('place');
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
    if (window.InkAudio) window.InkAudio.play('sell');
  
};
