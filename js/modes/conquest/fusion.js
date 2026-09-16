// ConquestGame：融合和预览
ConquestGame.prototype.fuseTowers = function(tower1, tower2) {
    // 开始时清理缓存，确保无论融合成功与否都不会留下脏数据
    fusionSystem.clearCache();

    const result = fusionSystem.canFuse(tower1.type, tower2.type, {
      tower1,
      tower2,
      gold: this.gold,
    });
    if (!result.canFuse) return false;

    const fusionType = result.key;
    const fusionConfig = result.recipe;
    this.gold -= fusionConfig.cost;

    let gx, gy;
    if (fusionConfig.onPath) {
      if (tower1.type === "mountain") {
        gx = tower1.gx;
        gy = tower1.gy;
      } else {
        gx = tower2.gx;
        gy = tower2.gy;
      }
    } else {
      gx = tower1.gx;
      gy = tower1.gy;
    }

    this.removeTower(tower1);
    this.removeTower(tower2);

    const fusionTower = new FusionTower(fusionType, gx, gy, this);
    this.towers.push(fusionTower);

    const pos = gridToPixel(gx, gy);
    this.particleSystem.createExplosion(pos.x, pos.y, 20, fusionConfig.color);

    fusionSystem.clearCache();
    this.updateUI();
    return true;
  
};
ConquestGame.prototype.getFusionPreview = function(tower1, tower2) {
    return fusionSystem.getPreview(tower1.type, tower2.type, this.gold);
  
};
ConquestGame.prototype.attemptFusion = function(tower1, tower2) {
    const preview = this.getFusionPreview(tower1, tower2);
    if (!preview) {
      return;
    }

    const canFuse = this.canFuse(tower1, tower2);

    let message = `将 ${tower1.char} 和 ${tower2.char} 融合成 ${preview.char}\n`;
    message += `效果: ${preview.desc}\n`;
    message += `费用: ${preview.cost}金`;

    if (!canFuse && !preview.canAfford) {
      message += `\n金币不足!`;
    }

    const modal = document.getElementById("modal");
    const titleEl = document.getElementById("modal-title");
    const textEl = document.getElementById("modal-text");
    const btnEl = document.getElementById("modal-btn");

    titleEl.textContent = "融合炮塔";
    textEl.textContent = message;
    btnEl.textContent = canFuse ? "确认融合" : "取消";
    btnEl.disabled = false;
    modal.classList.remove("hidden");

    // 清理之前可能存在的事件监听器
    this._cleanupFusionModalListeners();

    const pendingFusion = canFuse ? { tower1, tower2 } : null;

    // 使用 addEventListener 绑定事件，避免覆盖其他处理器
    this._fusionModalHandler = () => {
      // 防抖：禁用按钮防止重复点击
      btnEl.disabled = true;
      
      if (pendingFusion) {
        this.fuseTowers(pendingFusion.tower1, pendingFusion.tower2);
        this.hideTowerInfo();
      }
      this._cleanupFusionModalListeners();
      modal.classList.add("hidden");
    };
    
    btnEl.addEventListener("click", this._fusionModalHandler);
  
};
// 清理融合模态框的事件监听器
ConquestGame.prototype._cleanupFusionModalListeners = function() {
    const btnEl = document.getElementById("modal-btn");
    if (this._fusionModalHandler) {
      btnEl.removeEventListener("click", this._fusionModalHandler);
      this._fusionModalHandler = null;
    }
  
};
