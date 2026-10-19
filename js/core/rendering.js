// Game：普通模式绘制和 HUD
Game.prototype.updateUI = function() {
    document.getElementById("ink").textContent = this.ink;
    // 坚守剩余时间（开战前显示满时长）
    const holdEl = document.getElementById("hold-time");
    if (holdEl) holdEl.textContent = BattleDirector.formatHold(this.holdLeft);
    this.runtimeIndexes.rebuildEnemies();
    document.getElementById("enemies").textContent = this.runtimeIndexes.aliveEnemies.length;
    document.getElementById("core-hp").textContent =
      `${this.coreHp}/${this.maxCoreHp}`;
    document.querySelector('#top-bar .core-stat').classList.toggle('critical', this.coreHp <= this.maxCoreHp * 0.3);

    // 塔卡的"墨水不足"状态必须随墨水实时刷新，
    // 否则玩家攒够钱后卡仍是灰的、点击无响应（移动端表现为"点了没反应"）
    if (this.ui && this.ui.refreshTowerSelectAffordability) {
      this.ui.refreshTowerSelectAffordability();
    }
  
};
Game.prototype.update = function(now) {
    // 镜头独立于暂停/结算：暂停和结算画面里也能左右查看整张地图
    if (this.camera) {
      this.camera.update(now);
      this.ui.syncPlacementDragCell();
    }

    if (this.gameEnded) return;

    // isPaused：页面切后台；menuPaused：战斗暂停菜单（js/ui/battle-pause.js），两者互不影响
    if (this.isPaused || this.menuPaused) return;

    if (this.paused) {
      this.lastTime = now;
      return;
    }

    // 计算 deltaTime（毫秒），限制最大值为 50ms 防止卡顿时游戏跳变
    // 顿帧（打击反馈）：命中停顿时游戏时间 × 0.06，暂停时不会走到这里
    const deltaTime = GlyphSystem.scaleFrame(Math.min(now - this.lastTime, 50));
    this.lastTime = now;

    this.inkTrailAnimation.update();

    // 全局大招间隔倒计时（字形塔的大招自动释放，见 GlyphSystem）
    GlyphSystem.tick(this, deltaTime / 1000);

    // 连续刷怪与坚守计时；新敌人入场后立即重建索引，塔本帧就能瞄到
    this.updateSpawner(deltaTime / 1000);
    this.runtimeIndexes.rebuildEnemies();

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
    // 同一帧有怪出生也有怪死亡时数量不变，不能靠数量判断，每帧重建（O(n)，n ≤ ENEMY_CAP）
    this.runtimeIndexes.rebuildEnemies();
    this._lastEnemyCount = this.enemies.length;

    // 字形弹道与特效：塔本帧发出的弹道在敌人移动之后推进
    GlyphSystem.update(this, deltaTime / 1000);

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
    const ctx = this.ctx;
    const cam = this.camera;
    // 高清渲染：位图 = 逻辑尺寸 × 倍率，倍率变化时静态层随之重建
    RenderScale.begin(this.canvas, ctx);

    // 世界层：背景、路径、网格、塔、敌人、弹道、地面效果，随镜头平移
    ctx.save();
    const shk = GlyphSystem.shakeOffset(this);
    ctx.translate(-(cam ? Math.round(cam.x) : 0) + shk.x, shk.y);

    this.staticLayer.draw(ctx);
    GlyphSystem.drawStain(ctx);
    this.drawPlacementPreview();

    // 绘制顺序：地面效果（焚后火字）→ 敌人 → 塔 → 弹道与大招 → 粒子
    GlyphSystem.drawGround(ctx, this);

    for (const enemy of this.enemies) {
      enemy.draw(ctx, this.inkRenderer);
    }

    const timestamp = performance.now();
    for (const tower of this.towers) {
      tower.draw(ctx, timestamp);
    }

    GlyphSystem.drawShots(ctx, this);
    this.particleSystem.draw(ctx);
    GlyphSystem.drawFX(ctx);

    this.ui.drawDragPreview(ctx);

    ctx.restore();

    // HUD 层：不随镜头平移
    this.drawLevelInfo();
    GlyphSystem.drawHud(ctx);
    this.inkTrailAnimation.draw(ctx);
    if (cam) cam.drawHints(ctx);
    this.debugStats.draw(ctx);
  
};
/**
 * 是否处于"炮塔待放置"状态。
 *
 * 唯一状态源是 ui.placementDrag.active：塔卡 pointerdown 进入，
 * pointerup / pointercancel / lostpointercapture 退出（触摸端经
 * input-card-gesture 同样落到 beginPlacementDrag）。这里不再引入第二套标志，
 * 避免网格与实际能否落子脱节。
 */
Game.prototype.isPlacementActive = function() {
    const ui = this.ui;
    return !!(ui && ui.placementDrag && ui.placementDrag.active);
};
/**
 * 网格只作为"可放置位置"的辅助提示：未进入放置态就不画。
 */
Game.prototype.shouldShowGrid = function() {
    return this.isPlacementActive();
};
Game.prototype.drawGrid = function() {
    if (!this.shouldShowGrid()) return;

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
      this.ctx.lineTo(CONFIG.GRID_COLS * CONFIG.CELL_SIZE, y * CONFIG.CELL_SIZE);
      this.ctx.stroke();
    }

};
Game.prototype.drawPath = function() {
    const paths = Array.isArray(this.path[0]) ? this.path : [this.path];

    // 路径样式改为 demo 的墨廊（三层淡墨 + 飞白边 + 行进箭标）。
    // 坐标直接取自关卡 path，不做任何换算或位移，行走逻辑完全不变。
    if (window.MapBackground) {
      MapBackground.drawPathCorridor(this.ctx, this.path, CONFIG.CELL_SIZE);
    } else {
      for (const path of paths) {
        this.ctx.strokeStyle = CONFIG.COLORS.pathLine;
        this.ctx.lineWidth = CONFIG.CELL_SIZE - 4;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";
        this.ctx.beginPath();
        for (let i = 0; i < path.length; i++) {
          const pos = gridToPixel(path[i].x, path[i].y);
          if (i === 0) this.ctx.moveTo(pos.x, pos.y);
          else this.ctx.lineTo(pos.x, pos.y);
        }
        this.ctx.stroke();
      }
    }

    this.ctx.fillStyle = "#6a6459";
    this.ctx.font = `14px ${CONFIG.FONTS.BRUSH}`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    for (const path of paths) {
      const start = gridToPixel(path[0].x, path[0].y);
      this.ctx.fillText("入口", start.x, start.y - 25);
      // 入口旁一方淡墨小印
      this.ctx.fillStyle = "rgba(180, 71, 58, 0.18)";
      this.ctx.fillRect(start.x + 16, start.y - 31, 7, 7);
      this.ctx.fillStyle = "#6a6459";
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

    this.ctx.font = '12px "Ink Glyph Fix", "ZCOOL XiaoWei", serif';
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "#c45c48";
    this.ctx.fillText("·核心·", pos.x, pos.y + height + 22);
  
};
Game.prototype.drawPlacementPreview = function() {
    const drag = this.ui.placementDrag;
    if (!drag || !drag.active || drag.gx === null || drag.gy === null) return;

    const { type, gx, gy } = drag;
    const config = CONFIG.TOWERS[type];
    if (!config) return;
    const canPlace = this.getPlacementBlockReason
      ? this.getPlacementBlockReason(type, gx, gy) === null
      : this.canPlaceTower(type, gx, gy);

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

    const isGlyph = typeof GlyphTower !== 'undefined' && GlyphTower.has(type);
    if (isGlyph) {
      // 字形塔：目标格上画半透明的火字或水字
      const cell = gridToPixel(gx, gy);
      GlyphTower.drawGhost(this.ctx, type, cell.x, cell.y, canPlace ? 0.55 : 0.4, canPlace ? null : "#b4473a");
    }

    if (canPlace && Number.isFinite(config.range) && config.range > 0) {
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

    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    // 本函数在世界层内绘制：画布坐标 + 镜头偏移
    const camX = this.camera ? this.camera.x : 0;
    const pointerX = (drag.clientX - rect.left) * (canvasLogicalW(this.canvas) / rect.width) + camX;
    const pointerY = (drag.clientY - rect.top) * (canvasLogicalH(this.canvas) / rect.height);
    const fingerOffset = drag.pointerType === "touch"
      ? 52 * (canvasLogicalH(this.canvas) / rect.height)
      : 0;
    const ghostY = pointerY - fingerOffset;

    this.ctx.save();
    this.ctx.globalAlpha = 0.68;
    this.ctx.font = `bold ${config.char.length > 2 ? 24 : 34}px ${CONFIG.FONTS.BRUSH}`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.lineJoin = "round";
    this.ctx.lineWidth = 4;
    this.ctx.strokeStyle = "rgba(250, 248, 241, 0.92)";
    this.ctx.fillStyle = canPlace ? "#1c1a17" : "#b4473a";
    if (!isGlyph) {
      this.ctx.strokeText(config.char, pointerX, ghostY);
      this.ctx.fillText(config.char, pointerX, ghostY);
    }
    this.ctx.font = `12px ${CONFIG.FONTS.TEXT}`;
    this.ctx.fillText(`${config.cost}墨`, pointerX, ghostY + 23);
    this.ctx.restore();
  
};
// 关卡名不画在画布上（14px 缩放后不可读，且会压住第 0 行），改写入暂停面板的副标题 #hud-level（P4 / P7）
Game.prototype.drawLevelInfo = function() {
    const el = document.getElementById("hud-level");
    if (!el) return;
    const level = this.currentLevelData;
    const text = level ? `第 ${this.currentLevel} 境 · ${level.name}` : "";
    if (el.textContent !== text) el.textContent = text;
  
};
