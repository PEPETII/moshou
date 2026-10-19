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
    GlyphSystem.release();
    this.cleanupKeyboardShortcuts();
  
};
ConquestGame.prototype.update = function(now) {
    // 镜头独立于结算：结算画面里也能左右查看
    if (this.camera) this.camera.update(now);

    if (this.gameEnded) return;

    if (this.lastTime <= 0) {
      this.lastTime = now;
      return;
    }

    // 顿帧（打击反馈）：命中停顿时游戏时间 × 0.06
    const deltaTime = GlyphSystem.scaleFrame(Math.min(now - this.lastTime, 50));
    this.lastTime = now;

    // 全局大招间隔倒计时（字形塔的大招自动释放，见 GlyphSystem）
    GlyphSystem.tick(this, deltaTime / 1000);

    // 连续刷怪与坚守计时（工单 04）
    this.updateSpawner(deltaTime / 1000);

    for (const tower of this.towers) {
      tower.update(now, deltaTime, this.enemies);
      tower.updateProjectiles(deltaTime);
    }

    for (const enemy of this.enemies) {
      enemy.update(now, deltaTime);
    }

    this.enemies = this.enemies.filter((e) => !e.dead);

    // 字形弹道与特效：塔本帧发出的弹道在敌人移动之后推进
    GlyphSystem.update(this, deltaTime / 1000);

    // 失败线：场上存活数达到 dangerLimit
    if (this.battleActive && !this.gameEnded && this.aliveEnemyCount() >= this.dangerLimit) {
      this.gameOver(false);
    }

    // HUD 数字每 10 帧刷新一次，避免每帧写 DOM
    this._uiTick = (this._uiTick || 0) + 1;
    if (this._uiTick >= 10) {
      this._uiTick = 0;
      this.updateUI();
    }

    this.particleSystem.update(deltaTime);
  
};
ConquestGame.prototype.draw = function() {
    const ctx = this.ctx;
    const cam = this.camera;
    const gridHeight = this.ROWS * this.CELL_SIZE;
    const worldW = this.COLS * this.CELL_SIZE;

    // 世界层：随镜头平移
    ctx.save();
    const shk = GlyphSystem.shakeOffset(this);
    ctx.translate(-(cam ? Math.round(cam.x) : 0) + shk.x, shk.y);

    ctx.fillStyle = CONFIG.COLORS.bg;
    ctx.fillRect(0, 0, worldW, gridHeight);

    this.inkRenderer.drawDistantMountains(gridHeight, worldW);
    this.drawGrid();
    this.drawPath();
    this.drawPlacementArea();
    GlyphSystem.drawStain(ctx);
    this.drawDragPlacementPreview();

    // 绘制顺序：地面效果（焚后火字）→ 敌人 → 塔 → 弹道与大招 → 粒子
    GlyphSystem.drawGround(ctx, this);

    for (const enemy of this.enemies) {
      enemy.draw(ctx, this.inkRenderer);
    }

    const timestamp = performance.now();
    for (const tower of this.towers) {
      if (this.isDragging && tower === this.draggingTower) continue;
      tower.draw(ctx, timestamp);
    }

    GlyphSystem.drawShots(ctx, this);
    this.particleSystem.draw(ctx);
    GlyphSystem.drawFX(ctx);
    this.drawDragPreview();

    ctx.restore();

    // HUD 层：不随镜头平移
    this.drawInfo();
    GlyphSystem.drawHud(ctx);
    this.drawSummonFlash();
    if (cam) cam.drawHints(ctx);
  
};
// 征服模式的棋盘是"格位分区"本身（空场时唯一的分格依据就是网格线），
// 且该模式没有"从塔卡放置新塔"的流程（炮塔靠召唤随机生成），
// 因此网格保持常驻，不跟随放置态显隐——否则空场会退化成一块无分格的淡色平板。
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
      // 不可叠放：目标格标红，松手后塔弹回原位
      this.ctx.fillStyle = "rgba(125, 52, 44, 0.2)";
      this.ctx.fillRect(
        gx * this.CELL_SIZE,
        gy * this.CELL_SIZE,
        this.CELL_SIZE,
        this.CELL_SIZE
      );
    } else if (this.canPlaceAt(gx, gy)) {
      this.ctx.fillStyle = "rgba(28, 26, 23, 0.16)";
      this.ctx.fillRect(
        gx * this.CELL_SIZE,
        gy * this.CELL_SIZE,
        this.CELL_SIZE,
        this.CELL_SIZE
      );
    }

    // 显式描出"松手会落在哪一格"：触摸端没有光标，色块本身不够醒目
    this.ctx.save();
    this.ctx.strokeStyle = "rgba(180, 71, 58, 0.85)";
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
    // 画布坐标 + 镜头偏移 = 世界坐标（本函数在世界层内绘制）
    const x = (this.dragCurrentPos.x - this._dragRectLeft) * this._dragScaleX + (this.camera ? this.camera.x : 0);
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

    if (this.draggingTower.gl) {
      GlyphTower.drawGhost(this.ctx, this.draggingTower.type, x, drawY, 0.6);
      return;
    }
    this.ctx.save();
    this.ctx.globalAlpha = 0.6;
    this.ctx.font = `bold 28px ${CONFIG.FONTS.BRUSH}`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = "#ffff00";
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
    const dangerRatio = aliveCount / this.dangerLimit;
    if (dangerRatio > 0.6) {
      const alpha = 0.3 + 0.3 * Math.sin(Date.now() / 300);
      this.ctx.fillStyle = `rgba(196, 92, 72, ${alpha})`;
      this.ctx.font = '12px "ZCOOL XiaoWei", serif';
      this.ctx.textAlign = "right";
      this.ctx.fillText(`危险: ${aliveCount}/${this.dangerLimit}`, this.canvas.width - 10, 20);
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
      this.ctx.fillStyle = `rgba(180, 71, 58, ${alpha})`;
    } else {
      this.ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
    }
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  
};
