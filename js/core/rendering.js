// Game：普通模式绘制和 HUD
Game.prototype.updateUI = function() {
    document.getElementById("ink").textContent = this.ink;
    document.getElementById("wave").textContent =
      `${this.wave}/${this.maxWave}`;
    this.runtimeIndexes.rebuildEnemies();
    const remainingEnemies = this.spawnQueue.length + this.runtimeIndexes.aliveEnemies.length;
    document.getElementById("enemies").textContent = remainingEnemies;
    document.getElementById("core-hp").textContent =
      `${this.coreHp}/${this.maxCoreHp}`;
    document.querySelector('#top-bar .core-stat').classList.toggle('critical', this.coreHp <= this.maxCoreHp * 0.3);

    const waveBtn = document.getElementById("start-wave");
    waveBtn.disabled =
      this.waveInProgress || this.wave >= this.maxWave || this.gameEnded;
    waveBtn.textContent = this.wave >= this.maxWave ? "通关" : "开始波次";

    // 塔卡的"墨水不足"状态必须随墨水实时刷新，
    // 否则玩家攒够钱后卡仍是灰的、点击无响应（移动端表现为"点了没反应"）
    if (this.ui && this.ui.refreshTowerSelectAffordability) {
      this.ui.refreshTowerSelectAffordability();
    }
  
};
Game.prototype.update = function(now) {
    if (this.gameEnded) return;

    if (this.isPaused) return;

    if (this.paused) {
      this.lastTime = now;
      return;
    }

    // 计算 deltaTime（毫秒），限制最大值为 50ms 防止卡顿时游戏跳变
    const deltaTime = Math.min(now - this.lastTime, 50);
    this.lastTime = now;

    this.inkTrailAnimation.update();

    for (const tower of this.towers) {
      tower.update(now, deltaTime, this.runtimeIndexes.aliveEnemies);
      tower.updateProjectiles(deltaTime);
    }

    this.updateAuras();
    this.updateGlobalSlow();
    this.updateSpecialTowers();

    for (const enemy of this.enemies) {
      enemy.update(now, deltaTime);
    }

    this.enemies = this.enemies.filter((e) => !e.dead);
    this.runtimeIndexes.rebuildTowers();
    if (this.enemies.length !== this._lastEnemyCount) {
      this.runtimeIndexes.rebuildEnemies();
      this._lastEnemyCount = this.enemies.length;
    }

    if (this.waveInProgress) {
      this.checkWaveComplete();
    }

    this.particleSystem.update(deltaTime);
    this.debugStats.update(now);

    // 定期更新 UI（每 10 帧一次）
    this.uiUpdateCounter++;
    if (this.uiUpdateCounter >= this.uiUpdateInterval) {
      this.uiUpdateCounter = 0;
      this.updateUI();
    }
  
};
Game.prototype.draw = function() {
    this.staticLayer.draw(this.ctx);
    this.drawPlacementPreview();

    const timestamp = performance.now();
    for (const tower of this.towers) {
      tower.draw(this.ctx, timestamp);
    }

    for (const enemy of this.enemies) {
      enemy.draw(this.ctx, this.inkRenderer);
    }

    this.particleSystem.draw(this.ctx);

    this.inkTrailAnimation.draw(this.ctx);

    this.ui.drawDragPreview(this.ctx);

    this.debugStats.draw(this.ctx);
  
};
Game.prototype.drawGrid = function() {
    this.ctx.strokeStyle = CONFIG.COLORS.grid;
    this.ctx.lineWidth = 1;

    const gridHeight = CONFIG.GRID_ROWS * CONFIG.CELL_SIZE;

    for (let x = 0; x <= CONFIG.GRID_COLS; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * CONFIG.CELL_SIZE, 0);
      this.ctx.lineTo(x * CONFIG.CELL_SIZE, gridHeight);
      this.ctx.stroke();
    }

    for (let y = 0; y <= CONFIG.GRID_ROWS; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * CONFIG.CELL_SIZE);
      this.ctx.lineTo(this.canvas.width, y * CONFIG.CELL_SIZE);
      this.ctx.stroke();
    }
  
};
Game.prototype.drawPath = function() {
    const paths = Array.isArray(this.path[0]) ? this.path : [this.path];

    for (const path of paths) {
      this.ctx.strokeStyle = CONFIG.COLORS.pathLine;
      this.ctx.lineWidth = CONFIG.CELL_SIZE - 4;
      this.ctx.lineCap = "round";
      this.ctx.lineJoin = "round";

      this.ctx.beginPath();
      for (let i = 0; i < path.length; i++) {
        const pos = gridToPixel(path[i].x, path[i].y);
        if (i === 0) {
          this.ctx.moveTo(pos.x, pos.y);
        } else {
          this.ctx.lineTo(pos.x, pos.y);
        }
      }
      this.ctx.stroke();

      this.ctx.fillStyle = "#6a6459";
      this.ctx.font = "12px Microsoft YaHei";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";

      const start = gridToPixel(path[0].x, path[0].y);
      this.ctx.fillText("入口", start.x, start.y - 25);
    }
  
};
Game.prototype.drawCore = function() {
    if (!this.core) return;

    const pos = gridToPixel(this.core.x, this.core.y);

    this.inkRenderer.drawInkWash(pos.x, pos.y + 15, 35, '#1c1a17', 0.4);

    const size = 22;
    const height = 16;
    const isoAngle = 0.5;

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    this.ctx.beginPath();
    this.ctx.ellipse(
      pos.x,
      pos.y + height + 6,
      size * 0.8,
      size * 0.4,
      0,
      0,
      Math.PI * 2,
    );
    this.ctx.fill();

    this.ctx.fillStyle = CONFIG.COLORS.coreInner;
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x - size, pos.y + height);
    this.ctx.lineTo(pos.x, pos.y + height + height * isoAngle);
    this.ctx.lineTo(pos.x + size, pos.y + height);
    this.ctx.lineTo(pos.x, pos.y + height - height * isoAngle);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = "#8b3a2f";
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x + size, pos.y + height);
    this.ctx.lineTo(pos.x, pos.y + height + height * isoAngle);
    this.ctx.lineTo(pos.x, pos.y + height * isoAngle);
    this.ctx.lineTo(pos.x + size, pos.y);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = "#8b3a2f";
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x - size, pos.y + height);
    this.ctx.lineTo(pos.x, pos.y + height * isoAngle);
    this.ctx.lineTo(pos.x, pos.y - height * isoAngle);
    this.ctx.lineTo(pos.x - size, pos.y);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = CONFIG.COLORS.core;
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x - size, pos.y);
    this.ctx.lineTo(pos.x, pos.y - height * isoAngle);
    this.ctx.lineTo(pos.x + size, pos.y);
    this.ctx.lineTo(pos.x, pos.y + height * isoAngle);
    this.ctx.closePath();
    this.ctx.fill();

    this.inkRenderer.drawInkText("★", pos.x, pos.y - 2, 28, "#f4efe4", true);

    this.ctx.font = '12px "ZCOOL XiaoWei", serif';
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "#c45c48";
    this.ctx.fillText("·核心·", pos.x, pos.y + height + 22);
  
};
Game.prototype.drawPlacementPreview = function() {
    if (!this.ui.selectedTowerType || !this.ui.hoveredCell) return;

    const { gx, gy } = this.ui.hoveredCell;
    const canPlace = this.canPlaceTower(this.ui.selectedTowerType, gx, gy);

    this.ctx.fillStyle = canPlace
      ? "rgba(0, 255, 0, 0.3)"
      : "rgba(255, 0, 0, 0.3)";
    this.ctx.fillRect(
      gx * CONFIG.CELL_SIZE,
      gy * CONFIG.CELL_SIZE,
      CONFIG.CELL_SIZE,
      CONFIG.CELL_SIZE,
    );

    // 触摸端单格渲染后仅约 31px，纯填充色对比度不足以确认落点，
    // 补一圈描边让"松手会放在哪"一目了然
    this.ctx.strokeStyle = canPlace
      ? "rgba(120, 255, 120, 0.9)"
      : "rgba(255, 90, 90, 0.9)";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      gx * CONFIG.CELL_SIZE + 1,
      gy * CONFIG.CELL_SIZE + 1,
      CONFIG.CELL_SIZE - 2,
      CONFIG.CELL_SIZE - 2,
    );
    this.ctx.lineWidth = 1;

    if (canPlace) {
      const config = CONFIG.TOWERS[this.ui.selectedTowerType];
      const pos = gridToPixel(gx, gy);

      this.ctx.beginPath();
      this.ctx.arc(
        pos.x,
        pos.y,
        config.range * CONFIG.CELL_SIZE,
        0,
        Math.PI * 2,
      );
      this.ctx.strokeStyle = "rgba(176, 58, 46, 0.5)";
      this.ctx.stroke();
    }
  
};
Game.prototype.drawLevelInfo = function() {
    const level = this.currentLevelData;

    this.ctx.fillStyle = "#6a6459";
    this.ctx.font = "14px Microsoft YaHei";
    this.ctx.textAlign = "left";
    this.ctx.fillText(
      `第${this.currentLevel}关: ${level ? level.name : ""}`,
      10,
      20,
    );
  
};
