// 未归类兼容方法
/**
   * 添加受追踪的事件监听器
   * @param {EventTarget} target - 事件目标
   * @param {string} type - 事件类型
   * @param {Function} listener - 事件监听器
   * @param {Object|boolean} options - 事件选项
   */
ConquestGame.prototype.addTrackedEventListener = function(target, type, listener, options) {
    if (!target) {
      console.warn(`[征服模式] UI事件绑定失败: 目标元素不存在 (事件类型: ${type})`);
      return;
    }

    // 防御性检查：防止重复添加相同的事件监听器
    const isDuplicate = this._eventListeners.some(
      (item) => item.target === target && item.type === type && item.listener === listener
    );
    if (isDuplicate) {
      console.warn(`重复的事件监听器被阻止: ${type} on`, target);
      return;
    }

    target.addEventListener(type, listener, options);
    this._eventListeners.push({ target, type, listener, options });
  
};
/**
   * 销毁游戏对象，清理所有事件监听器
   */
ConquestGame.prototype.destroy = function() {
    // 停止游戏循环
    this.stop();

    // 清理 spawn 定时器
    if (this.spawnTimerId) {
      clearTimeout(this.spawnTimerId);
      this.spawnTimerId = null;
    }

    // 移除所有追踪的事件监听器
    if (this._eventListeners && this._eventListeners.length > 0) {
      for (const { target, type, listener, options } of this._eventListeners) {
        if (target) {
          try {
            target.removeEventListener(type, listener, options);
          } catch (e) {
            console.warn(`移除事件监听器失败: ${type}`, e);
          }
        }
      }
    }

    // 清空事件监听器数组
    this._eventListeners = [];
    this._uiEventsActive = false;

    // 清理融合模态框监听器
    this._cleanupFusionModalListeners();

    // 清理键盘快捷键
    this.cleanupKeyboardShortcuts();

    // 清理拖拽状态
    this.draggingTower = null;
    this.dragStartPos = null;
    this.dragCurrentPos = null;
    this.isDragging = false;
    this._touchState = null;
    this._dragSource = null;
    this._clearDragCache();

    // 清理触摸落点预览的延时器，避免销毁后仍回调
    if (this._hoverClearTimer) {
      clearTimeout(this._hoverClearTimer);
      this._hoverClearTimer = null;
    }
    this.hoveredCell = null;

    // 返回菜单/关卡列表时不能把征服模式的浮层和动态按钮带到下一页。
    this.hideTowerInfo();
    const modal = document.getElementById("modal");
    if (modal) modal.classList.add("hidden");
    const returnBtn = document.getElementById("modal-return-btn");
    if (returnBtn) {
      returnBtn.style.display = "none";
      returnBtn.onclick = null;
    }
  
};
ConquestGame.prototype.getDefaultLevelConfig = function() {
    return {
      id: 1,
      startInk: 300,
      summonCost: 80,
      maxWave: 3,
      maxAliveEnemies: 50,
      waves: [
        { type: "corpse", count: 30 },
        { type: "ghost", count: 30 },
        { type: "armor", count: 30 },
      ],
    };
  
};
ConquestGame.prototype.buildPath = function() {
    const path = [];
    for (let x = 0; x < this.COLS; x++) path.push({ x, y: 0 });
    for (let y = 1; y < this.ROWS; y++) path.push({ x: this.COLS - 1, y });
    for (let x = this.COLS - 2; x >= 0; x--) path.push({ x, y: this.ROWS - 1 });
    for (let y = this.ROWS - 2; y >= 1; y--) path.push({ x: 0, y });
    path.push({ x: 0, y: 0 });
    return path;
  
};
ConquestGame.prototype.buildPlacementGrid = function() {
    const grid = [];
    for (let x = 1; x < this.COLS - 1; x++) {
      for (let y = 1; y < this.ROWS - 1; y++) {
        grid.push({ x, y });
      }
    }
    return grid;
  
};
ConquestGame.prototype.setupUI = function() {
    this.addTrackedEventListener(document.getElementById("conquest-summon-btn"), "click", this._boundSummonTower);

    this.addTrackedEventListener(document.getElementById("conquest-wave-btn"), "click", this._boundStartWave);

    this.addTrackedEventListener(document.getElementById("conquest-fusion-encyclopedia-btn"), "click", this._boundShowFusionEncyclopedia);

    this.addTrackedEventListener(document.getElementById("conquest-menu-btn"), "click", this._boundReturnToLevelSelect);

    this.addTrackedEventListener(this.canvas, "mousemove", (e) => {
      const result = getGridFromEvent(e, this.canvas);
      if (result) {
        this.hoveredCell = { gx: result.gx, gy: result.gy };
      } else {
        this.hoveredCell = null;
      }

      if (this.draggingTower && !this.draggingTower.isFusion) {
        this.dragCurrentPos = { x: e.clientX, y: e.clientY };
        const dist = calculateDragDistance(this.dragStartPos.x, this.dragStartPos.y, this.dragCurrentPos.x, this.dragCurrentPos.y);
        if (checkDragThreshold(dist, this.dragThreshold)) {
          this.isDragging = true;
        }
      }
    });

    this.addTrackedEventListener(this.canvas, "mouseleave", () => {
      this.hoveredCell = null;
      this.draggingTower = null;
      this.dragStartPos = null;
      this.dragCurrentPos = null;
      this.isDragging = false;
      this._clearDragCache();
    });

    this.addTrackedEventListener(this.canvas, "mousedown", (e) => {
      if (this.gameEnded) return;
      const result = getGridFromEvent(e, this.canvas);
      if (!result) return;

      const { gx, gy } = result;
      const tower = this.getTowerAt(gx, gy);
      if (tower) {
        this.draggingTower = tower;
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.dragCurrentPos = { x: e.clientX, y: e.clientY };
        this.isDragging = false;
        this._cacheDragMetrics();
      }
    });

    this.addTrackedEventListener(this.canvas, "mouseup", (e) => {
      if (this.gameEnded) {
        this.draggingTower = null;
        this.isDragging = false;
        return;
      }

      if (this.draggingTower && this.isDragging) {
        const result = getGridFromEvent(e, this.canvas);
        if (result) {
          const { gx, gy } = result;
          const targetTower = this.getTowerAt(gx, gy);
          if (targetTower && targetTower !== this.draggingTower) {
            this.attemptFusion(this.draggingTower, targetTower);
          } else if (this.canPlaceAt(gx, gy)) {
            this.moveTower(this.draggingTower, gx, gy);
          }
        }
      } else if (this.draggingTower && !this.isDragging) {
        const result = getGridFromEvent(e, this.canvas);
        if (result) {
          const { gx, gy } = result;
          const tower = this.getTowerAt(gx, gy);
          if (tower) {
            this.showTowerInfo(tower, e.clientX, e.clientY);
          } else {
            this.hideTowerInfo();
          }
        }
      }

      this.draggingTower = null;
      this.dragStartPos = null;
      this.dragCurrentPos = null;
      this.isDragging = false;
    });

    this.addTrackedEventListener(this.canvas, "contextmenu", (e) => {
      e.preventDefault();
      this.hideTowerInfo();
    });

    // === 触摸输入（移动端主路径） ===
    // 实现见 js/modes/conquest/touch.js：按住预览 / 容差拾取 / 滑动取消 / 失败反馈。
    // 仅在有触摸硬件时注册，避免与上面的鼠标链路重复处理同一次操作。
    if (window.DeviceProfile && window.DeviceProfile.hasTouch) {
      this.setupTouchInteraction();
    }

    this._uiEventsActive = true;
  
};
ConquestGame.prototype.setupKeyboardShortcuts = function() {
    this._keyboardHandler = (e) => {
      // 如果游戏已结束，不响应快捷键
      if (this.gameEnded) return;

      // 检查是否有模态框显示
      const modal = document.getElementById("modal");
      const isModalVisible = modal && !modal.classList.contains("hidden");

      // 检查是否有炮塔信息面板显示
      const towerInfo = document.getElementById("conquest-tower-info");
      const isTowerInfoVisible = towerInfo && !towerInfo.classList.contains("hidden");

      // 检查是否有输入框聚焦
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.contentEditable === "true"
      );

      // ESC键：关闭弹窗或返回菜单
      if (e.key === "Escape") {
        if (isModalVisible) {
          // 关闭模态框
          modal.classList.add("hidden");
          // 清理融合模态框监听器
          this._cleanupFusionModalListeners();
          // 隐藏返回按钮（如果存在）
          const returnBtn = document.getElementById("modal-return-btn");
          if (returnBtn) returnBtn.style.display = "none";
        } else if (isTowerInfoVisible) {
          // 关闭炮塔信息面板
          this.hideTowerInfo();
        } else {
          // 返回主菜单
          this.returnToMenu();
        }
        return;
      }

      // 模态框显示时不响应其他游戏快捷键
      if (isModalVisible) return;

      // 输入框聚焦时不响应快捷键
      if (isInputFocused) return;

      switch (e.key) {
        case " ": // 空格键：开始波次
        case "Spacebar": // 兼容旧浏览器
          e.preventDefault(); // 防止页面滚动
          if (!this.waveInProgress && this.wave < this.maxWave) {
            this.startWave();
          }
          break;

        case "s":
        case "S": // S键：召唤炮塔
          this.summonTower();
          break;
      }
    };

    this.addTrackedEventListener(document, "keydown", this._keyboardHandler);
  
};
ConquestGame.prototype.cleanupKeyboardShortcuts = function() {
    // 键盘事件监听器现在由 _eventListeners 数组统一管理
    // 此方法保留用于兼容性，实际清理在 destroy() 中完成
    this._keyboardHandler = null;
  
};
ConquestGame.prototype.canPlaceAt = function(gx, gy) {
    if (this._placementGridSet.has(`${gx},${gy}`)) {
      for (const t of this.towers) {
        if (t.gx === gx && t.gy === gy) return false;
      }
      return true;
    }
    return false;
  
};
ConquestGame.prototype.moveTower = function(tower, gx, gy) {
    if (!this.canPlaceAt(gx, gy)) return;
    // 更新索引：删除旧位置，添加新位置
    this._towerIndex.delete(`${tower.gx},${tower.gy}`);
    tower.gx = gx;
    tower.gy = gy;
    this._towerIndex.set(`${gx},${gy}`, tower);
    const pos = gridToPixel(gx, gy);
    tower.x = pos.x;
    tower.y = pos.y;
    this.particleSystem.createExplosion(pos.x, pos.y, 8, CONFIG.COLORS.towerShadow);
    this.updateUI();
  
};
ConquestGame.prototype.getFusionType = function(type1, type2) {
    return fusionSystem.getFusionType(type1, type2);
  
};
ConquestGame.prototype.canFuse = function(tower1, tower2) {
    const result = fusionSystem.canFuse(tower1.type, tower2.type, {
      tower1,
      tower2,
      ink: this.ink,
    });
    return result.canFuse;
  
};
ConquestGame.prototype.showTowerInfo = function(tower, x, y) {
    const info = document.getElementById("conquest-tower-info");
    if (!info) return;

    const config = tower.isFusion
      ? CONFIG.FUSION_TOWERS[tower.fusionType]
      : CONFIG.TOWERS[tower.type];

    info.querySelector(".info-char").textContent = tower.char;
    info.querySelector(".info-level").textContent = tower.isFusion ? "融合 Lv.1" : `Lv.${tower.level}`;

    let stats = "";
    if (tower.isFusion) {
      stats += `组合: ${tower.components.map((c) => CONFIG.TOWERS[c]?.char || c).join("+")}<br>`;
    }
    if (tower.damage > 0) stats += `伤害: ${tower.damage}<br>`;
    if (tower.range) stats += `范围: ${tower.range}格<br>`;
    if (tower.cooldown) stats += `攻速: ${(tower.cooldown / 1000).toFixed(1)}秒<br>`;
    if (tower.slow) stats += `减速: ${Math.round(tower.slow * 100)}%<br>`;
    if (tower.hp) stats += `生命: ${tower.hp}/${tower.maxHp}<br>`;
    if (tower.burn) stats += `灼烧: 是<br>`;
    if (tower.pierce) stats += `穿透: 是<br>`;
    info.querySelector(".info-stats").innerHTML = stats;

    const sellBtn = info.querySelector(".sell-btn");
    sellBtn.textContent = `出售 +${tower.getSellValue()}墨`;
    sellBtn.onclick = () => {
      this.sellTower(tower);
      this.hideTowerInfo();
    };

    // 关闭方式的提示：桌面端是右键，移动端没有右键，只能提示"点击空白处"
    let closeHint = info.querySelector(".right-click-hint");
    if (!closeHint) {
      closeHint = document.createElement("div");
      closeHint.className = "right-click-hint";
      closeHint.style.cssText = "font-size:11px;color:#6a6459;text-align:center;margin-top:8px;font-family:'ZCOOL XiaoWei',serif;";
      info.appendChild(closeHint);
    }
    const isTouchDevice = !!(window.DeviceProfile && window.DeviceProfile.isTouch);
    closeHint.textContent = isTouchDevice ? "点击空白处关闭" : "右键取消选择";

    const upgradeBtn = info.querySelector(".upgrade-btn");
    if (tower.isFusion || tower.level >= tower.maxLevel) {
      upgradeBtn.textContent = tower.isFusion ? "融合不可升级" : "已满级";
      upgradeBtn.disabled = true;
    } else {
      upgradeBtn.textContent = `升级 ${tower.upgradeCost * tower.level}墨`;
      upgradeBtn.disabled = this.ink < tower.upgradeCost * tower.level;
      upgradeBtn.onclick = () => {
        const upgraded = tower.upgrade();
        if (upgraded) {
          this.updateUI();
          this.showTowerInfo(tower, x, y);
        }
      };
    }

    // 面板定位：以视口为准做 clamp。
    // 旧实现取 #game-container 的 rect —— 征服模式下该容器不可见（rect 全 0），
    // 算出的 maxX/maxY 为 -180/-150，面板会被定位到屏幕外，玩家看不到任何反馈。
    info.classList.remove("hidden");

    const panelRect = info.getBoundingClientRect();
    const margin = 8;
    const maxLeft = Math.max(margin, window.innerWidth - panelRect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - panelRect.height - margin);

    // 触屏：面板放在触点上方，避免被手指和手掌遮住
    const preferAbove = !!(window.DeviceProfile && window.DeviceProfile.isTouch);
    let top = preferAbove ? y - panelRect.height - 16 : y + 12;
    if (preferAbove && top < margin) top = y + 20;

    info.style.left = clamp(x + 12, margin, maxLeft) + "px";
    info.style.top = clamp(top, margin, maxTop) + "px";

    tower.selected = true;
    for (const t of this.towers) {
      if (t !== tower) t.selected = false;
    }
  
};
ConquestGame.prototype.hideTowerInfo = function() {
    const info = document.getElementById("conquest-tower-info");
    if (info) info.classList.add("hidden");
    for (const t of this.towers) {
      t.selected = false;
    }
  
};
