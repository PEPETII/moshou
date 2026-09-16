class ConquestEnemy extends Enemy {
  constructor(type, path, game) {
    super(type, path, game);
    this.speed *= 1.5;
    this.baseSpeed = this.speed;
  }

  reachCore() {
    this.game.coreHp -= this.damage;
    if (this.game.coreHp <= 0) {
      this.game.gameOver(false);
    }
    this.dead = true;
  }
}

class ConquestGame {
  constructor(levelConfig = null) {
    this.canvas = document.getElementById("conquest-canvas");
    this.ctx = this.canvas.getContext("2d");

    this.COLS = 16;
    this.ROWS = 9;
    this.CELL_SIZE = CONFIG.CELL_SIZE;

    this.canvas.width = this.COLS * this.CELL_SIZE;
    this.canvas.height = this.ROWS * this.CELL_SIZE;

    this.inkRenderer = new InkRenderer(this.ctx);
    this.particleSystem = new ParticleSystem();

    // 保存关卡配置
    this.levelConfig = levelConfig || this.getDefaultLevelConfig();
    this.currentLevelId = this.levelConfig.id || 1;

    // 使用关卡配置初始化游戏参数
    this.gold = this.levelConfig.startGold || 300;
    this.summonCost = this.levelConfig.summonCost || 80;
    this.maxWave = this.levelConfig.maxWave || 3;
    this.maxAliveEnemies = this.levelConfig.maxAliveEnemies || 50;

    this.towers = [];
    this.enemies = [];
    this.gameEnded = false;
    this.victory = false;

    this.coreHp = this.levelConfig.coreHp || 20;

    this.wave = 0;
    this.waveInProgress = false;
    this.spawnQueue = [];
    this._autoWaveStarted = false;

    this.path = this.buildPath();
    this.placementGrid = this.buildPlacementGrid();
    this._placementGridSet = new Set(
      this.placementGrid.map((c) => `${c.x},${c.y}`)
    );
    this.nextPlacementIndex = 0;

    this.lastTime = 0;
    this.animationId = null;
    this.spawnTimerId = null;
    this.gameStarted = false;

    this.summonFlashTime = 0;
    this.summonFlashType = null;

    this.draggingTower = null;
    this.dragStartPos = null;
    this.dragCurrentPos = null;
    this.isDragging = false;
    this.dragThreshold = 5;

    this.hoveredCell = null;

    // 炮塔位置索引 Map，用于 O(1) 查询
    this._towerIndex = new Map();

    // 融合模态框事件处理器引用（用于清理）
    this._fusionModalHandler = null;

    // 键盘事件处理器引用
    this._keyboardHandler = null;

    // 事件监听器追踪数组，用于清理事件监听
    this._eventListeners = [];

    // 绑定UI事件处理方法（确保多次调用setupUI时防重复检查有效）
    this._boundSummonTower = this.summonTower.bind(this);
    this._boundStartWave = this.startWave.bind(this);
    this._boundReturnToLevelSelect = this.returnToLevelSelect.bind(this);
    this._boundShowFusionEncyclopedia = this.showFusionEncyclopedia.bind(this);

    this._uiEventsActive = false;
    this.setupUI();
    this.setupKeyboardShortcuts();
  }

  /**
   * 添加受追踪的事件监听器
   * @param {EventTarget} target - 事件目标
   * @param {string} type - 事件类型
   * @param {Function} listener - 事件监听器
   * @param {Object|boolean} options - 事件选项
   */
  addTrackedEventListener(target, type, listener, options) {
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
  }

  /**
   * 销毁游戏对象，清理所有事件监听器
   */
  destroy() {
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
    this._clearDragCache();
  }

  getDefaultLevelConfig() {
    return {
      id: 1,
      startGold: 300,
      summonCost: 80,
      maxWave: 3,
      maxAliveEnemies: 50,
      waves: [
        { type: "corpse", count: 30 },
        { type: "ghost", count: 30 },
        { type: "armor", count: 30 },
      ],
    };
  }

  buildPath() {
    const path = [];
    for (let x = 0; x < this.COLS; x++) path.push({ x, y: 0 });
    for (let y = 1; y < this.ROWS; y++) path.push({ x: this.COLS - 1, y });
    for (let x = this.COLS - 2; x >= 0; x--) path.push({ x, y: this.ROWS - 1 });
    for (let y = this.ROWS - 2; y >= 1; y--) path.push({ x: 0, y });
    path.push({ x: 0, y: 0 });
    return path;
  }

  buildPlacementGrid() {
    const grid = [];
    for (let x = 1; x < this.COLS - 1; x++) {
      for (let y = 1; y < this.ROWS - 1; y++) {
        grid.push({ x, y });
      }
    }
    return grid;
  }

  setupUI() {
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

    this.addTrackedEventListener(this.canvas, "touchstart", (e) => {
      e.preventDefault();
      if (this.gameEnded) return;
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const result = getGridFromEvent(touch, this.canvas);
      if (!result) return;

      const { gx, gy } = result;
      const tower = this.getTowerAt(gx, gy);
      if (tower) {
        this.draggingTower = tower;
        this.dragStartPos = { x: touch.clientX, y: touch.clientY };
        this.dragCurrentPos = { x: touch.clientX, y: touch.clientY };
        this.isDragging = false;
        this._cacheDragMetrics();
      }
    }, { passive: false });

    this.addTrackedEventListener(this.canvas, "touchmove", (e) => {
      e.preventDefault();
      // 多点触控时取消拖拽状态
      if (e.touches.length !== 1) {
        this.draggingTower = null;
        this.dragStartPos = null;
        this.dragCurrentPos = null;
        this.isDragging = false;
        this._clearDragCache();
        return;
      }
      if (this.draggingTower && !this.draggingTower.isFusion) {
        const touch = e.touches[0];
        this.dragCurrentPos = { x: touch.clientX, y: touch.clientY };
        const dist = calculateDragDistance(this.dragStartPos.x, this.dragStartPos.y, this.dragCurrentPos.x, this.dragCurrentPos.y);
        if (checkDragThreshold(dist, this.dragThreshold)) {
          this.isDragging = true;
        }
      }
    }, { passive: false });

    this.addTrackedEventListener(this.canvas, "touchend", (e) => {
      e.preventDefault();
      // 多点触控场景下，如果还有剩余触摸点，不处理拖拽结束
      if (e.touches.length > 0) {
        return;
      }
      if (this.draggingTower && this.isDragging) {
        if (e.changedTouches.length > 0) {
          const touch = e.changedTouches[0];
          const result = getGridFromEvent(touch, this.canvas);
          if (result) {
            const { gx, gy } = result;
            const targetTower = this.getTowerAt(gx, gy);
            if (targetTower && targetTower !== this.draggingTower) {
              this.attemptFusion(this.draggingTower, targetTower);
            } else if (this.canPlaceAt(gx, gy)) {
              this.moveTower(this.draggingTower, gx, gy);
            }
          }
        }
      } else if (this.draggingTower && !this.isDragging) {
        if (e.changedTouches.length > 0) {
          const touch = e.changedTouches[0];
          const result = getGridFromEvent(touch, this.canvas);
          if (result) {
            const { gx, gy } = result;
            const tower = this.getTowerAt(gx, gy);
            if (tower) {
              this.showTowerInfo(tower, touch.clientX, touch.clientY);
            } else {
              this.hideTowerInfo();
            }
          }
        }
      }

      this.draggingTower = null;
      this.dragStartPos = null;
      this.dragCurrentPos = null;
      this.isDragging = false;
      this._clearDragCache();
    }, { passive: false });

    // 触摸取消时清理拖拽状态（不需要阻止默认行为，使用 passive: true）
    this.addTrackedEventListener(this.canvas, "touchcancel", (e) => {
      this.draggingTower = null;
      this.dragStartPos = null;
      this.dragCurrentPos = null;
      this.isDragging = false;
      this._clearDragCache();
    }, { passive: true });

    this._uiEventsActive = true;
  }

  setupKeyboardShortcuts() {
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
  }

  cleanupKeyboardShortcuts() {
    // 键盘事件监听器现在由 _eventListeners 数组统一管理
    // 此方法保留用于兼容性，实际清理在 destroy() 中完成
    this._keyboardHandler = null;
  }

  canPlaceAt(gx, gy) {
    if (this._placementGridSet.has(`${gx},${gy}`)) {
      for (const t of this.towers) {
        if (t.gx === gx && t.gy === gy) return false;
      }
      return true;
    }
    return false;
  }

  moveTower(tower, gx, gy) {
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
  }

  getFusionType(type1, type2) {
    return fusionSystem.getFusionType(type1, type2);
  }

  canFuse(tower1, tower2) {
    const result = fusionSystem.canFuse(tower1.type, tower2.type, {
      tower1,
      tower2,
      gold: this.gold,
    });
    return result.canFuse;
  }

  fuseTowers(tower1, tower2) {
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
  }

  getFusionPreview(tower1, tower2) {
    return fusionSystem.getPreview(tower1.type, tower2.type, this.gold);
  }

  attemptFusion(tower1, tower2) {
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
  }

  // 清理融合模态框的事件监听器
  _cleanupFusionModalListeners() {
    const btnEl = document.getElementById("modal-btn");
    if (this._fusionModalHandler) {
      btnEl.removeEventListener("click", this._fusionModalHandler);
      this._fusionModalHandler = null;
    }
  }

  showTowerInfo(tower, x, y) {
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
    sellBtn.textContent = `出售 +${tower.getSellValue()}金`;
    sellBtn.onclick = () => {
      this.sellTower(tower);
      this.hideTowerInfo();
    };

    // 添加右键取消选择提示
    let rightClickHint = info.querySelector(".right-click-hint");
    if (!rightClickHint) {
      rightClickHint = document.createElement("div");
      rightClickHint.className = "right-click-hint";
      rightClickHint.style.cssText = "font-size:11px;color:#666;text-align:center;margin-top:8px;font-family:'ZCOOL XiaoWei',serif;";
      info.appendChild(rightClickHint);
    }
    rightClickHint.textContent = "右键取消选择";

    const upgradeBtn = info.querySelector(".upgrade-btn");
    if (tower.isFusion || tower.level >= tower.maxLevel) {
      upgradeBtn.textContent = tower.isFusion ? "融合不可升级" : "已满级";
      upgradeBtn.disabled = true;
    } else {
      upgradeBtn.textContent = `升级 ${tower.upgradeCost * tower.level}金`;
      upgradeBtn.disabled = this.gold < tower.upgradeCost * tower.level;
      upgradeBtn.onclick = () => {
        const upgraded = tower.upgrade();
        if (upgraded) {
          this.updateUI();
          this.showTowerInfo(tower, x, y);
        }
      };
    }

    // 使用游戏容器尺寸计算面板位置，避免页面缩放或键盘弹出导致计算错误
    const container = document.getElementById('game-container');
    const rect = container.getBoundingClientRect();
    const maxX = rect.width - 180;
    const maxY = rect.height - 150;
    info.style.left = Math.min(x, maxX) + "px";
    info.style.top = Math.min(y, maxY) + "px";
    info.classList.remove("hidden");

    tower.selected = true;
    for (const t of this.towers) {
      if (t !== tower) t.selected = false;
    }
  }

  hideTowerInfo() {
    const info = document.getElementById("conquest-tower-info");
    if (info) info.classList.add("hidden");
    for (const t of this.towers) {
      t.selected = false;
    }
  }

  summonTower() {
    if (this.gold < this.summonCost || this.gameEnded) {
      this.summonFlashTime = Date.now();
      this.summonFlashType = "fail";
      return;
    }

    const pos = this.getNextPlacementPosition();
    if (!pos) {
      this.summonFlashTime = Date.now();
      this.summonFlashType = "fail";
      return;
    }

    const towerTypes = ["fire", "water", "mountain", "wood", "gold", "earth", "xinZhongYan", "ruFengSiZhen"];
    const type = towerTypes[Math.floor(Math.random() * towerTypes.length)];

    this.gold -= this.summonCost;

    const tower = new Tower(type, pos.x, pos.y, this);
    if (tower.onPath) {
      tower.onPath = false;
    }
    this.towers.push(tower);
    this._towerIndex.set(`${tower.gx},${tower.gy}`, tower);

    const pixelPos = gridToPixel(pos.x, pos.y);
    this.particleSystem.createExplosion(pixelPos.x, pixelPos.y, 15, "#ffd700");

    this.summonFlashTime = Date.now();
    this.summonFlashType = "success";
    this.updateUI();
  }

  getNextPlacementPosition() {
    while (this.nextPlacementIndex < this.placementGrid.length) {
      const pos = this.placementGrid[this.nextPlacementIndex];
      this.nextPlacementIndex++;
      const occupied = this.towers.some((t) => t.gx === pos.x && t.gy === pos.y);
      if (!occupied) return pos;
    }
    return null;
  }

  startWave() {
    if (this.waveInProgress || this.gameEnded) return;
    if (this.wave >= this.maxWave) return;

    this.wave++;
    this.waveInProgress = true;

    // 标记已开始自动波次，禁用按钮
    this._autoWaveStarted = true;

    // 使用关卡配置中的波次配置
    const waves = this.levelConfig.waves || [
      { type: "corpse", count: 50 },
      { type: "ghost", count: 50 },
      { type: "armor", count: 50 },
    ];

    const config = waves[this.wave - 1];
    this.spawnQueue = [];
    for (let i = 0; i < config.count; i++) {
      this.spawnQueue.push({ type: config.type, delay: 800 });
    }

    this.spawnNextEnemy();
    this.updateUI();
  }

  spawnNextEnemy() {
    if (this.spawnQueue.length === 0) {
      this.checkWaveComplete();
      return;
    }

    const data = this.spawnQueue.shift();

    const startPos = this.path[0];
    const startPx = gridToPixel(startPos.x, startPos.y);
    const minSpawnDistance = this.CELL_SIZE * 1.5;

    const lastAliveEnemy = [...this.enemies].reverse().find((e) => !e.dead);
    if (lastAliveEnemy) {
      const dx = lastAliveEnemy.x - startPx.x;
      const dy = lastAliveEnemy.y - startPx.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minSpawnDistance) {
        this.spawnQueue.unshift(data);
        this.spawnTimerId = setTimeout(() => this.spawnNextEnemy(), 300);
        return;
      }
    }

    const enemy = new ConquestEnemy(data.type, this.path, this);
    this.enemies.push(enemy);

    const aliveCount = this.enemies.filter((e) => !e.dead).length;
    if (aliveCount >= this.maxAliveEnemies && !this.gameEnded) {
      this.gameOver(false);
      return;
    }

    if (this.spawnQueue.length > 0) {
      const nextDelay = this.spawnQueue[0].delay;
      this.spawnTimerId = setTimeout(() => this.spawnNextEnemy(), nextDelay);
    } else {
      this.checkWaveComplete();
    }
  }

  checkWaveComplete() {
    const aliveEnemies = this.enemies.filter((e) => !e.dead);
    if (aliveEnemies.length === 0 && this.spawnQueue.length === 0) {
      if (this.wave >= this.maxWave) {
        this.waveInProgress = false;
        this.updateUI();
        this.gameOver(true);
      } else {
        // 重置波次进行状态，允许开始下一波
        this.waveInProgress = false;
        // 自动开始下一波（间隔5秒）
        setTimeout(() => this.startWave(), 5000);
      }
    }
  }

  gameOver(victory) {
    this.gameEnded = true;
    this.victory = victory;

    if (victory) {
      // 标记当前关卡已完成
      if (typeof conquestProgress !== "undefined" && conquestProgress.markLevelCompleted) {
        conquestProgress.markLevelCompleted(this.currentLevelId);
      }

      const nextLevelId = this.getNextLevelId();
      if (nextLevelId) {
        // 有下一关，显示下一关按钮和返回关卡列表按钮
        this.showVictoryModalWithNextLevel(nextLevelId);
      } else {
        // 没有下一关，显示通关所有关卡
        this.showModal("胜利!", "恭喜! 你已通关所有征服关卡!", "关卡列表", () => this.returnToLevelSelect());
      }
    } else {
      this.showModal("失败", "场上怪物过多，防线崩溃...", "关卡列表", () => this.returnToLevelSelect());
    }
  }

  showVictoryModalWithNextLevel(nextLevelId) {
    const modal = document.getElementById("modal");
    const titleEl = document.getElementById("modal-title");
    const textEl = document.getElementById("modal-text");
    const btnEl = document.getElementById("modal-btn");

    titleEl.textContent = "胜利!";
    textEl.textContent = `关卡 ${this.currentLevelId} 完成! 所有波次已清除!`;
    btnEl.textContent = "下一关";
    btnEl.disabled = false;
    modal.classList.remove("hidden");

    // 创建返回关卡列表按钮
    let returnBtn = document.getElementById("modal-return-btn");
    if (!returnBtn) {
      returnBtn = document.createElement("button");
      returnBtn.id = "modal-return-btn";
      returnBtn.className = "ink-button secondary";
      btnEl.parentNode.insertBefore(returnBtn, btnEl.nextSibling);
    }
    returnBtn.textContent = "关卡列表";
    returnBtn.style.display = "inline-block";

    btnEl.onclick = () => {
      modal.classList.add("hidden");
      returnBtn.style.display = "none";
      this.startLevel(nextLevelId);
    };

    returnBtn.onclick = () => {
      modal.classList.add("hidden");
      returnBtn.style.display = "none";
      this.returnToLevelSelect();
    };
  }

  showModal(title, text, buttonText, onClick) {
    const modal = document.getElementById("modal");
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-text").textContent = text;
    document.getElementById("modal-btn").textContent = buttonText;
    modal.classList.remove("hidden");

    document.getElementById("modal-btn").onclick = () => {
      modal.classList.add("hidden");
      if (onClick) onClick();
    };
  }

  updateUI() {
    document.getElementById("conquest-gold").textContent = this.gold;
    document.getElementById("conquest-wave").textContent = `${this.wave}/${this.maxWave}`;

    const aliveCount = this.enemies.filter((e) => !e.dead).length;
    document.getElementById("conquest-enemies").textContent = aliveCount;

    const coreHpEl = document.getElementById("conquest-core-hp");
    if (coreHpEl) coreHpEl.textContent = this.coreHp;

    const summonBtn = document.getElementById("conquest-summon-btn");
    if (summonBtn) summonBtn.disabled = this.gold < this.summonCost || this.gameEnded;

    const waveBtn = document.getElementById("conquest-wave-btn");
    if (waveBtn) {
      waveBtn.disabled = this.waveInProgress || this.wave >= this.maxWave || this.gameEnded || this._autoWaveStarted;
      if (this.wave >= this.maxWave) {
        waveBtn.textContent = "通关";
      } else if (this._autoWaveStarted) {
        waveBtn.textContent = "进行中";
      } else {
        waveBtn.textContent = "开始波次";
      }
    }
  }

  start() {
    this.gameStarted = true;
    this.updateUI();

    // 确保键盘快捷键已设置
    if (!this._keyboardHandler) {
      this.setupKeyboardShortcuts();
    }

    const gameLoop = (timestamp) => {
      this.update(timestamp);
      this.draw();
      this.animationId = requestAnimationFrame(gameLoop);
    };

    this.animationId = requestAnimationFrame(gameLoop);
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.gameStarted = false;
    this.cleanupKeyboardShortcuts();
  }

  update(now) {
    if (this.gameEnded) return;

    if (this.lastTime <= 0) {
      this.lastTime = now;
      return;
    }

    const deltaTime = Math.min(now - this.lastTime, 50);
    this.lastTime = now;

    for (const tower of this.towers) {
      tower.update(now, deltaTime, this.enemies);
      tower.updateProjectiles(deltaTime);
    }

    for (const enemy of this.enemies) {
      enemy.update(now, deltaTime);
    }

    this.enemies = this.enemies.filter((e) => !e.dead);

    const aliveCount = this.enemies.filter((e) => !e.dead).length;
    if (aliveCount >= this.maxAliveEnemies && !this.gameEnded) {
      this.gameOver(false);
    }

    if (this.waveInProgress) {
      this.checkWaveComplete();
    }

    this.particleSystem.update(deltaTime);
  }

  draw() {
    const gridHeight = this.ROWS * this.CELL_SIZE;
    this.ctx.fillStyle = CONFIG.COLORS.bg;
    this.ctx.fillRect(0, 0, this.canvas.width, gridHeight);

    this.inkRenderer.drawDistantMountains(gridHeight);
    this.drawGrid();
    this.drawPath();
    this.drawPlacementArea();
    this.drawDragPlacementPreview();

    const timestamp = performance.now();
    for (const tower of this.towers) {
      if (this.isDragging && tower === this.draggingTower) continue;
      tower.draw(this.ctx, timestamp);
    }

    for (const enemy of this.enemies) {
      enemy.draw(this.ctx, this.inkRenderer);
    }

    this.particleSystem.draw(this.ctx);
    this.drawInfo();
    this.drawSummonFlash();
    this.drawDragPreview();
  }

  drawGrid() {
    this.ctx.strokeStyle = CONFIG.COLORS.grid;
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= this.COLS; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * this.CELL_SIZE, 0);
      this.ctx.lineTo(x * this.CELL_SIZE, this.ROWS * this.CELL_SIZE);
      this.ctx.stroke();
    }

    for (let y = 0; y <= this.ROWS; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * this.CELL_SIZE);
      this.ctx.lineTo(this.COLS * this.CELL_SIZE, y * this.CELL_SIZE);
      this.ctx.stroke();
    }
  }

  drawPath() {
    this.ctx.strokeStyle = CONFIG.COLORS.pathLine;
    this.ctx.lineWidth = this.CELL_SIZE - 4;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";

    this.ctx.beginPath();
    for (let i = 0; i < this.path.length; i++) {
      const pos = gridToPixel(this.path[i].x, this.path[i].y);
      if (i === 0) {
        this.ctx.moveTo(pos.x, pos.y);
      } else {
        this.ctx.lineTo(pos.x, pos.y);
      }
    }
    this.ctx.stroke();

    this.ctx.fillStyle = "#666";
    this.ctx.font = "12px Microsoft YaHei";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";


  }

  drawPlacementArea() {
    for (let x = 1; x < this.COLS - 1; x++) {
      for (let y = 1; y < this.ROWS - 1; y++) {
        const occupied = this.towers.some((t) => t.gx === x && t.gy === y);
        if (!occupied) {
          this.ctx.fillStyle = CONFIG.COLORS.bg;
          this.ctx.fillRect(
            x * this.CELL_SIZE + 1,
            y * this.CELL_SIZE + 1,
            this.CELL_SIZE - 2,
            this.CELL_SIZE - 2
          );
        }
      }
    }
  }

  drawDragPlacementPreview() {
    if (!this.isDragging || !this.draggingTower || !this.hoveredCell) return;

    const { gx, gy } = this.hoveredCell;
    const targetTower = this.getTowerAt(gx, gy);

    if (targetTower && targetTower !== this.draggingTower) {
      const preview = this.getFusionPreview(this.draggingTower, targetTower);
      if (preview) {
        this.ctx.fillStyle = "rgba(196, 92, 72, 0.3)";
        this.ctx.fillRect(
          gx * this.CELL_SIZE,
          gy * this.CELL_SIZE,
          this.CELL_SIZE,
          this.CELL_SIZE
        );

        this.ctx.fillStyle = preview.color || "#c45c48";
        this.ctx.font = 'bold 16px "Ma Shan Zheng", cursive';
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        const pos = gridToPixel(gx, gy);
        this.ctx.fillText(preview.char, pos.x, pos.y);
      } else {
        this.ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
        this.ctx.fillRect(
          gx * this.CELL_SIZE,
          gy * this.CELL_SIZE,
          this.CELL_SIZE,
          this.CELL_SIZE
        );
      }
    } else if (this.canPlaceAt(gx, gy)) {
      this.ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
      this.ctx.fillRect(
        gx * this.CELL_SIZE,
        gy * this.CELL_SIZE,
        this.CELL_SIZE,
        this.CELL_SIZE
      );
    }
  }

  drawDragPreview() {
    if (!this.isDragging || !this.draggingTower) return;

    // 使用缓存的 rect 和比例计算，避免每帧重新计算
    const x = (this.dragCurrentPos.x - this._dragRectLeft) * this._dragScaleX;
    const y = (this.dragCurrentPos.y - this._dragRectTop) * this._dragScaleY;

    const rangeInPixels = this.draggingTower.range * this.CELL_SIZE;
    this.ctx.beginPath();
    this.ctx.arc(x, y, rangeInPixels, 0, Math.PI * 2);
    this.ctx.strokeStyle = "rgba(255, 255, 0, 0.3)";
    this.ctx.stroke();
    this.ctx.fillStyle = "rgba(255, 255, 0, 0.1)";
    this.ctx.fill();

    this.ctx.save();
    this.ctx.globalAlpha = 0.6;
    this.ctx.font = "bold 28px Microsoft YaHei";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = this.draggingTower.isFusion ? "#888" : "#ffff00";
    this.ctx.fillText(this.draggingTower.char, x, y);
    this.ctx.restore();
  }

  // 缓存拖拽所需的 canvas 尺寸信息
  _cacheDragMetrics() {
    const rect = this.canvas.getBoundingClientRect();
    this._dragRectLeft = rect.left;
    this._dragRectTop = rect.top;
    this._dragScaleX = 1 / (rect.width / this.canvas.width);
    this._dragScaleY = 1 / (rect.height / this.canvas.height);
  }

  // 清理拖拽缓存
  _clearDragCache() {
    this._dragRectLeft = null;
    this._dragRectTop = null;
    this._dragScaleX = null;
    this._dragScaleY = null;
  }

  drawInfo() {
    this.ctx.fillStyle = "#888";
    this.ctx.font = '14px "Ma Shan Zheng", cursive';
    this.ctx.textAlign = "left";
    this.ctx.fillText("征服模式", 10, 20);

    const aliveCount = this.enemies.filter((e) => !e.dead).length;
    const dangerRatio = aliveCount / this.maxAliveEnemies;
    if (dangerRatio > 0.6) {
      const alpha = 0.3 + 0.3 * Math.sin(Date.now() / 300);
      this.ctx.fillStyle = `rgba(196, 92, 72, ${alpha})`;
      this.ctx.font = '12px "ZCOOL XiaoWei", serif';
      this.ctx.textAlign = "right";
      this.ctx.fillText(`危险: ${aliveCount}/${this.maxAliveEnemies}`, this.canvas.width - 10, 20);
    }

    // 绘制快捷键提示
    this.drawKeyboardShortcutsHint();
  }

  drawKeyboardShortcutsHint() {
    const hints = [];

    const startX = this.canvas.width - 10;
    const startY = this.canvas.height - 10;
    const lineHeight = 16;

    this.ctx.textAlign = "right";
    this.ctx.textBaseline = "bottom";

    hints.forEach((hint, index) => {
      const y = startY - (hints.length - 1 - index) * lineHeight;

      // 绘制按键背景（淡墨风格）
      const keyText = hint.key;
      this.ctx.font = '11px "ZCOOL XiaoWei", serif';
      const keyWidth = this.ctx.measureText(keyText).width + 8;

      // 按键背景 - 淡墨色
      this.ctx.fillStyle = "rgba(100, 100, 100, 0.3)";
      this.ctx.fillRect(startX - keyWidth, y - 10, keyWidth, 14);

      // 按键文字 - 淡墨色
      this.ctx.fillStyle = "rgba(150, 150, 150, 0.8)";
      this.ctx.fillText(keyText, startX - 4, y);

      // 分隔符
      this.ctx.fillStyle = "rgba(150, 150, 150, 0.5)";
      this.ctx.fillText(":", startX + 2, y);

      // 功能说明 - 更淡的墨色
      this.ctx.fillStyle = "rgba(120, 120, 120, 0.7)";
      this.ctx.fillText(hint.action, startX + 22, y);
    });
  }

  drawSummonFlash() {
    if (!this.summonFlashTime) return;
    const elapsed = Date.now() - this.summonFlashTime;
    if (elapsed > 400) {
      this.summonFlashTime = 0;
      return;
    }

    const alpha = 0.3 * (1 - elapsed / 400);
    if (this.summonFlashType === "success") {
      this.ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
    } else {
      this.ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
    }
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  showFusionEncyclopedia() {
    if (window.gameInstance && window.gameInstance.ui) {
      window.gameInstance.ui.showGameFusionEncyclopedia();
    }
  }

  returnToMenu() {
    // 清理 spawn 定时器
    if (this.spawnTimerId) {
      clearTimeout(this.spawnTimerId);
      this.spawnTimerId = null;
    }

    // 调用 destroy 清理所有事件监听器和资源
    this.destroy();

    document.getElementById("conquest-container").classList.add("hidden");
    document.getElementById("main-menu").classList.remove("hidden");

    if (window.gameInstance && window.gameInstance.menuInkBg) {
      window.gameInstance.menuInkBg.start();
    }

    this.towers = [];
    this.enemies = [];
    this.spawnQueue = [];
    this.gameEnded = false;
    this.victory = false;
    this.waveInProgress = false;
    this._autoWaveStarted = false;
  }

  // 根据关卡ID启动对应关卡
  startLevel(levelId) {
    // 清理旧的 spawn 定时器
    if (this.spawnTimerId) {
      clearTimeout(this.spawnTimerId);
      this.spawnTimerId = null;
    }

    // 获取关卡配置
    let levelConfig = null;
    if (typeof conquestProgress !== "undefined" && conquestProgress.getLevelConfig) {
      levelConfig = conquestProgress.getLevelConfig(levelId);
    }

    if (!levelConfig) {
      console.error(`关卡 ${levelId} 配置不存在`);
      return;
    }

    // 停止菜单背景动画
    if (window.gameInstance && window.gameInstance.menuInkBg) {
      window.gameInstance.menuInkBg.stop();
    }

    // 重置游戏状态
    this.stop();
    this.towers = [];
    this.enemies = [];
    this.spawnQueue = [];
    this.gameEnded = false;
    this.victory = false;
    this.waveInProgress = false;
    this._autoWaveStarted = false;

    // 更新关卡配置
    this.levelConfig = levelConfig;
    this.currentLevelId = levelId;

    // 使用新配置初始化
    this.gold = this.levelConfig.startGold || 300;
    this.summonCost = this.levelConfig.summonCost || 80;
    this.maxWave = this.levelConfig.maxWave || 3;
    this.maxAliveEnemies = this.levelConfig.maxAliveEnemies || 50;
    this.coreHp = this.levelConfig.coreHp || 20;
    this.wave = 0;
    this.nextPlacementIndex = 0;

    // 重新初始化放置网格
    this.placementGrid = this.buildPlacementGrid();
    this._placementGridSet = new Set(
      this.placementGrid.map((c) => `${c.x},${c.y}`)
    );

    // 重新设置UI事件监听（如果之前被destroy清理过）
    if (!this._uiEventsActive) {
      this.setupUI();
      this.setupKeyboardShortcuts();
    }

    // 显示征服模式容器
    document.getElementById("conquest-container").classList.remove("hidden");

    // 更新UI并启动游戏
    this.updateUI();
    this.start();
  }

  // 获取下一关卡ID
  getNextLevelId() {
    // 优先使用 conquestProgress 的方法
    if (typeof conquestProgress !== "undefined" && conquestProgress.getNextLevelId) {
      return conquestProgress.getNextLevelId(this.currentLevelId);
    }

    // 默认逻辑：正确解析 "主题-关卡" 格式
    const [theme, level] = String(this.currentLevelId).split('-').map(Number);

    // 假设每个主题5关
    const levelsPerTheme = 5;
    const totalThemes = 5;

    if (level < levelsPerTheme) {
      // 同一主题下一关
      return `${theme}-${level + 1}`;
    } else if (theme < totalThemes) {
      // 下一个主题第一关
      return `${theme + 1}-1`;
    }

    // 已经是最后一关
    return null;
  }

  // 返回关卡选择界面
  returnToLevelSelect() {
    // 清理 spawn 定时器
    if (this.spawnTimerId) {
      clearTimeout(this.spawnTimerId);
      this.spawnTimerId = null;
    }

    // 调用 destroy 清理所有事件监听器和资源
    this.destroy();

    // 隐藏征服模式容器
    document.getElementById("conquest-container").classList.add("hidden");

    // 显示主菜单容器（征服模式关卡选择界面嵌套在 main-menu 内）
    document.getElementById("main-menu").classList.remove("hidden");

    // 显示征服模式关卡选择界面（如果存在）
    const conquestLevelSelect = document.getElementById("conquest-level-select-container");
    if (conquestLevelSelect) {
      conquestLevelSelect.classList.remove("hidden");
      // 刷新关卡选择UI以显示最新进度
      if (window.gameInstance && window.gameInstance.ui) {
        const themeId = this.currentLevelId ? parseInt(this.currentLevelId.split('-')[0]) : 1;
        window.gameInstance.ui.showConquestLevelSelect(themeId);
      }
    }

    // 恢复主菜单背景
    if (window.gameInstance && window.gameInstance.menuInkBg) {
      window.gameInstance.menuInkBg.start();
    }

    // 重置游戏状态
    this.towers = [];
    this.enemies = [];
    this.spawnQueue = [];
    this.gameEnded = false;
    this.victory = false;
    this.waveInProgress = false;
    this._autoWaveStarted = false;
  }

  startGame() {
    document.getElementById("conquest-container").classList.remove("hidden");
    document.getElementById("main-menu").classList.add("hidden");

    if (window.gameInstance && window.gameInstance.menuInkBg) {
      window.gameInstance.menuInkBg.stop();
    }

    this.gold = 300;
    this.towers = [];
    this.enemies = [];
    this.wave = 0;
    this.waveInProgress = false;
    this.spawnQueue = [];
    this.gameEnded = false;
    this.victory = false;
    this.nextPlacementIndex = 0;

    if (!this._uiEventsActive) {
      this.setupUI();
      this.setupKeyboardShortcuts();
    }

    this.start();
  }

  getTowerAt(gx, gy) {
    return this._towerIndex.get(`${gx},${gy}`);
  }

  _updateTowerIndex() {
    this._towerIndex.clear();
    for (const tower of this.towers) {
      const key = `${tower.gx},${tower.gy}`;
      this._towerIndex.set(key, tower);
    }
  }

  removeTower(tower) {
    const index = this.towers.indexOf(tower);
    if (index > -1) {
      this.towers.splice(index, 1);
      this._towerIndex.delete(`${tower.gx},${tower.gy}`);
    }
  }

  sellTower(tower) {
    this.gold += tower.getSellValue();
    this.removeTower(tower);
    this.updateUI();
  }

  triggerExplosion(x, y, damage, range) {
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const dx = enemy.x - x;
      const dy = enemy.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= range * CONFIG.CELL_SIZE) {
        enemy.takeDamage(damage);
      }
    }
    this.particleSystem.createExplosion(x, y, damage * 5, "#ff6644");
  }

  spawnSplitEnemy(parent) {
    for (let i = 0; i < parent.splitCount; i++) {
      const enemy = new ConquestEnemy("corpse", this.path, this);
      enemy.char = "小";
      enemy.maxHp = parent.splitHp;
      enemy.hp = parent.splitHp;
      enemy.reward = Math.floor(parent.reward / 3);
      enemy.x = parent.x + (i === 0 ? -15 : 15);
      enemy.y = parent.y;
      this.enemies.push(enemy);
    }
  }
}

let conquestGame = null;
window.addEventListener("load", () => {
  conquestGame = new ConquestGame();
  window.conquestGame = conquestGame;

  // 注意：征服模式按钮的事件监听器在 ui.js 中设置
  // 这里不再重复添加，以避免覆盖主题选择界面
});
