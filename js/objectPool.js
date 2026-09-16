/**
 * 对象池管理器 - 用于复用 Enemy 和 Tower 对象，减少 GC 压力
 */

// 防止重复声明检查
if (window.ObjectPool) {
  console.warn('ObjectPool already defined, skipping redefinition');
}

class ObjectPool {
  constructor(factory, resetFn, initialSize = 20) {
    this.factory = factory;
    this.resetFn = resetFn;
    this.pool = [];
    this.active = new Set();
    this.totalCreated = 0;
    this.totalReused = 0;

    // 预创建初始对象
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this._create());
    }
  }

  _create() {
    this.totalCreated++;
    return this.factory();
  }

  /**
   * 获取一个对象
   */
  acquire(...args) {
    let obj;

    if (this.pool.length > 0) {
      obj = this.pool.pop();
      this.totalReused++;
    } else {
      obj = this._create();
    }

    // 重置对象状态
    if (this.resetFn) {
      this.resetFn(obj, ...args);
    }

    this.active.add(obj);
    obj._poolActive = true;
    obj._pool = this;

    return obj;
  }

  /**
   * 释放对象回池
   */
  release(obj) {
    if (!obj || !obj._poolActive) return false;

    this.active.delete(obj);
    obj._poolActive = false;

    // 清理对象引用，防止内存泄漏
    this._cleanup(obj);

    this.pool.push(obj);
    return true;
  }

  /**
   * 清理对象引用
   */
  _cleanup(obj) {
    // 子类可以重写此方法进行特定清理
  }

  /**
   * 释放所有活动对象
   */
  releaseAll() {
    for (const obj of this.active) {
      obj._poolActive = false;
      this._cleanup(obj);
      this.pool.push(obj);
    }
    this.active.clear();
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      poolSize: this.pool.length,
      activeSize: this.active.size,
      totalCreated: this.totalCreated,
      totalReused: this.totalReused,
      reuseRate: this.totalCreated > 0
        ? (this.totalReused / (this.totalCreated + this.totalReused) * 100).toFixed(1) + '%'
        : '0%'
    };
  }

  /**
   * 清空对象池
   */
  clear() {
    this.pool = [];
    this.active.clear();
    this.totalCreated = 0;
    this.totalReused = 0;
  }
}

/**
 * Enemy 对象池
 */
class EnemyPool extends ObjectPool {
  constructor(initialSize = 30) {
    super(
      () => new Enemy(),
      (enemy, type, path, game) => {
        enemy.reset(type, path, game);
      },
      initialSize
    );
  }

  _cleanup(enemy) {
    // 清理敌人特定的引用
    enemy.game = null;
    enemy.path = null;
    enemy.dead = true;
  }
}

/**
 * Tower 对象池
 */
class TowerPool extends ObjectPool {
  constructor(initialSize = 20) {
    super(
      () => new Tower(),
      (tower, type, gx, gy, game) => {
        tower.reset(type, gx, gy, game);
      },
      initialSize
    );
  }

  _cleanup(tower) {
    // 清理炮塔特定的引用
    tower.game = null;
    tower.projectiles = [];
    tower.selected = false;
  }
}

/**
 * 抛射物对象池
 */
// 防止重复声明检查
if (window.ProjectilePool) {
  console.warn('ProjectilePool already defined, skipping redefinition');
}

class ProjectilePool extends ObjectPool {
  constructor(initialSize = 50) {
    super(
      () => ({}),
      (proj, props) => {
        Object.assign(proj, props);
        proj.active = true;
      },
      initialSize
    );
  }

  _cleanup(proj) {
    proj.target = null;
    proj.trail = null;
    proj.active = false;
  }
}

/**
 * 全局对象池管理器
 */
class PoolManager {
  constructor() {
    this.enemyPool = new EnemyPool(30);
    this.towerPool = new TowerPool(20);
    this.projectilePool = new ProjectilePool(50);
  }

  /**
   * 获取敌人
   */
  acquireEnemy(type, path, game) {
    return this.enemyPool.acquire(type, path, game);
  }

  /**
   * 释放敌人
   */
  releaseEnemy(enemy) {
    return this.enemyPool.release(enemy);
  }

  /**
   * 获取炮塔
   */
  acquireTower(type, gx, gy, game) {
    return this.towerPool.acquire(type, gx, gy, game);
  }

  /**
   * 释放炮塔
   */
  releaseTower(tower) {
    return this.towerPool.release(tower);
  }

  /**
   * 获取抛射物
   */
  acquireProjectile(props) {
    return this.projectilePool.acquire(props);
  }

  /**
   * 释放抛射物
   */
  releaseProjectile(proj) {
    return this.projectilePool.release(proj);
  }

  /**
   * 释放所有对象（关卡切换时调用）
   */
  releaseAll() {
    this.enemyPool.releaseAll();
    this.towerPool.releaseAll();
    this.projectilePool.releaseAll();
  }

  /**
   * 获取所有统计信息
   */
  getStats() {
    return {
      enemy: this.enemyPool.getStats(),
      tower: this.towerPool.getStats(),
      projectile: this.projectilePool.getStats()
    };
  }

  /**
   * 清空所有对象池
   */
  clear() {
    this.enemyPool.clear();
    this.towerPool.clear();
    this.projectilePool.clear();
  }
}

// 创建全局实例
const poolManager = new PoolManager();
