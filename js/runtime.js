/**
 * 运行时性能工具集。
 * 该文件只放通用基础设施，避免把缓存、索引和对象池逻辑散落到玩法模块。
 */

// 防止重复声明检查
if (window.RuntimeIndexes) {
  console.warn('RuntimeIndexes already defined, skipping redefinition');
}

function gridKey(gx, gy) {
  return `${gx},${gy}`;
}

function distanceSq(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

function isAliveEnemy(enemy) {
  return enemy && !enemy.dead && enemy.hp > 0;
}

class RuntimeIndexes {
  constructor(game) {
    this.game = game;
    this.towerByCell = new Map();
    this.blockingTowerByCell = new Map();
    this.aliveEnemies = [];
    // 敌人空间分桶：怪多（上限 260）时，招式的范围查询不必扫全部敌人
    this.bucketSize = 96;
    this._buckets = new Map();
  }

  rebuildTowers() {
    this.towerByCell.clear();
    this.blockingTowerByCell.clear();

    for (const tower of this.game.towers) {
      const key = gridKey(tower.gx, tower.gy);
      this.towerByCell.set(key, tower);
      if (tower.onPath && tower.hp > 0) {
        this.blockingTowerByCell.set(key, tower);
      }
    }
  }

  rebuildEnemies() {
    this.aliveEnemies.length = 0;
    this._buckets.clear();
    const size = this.bucketSize;
    for (const enemy of this.game.enemies) {
      if (isAliveEnemy(enemy)) {
        this.aliveEnemies.push(enemy);
        const key = this._bucketKey(Math.floor(enemy.x / size), Math.floor(enemy.y / size));
        let list = this._buckets.get(key);
        if (!list) {
          list = [];
          this._buckets.set(key, list);
        }
        list.push(enemy);
      }
    }
  }

  _bucketKey(cx, cy) {
    // 世界坐标可能为负（敌人从画外走进来），加偏移后再打包
    return (cx + 256) * 4096 + (cy + 256);
  }

  /**
   * 圆形范围内的存活敌人（按桶筛选，再精确判距）。
   * 注意：桶按上次 rebuildEnemies 时的位置，敌人移动一帧内偏差远小于桶边长。
   */
  enemiesInRange(x, y, radius) {
    const size = this.bucketSize;
    const r2 = radius * radius;
    const out = [];
    const x0 = Math.floor((x - radius) / size);
    const x1 = Math.floor((x + radius) / size);
    const y0 = Math.floor((y - radius) / size);
    const y1 = Math.floor((y + radius) / size);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const list = this._buckets.get(this._bucketKey(cx, cy));
        if (!list) continue;
        for (const e of list) {
          if (!e.dead && distanceSq(x, y, e.x, e.y) <= r2) out.push(e);
        }
      }
    }
    return out;
  }

  getTowerAt(gx, gy) {
    return this.towerByCell.get(gridKey(gx, gy)) || null;
  }

  getBlockingTowerAt(gx, gy) {
    return this.blockingTowerByCell.get(gridKey(gx, gy)) || null;
  }
}

// 注意：ProjectilePool 定义在 objectPool.js 中，这里不再重复定义

class StaticCanvasLayer {
  constructor(game) {
    this.game = game;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.dirty = true;
    // 缓存里当前是否烘进了网格。网格只服务于"炮塔待放置"状态，
    // 因此缓存内容必须跟随放置态切换，否则会出现"松手后网格仍在"。
    this._gridVisible = false;
  }

  invalidate() {
    this.dirty = true;
  }

  /**
   * 让网格显隐与放置态保持一致。
   * 状态一变就置脏，下一行 _ensure() 会在同一帧重建缓存，
   * 从而做到进入/退出放置态当帧生效，且网格仍位于路径墨廊之下（z 序不变）。
   *
   * @returns {boolean} 本次调用是否检测到状态切换
   */
  syncGridVisibility() {
    const visible = !!(this.game.shouldShowGrid && this.game.shouldShowGrid());
    if (visible === this._gridVisible) return false;
    this._gridVisible = visible;
    this.dirty = true;
    return true;
  }

  draw(targetCtx) {
    this.syncGridVisibility();
    this._ensure();
    // 位图是 逻辑尺寸 × 倍率，按逻辑尺寸贴回，避免被二次放大
    targetCtx.drawImage(this.canvas, 0, 0, this.logicalW, this.logicalH);
  }

  _ensure() {
    const game = this.game;
    // 静态层按世界尺寸生成（比视口宽），随镜头平移后只露出视口那一段；
    // 分辨率跟随主画布的高清倍率，否则背景仍会糊
    const worldW = game.worldW || canvasLogicalW(game.canvas);
    const worldH = canvasLogicalH(game.canvas);
    const k = game.canvas.renderScale || 1;
    if (this.logicalW !== worldW || this.logicalH !== worldH || this.scale !== k) {
      this.logicalW = worldW;
      this.logicalH = worldH;
      this.scale = k;
      this.canvas.width = Math.round(worldW * k);
      this.canvas.height = Math.round(worldH * k);
      this.canvas.logicalWidth = worldW;
      this.canvas.logicalHeight = worldH;
      this.canvas.renderScale = k;
      this.dirty = true;
    }
    if (!this.dirty) return;

    const ctx = this.ctx;
    const prevCtx = game.ctx;
    const prevInkCtx = game.inkRenderer.ctx;

    game.ctx = ctx;
    game.inkRenderer.ctx = ctx;

    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, worldW, worldH);
    const gridHeight = CONFIG.GRID_ROWS * CONFIG.CELL_SIZE;
    // 底图（宣纸 + 远山 + 苔石）由 mapBackground 统一生成并缓存
    if (window.MapBackground) {
      MapBackground.drawTerrain(ctx, worldW, worldH, {
        path: game.path,
        cell: CONFIG.CELL_SIZE,
        base: gridHeight,
        scale: k
      });
    } else {
      ctx.fillStyle = CONFIG.COLORS.bg;
      ctx.fillRect(0, 0, worldW, gridHeight);
    }
    // 网格位置固定在原地形之上、路径墨廊之下，只在放置态出现
    if (this._gridVisible) game.drawGrid();
    game.drawPath();
    game.drawCore();

    game.ctx = prevCtx;
    game.inkRenderer.ctx = prevInkCtx;
    this.dirty = false;
  }
}

class DebugStatsOverlay {
  constructor(game) {
    this.game = game;
    this.enabled = new URLSearchParams(window.location.search).get('debug') === '1';
    this.frameCount = 0;
    this.lastSample = 0;
    this.fps = 0;
  }

  update(now) {
    if (!this.enabled) return;
    this.frameCount++;
    if (!this.lastSample) {
      this.lastSample = now;
      return;
    }
    const elapsed = now - this.lastSample;
    if (elapsed >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastSample = now;
    }
  }

  draw(ctx) {
    if (!this.enabled) return;

    const game = this.game;
    let projectileCount = 0;
    for (const tower of game.towers) {
      projectileCount += tower.projectiles.length;
    }

    const activeParticles = game.particleSystem.getActiveCount
      ? game.particleSystem.getActiveCount()
      : 0;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(8, 28, 150, 92);
    ctx.fillStyle = '#d8d8d8';
    ctx.font = '12px Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`FPS ${this.fps}`, 16, 36);
    ctx.fillText(`Towers ${game.towers.length}`, 16, 52);
    ctx.fillText(`Enemies ${game.runtimeIndexes.aliveEnemies.length}/${game.enemies.length}`, 16, 68);
    ctx.fillText(`Projectiles ${projectileCount}`, 16, 84);
    ctx.fillText(`Particles ${activeParticles}`, 16, 100);
    ctx.restore();
  }
}
