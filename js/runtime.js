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
    for (const enemy of this.game.enemies) {
      if (isAliveEnemy(enemy)) {
        this.aliveEnemies.push(enemy);
      }
    }
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
  }

  invalidate() {
    this.dirty = true;
  }

  draw(targetCtx) {
    this._ensure();
    targetCtx.drawImage(this.canvas, 0, 0);
  }

  _ensure() {
    const game = this.game;
    if (this.canvas.width !== game.canvas.width || this.canvas.height !== game.canvas.height) {
      this.canvas.width = game.canvas.width;
      this.canvas.height = game.canvas.height;
      this.dirty = true;
    }
    if (!this.dirty) return;

    const ctx = this.ctx;
    const prevCtx = game.ctx;
    const prevInkCtx = game.inkRenderer.ctx;

    game.ctx = ctx;
    game.inkRenderer.ctx = ctx;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const gridHeight = CONFIG.GRID_ROWS * CONFIG.CELL_SIZE;
    ctx.fillStyle = CONFIG.COLORS.bg;
    ctx.fillRect(0, 0, this.canvas.width, gridHeight);
    game.inkRenderer.drawDistantMountains(gridHeight);
    game.drawGrid();
    game.drawPath();
    game.drawCore();
    game.drawLevelInfo();

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
