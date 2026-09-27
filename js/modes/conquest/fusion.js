// ConquestGame：融合和预览
ConquestGame.prototype.fuseTowers = function(tower1, tower2) {
    // 开始时清理缓存，确保无论融合成功与否都不会留下脏数据
    fusionSystem.clearCache();

    const result = fusionSystem.canFuse(tower1.type, tower2.type, {
      tower1,
      tower2,
      ink: this.ink,
    });
    if (!result.canFuse) return false;

    const fusionType = result.key;
    const fusionConfig = result.recipe;
    this.ink -= fusionConfig.cost;

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
    return fusionSystem.getPreview(tower1.type, tower2.type, this.ink);
  
};
// 模态框的第二个按钮（"取消"）：桌面端可用 ESC 关闭融合确认，
// 移动端没有键盘，必须给出可见的取消入口，否则误触后只能被迫执行融合。
ConquestGame.prototype._ensureModalReturnButton = function() {
    let returnBtn = document.getElementById("modal-return-btn");
    const btnEl = document.getElementById("modal-btn");
    if (!returnBtn && btnEl && btnEl.parentNode) {
      returnBtn = document.createElement("button");
      returnBtn.id = "modal-return-btn";
      returnBtn.className = "ink-button secondary";
      returnBtn.type = "button";
      btnEl.parentNode.insertBefore(returnBtn, btnEl.nextSibling);
    }
    return returnBtn;
};
ConquestGame.prototype.attemptFusion = function(tower1, tower2) {
    const preview = this.getFusionPreview(tower1, tower2);
    if (!preview) {
      // 触屏没有 hover 预览，静默 return 等于"点了没反应"
      this._notify('这两个炮塔无法融合', 'warning');
      return;
    }

    const canFuse = this.canFuse(tower1, tower2);

    let message = `将 ${tower1.char} 和 ${tower2.char} 融合成 ${preview.char}\n`;
    message += `效果: ${preview.desc}\n`;
    message += `费用: ${preview.cost}墨`;

    if (!canFuse && !preview.canAfford) {
      message += `\n墨水不足!`;
    } else if (!canFuse) {
      message += `\n当前组合不满足融合条件`;
    }

    const modal = document.getElementById("modal");
    const titleEl = document.getElementById("modal-title");
    const textEl = document.getElementById("modal-text");
    const btnEl = document.getElementById("modal-btn");

    const returnBtn = this._ensureModalReturnButton();

    // 信息面板的层级高于通用模态框。打开融合确认前先关闭，
    // 避免面板遮住移动端的确认/取消按钮。
    this.hideTowerInfo();

    titleEl.textContent = "融合炮塔";
    textEl.textContent = message;
    btnEl.textContent = canFuse ? "确认融合" : "知道了";
    btnEl.disabled = false;
    modal.classList.remove("hidden");

    // 清理之前可能存在的事件监听器
    this._cleanupFusionModalListeners();

    const pendingFusion = canFuse ? { tower1, tower2 } : null;

    const closeModal = () => {
      this._cleanupFusionModalListeners();
      modal.classList.add("hidden");
      if (returnBtn) {
        returnBtn.style.display = "none";
        returnBtn.onclick = null;
      }
    };

    // 取消入口：可融合时才是真正的"取消"，否则只有一个按钮（"知道了"）即可
    if (returnBtn) {
      returnBtn.textContent = "取消";
      returnBtn.style.display = canFuse ? "inline-block" : "none";
      returnBtn.onclick = closeModal;
    }

    // 使用 addEventListener 绑定事件，避免覆盖其他处理器
    this._fusionModalHandler = () => {
      // 防抖：禁用按钮防止重复点击
      btnEl.disabled = true;

      if (pendingFusion) {
        this.fuseTowers(pendingFusion.tower1, pendingFusion.tower2);
        this.hideTowerInfo();
      }
      closeModal();
    };

    btnEl.addEventListener("click", this._fusionModalHandler);
  
};
// 清理融合模态框的事件监听器
ConquestGame.prototype._cleanupFusionModalListeners = function() {
    const btnEl = document.getElementById("modal-btn");
    if (this._fusionModalHandler) {
      if (btnEl) btnEl.removeEventListener("click", this._fusionModalHandler);
      this._fusionModalHandler = null;
    }
  
};
