// ConquestGame：征服模式绘制
ConquestGame.prototype.start = function() {
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
  
};
ConquestGame.prototype.stop = function() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.gameStarted = false;
    this.cleanupKeyboardShortcuts();
  
};
ConquestGame.prototype.update = function(now) {
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
  
};
ConquestGame.prototype.draw = function() {
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
  
};
ConquestGame.prototype.drawGrid = function() {
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
  
};
ConquestGame.prototype.drawPath = function() {
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

    this.ctx.fillStyle = "#6a6459";
    this.ctx.font = "12px Microsoft YaHei";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";


  
};
ConquestGame.prototype.drawPlacementArea = function() {
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
  
};
ConquestGame.prototype.drawDragPlacementPreview = function() {
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

    // 显式描出"松手会落在哪一格"：触摸端没有光标，色块本身不够醒目
    this.ctx.save();
    this.ctx.strokeStyle = "rgba(255, 215, 0, 0.85)";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      gx * this.CELL_SIZE,
      gy * this.CELL_SIZE,
      this.CELL_SIZE,
      this.CELL_SIZE
    );
    this.ctx.restore();
  
};
ConquestGame.prototype.drawDragPreview = function() {
    if (!this.isDragging || !this.draggingTower) return;

    // 使用缓存的 rect 和比例计算，避免每帧重新计算
    const x = (this.dragCurrentPos.x - this._dragRectLeft) * this._dragScaleX;
    const y = (this.dragCurrentPos.y - this._dragRectTop) * this._dragScaleY;

    // 触摸端：手指压在触点上，把幽灵塔与射程圈整体上移，
    // 否则玩家既看不到被拖的塔，也看不到它下方即将命中的目标格
    const lift = this._dragSource === "touch" ? this.CELL_SIZE * 0.8 : 0;
    const drawY = y - lift;

    const rangeInPixels = this.draggingTower.range * this.CELL_SIZE;
    this.ctx.beginPath();
    this.ctx.arc(x, drawY, rangeInPixels, 0, Math.PI * 2);
    this.ctx.strokeStyle = "rgba(176, 58, 46, 0.35)";
    this.ctx.stroke();
    this.ctx.fillStyle = "rgba(176, 58, 46, 0.1)";
    this.ctx.fill();

    this.ctx.save();
    this.ctx.globalAlpha = 0.6;
    this.ctx.font = `bold 28px ${CONFIG.FONTS.BRUSH}`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = this.draggingTower.isFusion ? "#6a6459" : "#ffff00";
    this.ctx.fillText(this.draggingTower.char, x, drawY);
    this.ctx.restore();
  
};
// 缓存拖拽所需的 canvas 尺寸信息
ConquestGame.prototype._cacheDragMetrics = function() {
    const rect = this.canvas.getBoundingClientRect();
    this._dragRectLeft = rect.left;
    this._dragRectTop = rect.top;
    this._dragScaleX = 1 / (rect.width / this.canvas.width);
    this._dragScaleY = 1 / (rect.height / this.canvas.height);
  
};
// 清理拖拽缓存
ConquestGame.prototype._clearDragCache = function() {
    this._dragRectLeft = null;
    this._dragRectTop = null;
    this._dragScaleX = null;
    this._dragScaleY = null;
  
};
ConquestGame.prototype.drawInfo = function() {
    this.ctx.fillStyle = "#6a6459";
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
  
};
ConquestGame.prototype.drawKeyboardShortcutsHint = function() {
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
  
};
ConquestGame.prototype.drawSummonFlash = function() {
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
  
};
