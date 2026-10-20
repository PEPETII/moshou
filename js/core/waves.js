// Game：连续刷怪、敌人与战斗调度（工单 04：固定波次已改为连续刷怪 + 限时坚守）

// 路程系统：塔防的入口向画外延伸半格，让敌人从画外走进来
Game.prototype.getPathTrack = function(path) {
    return PathTrack.forPath(path, { extendEntry: true });
};
// 场上存活的敌人数（用于 ENEMY_CAP）
Game.prototype.aliveEnemyCount = function() {
    let n = 0;
    for (const e of this.enemies) if (!e.dead) n++;
    return n;
};
// 连续刷怪：创建一只指定类型的敌人（多条路径时默认随机选一条）
// opts.pathIndex 指定走哪条路径；opts.s 指定初始里程（召唤用）；opts.summoned 标记召唤物。
// 血量与奖励（工单 07、11）：小怪、精英乘关卡 hpMul，首领按敌潮档位乘 BOSS.hpMulByDensity 且不吃 hpMul；
// 召唤物不受任何倍率影响，击杀奖励固定 SUMMON_REWARD；其余奖励 = 基础 × 敌潮 rewardMul × (0.5 + 0.5 × hpMul)。
Game.prototype.spawnGlyphEnemy = function(type, opts) {
    opts = opts || {};
    const paths = Array.isArray(this.path[0]) ? this.path : [this.path];
    let idx = opts.pathIndex;
    if (idx == null || idx < 0 || idx >= paths.length) idx = Math.floor(Math.random() * paths.length);
    const enemy = new Enemy(type, paths[idx], this);
    enemy.pathNo = idx;
    if (opts.s != null) {
      enemy.s = Math.max(0, opts.s);
      enemy.syncPosition();
    }
    const level = this.currentLevelData || {};
    const dens = CONFIG.DENSITY[this.density];
    if (opts.summoned) {
      enemy.summoned = true;
      enemy.summoner = opts.summoner || null;
      enemy.reward = CONFIG.SUMMON_REWARD;
    } else if (enemy.isBoss) {
      enemy.scaleHp(CONFIG.BOSS.hpMulByDensity[this.density] || 1);
    } else {
      const hpMul = level.hpMul || 1;
      enemy.scaleHp(hpMul);
      if (level.roster) {
        const rewardMul = (dens && dens.rewardMul) || 1;
        enemy.reward = Math.max(1, Math.round(enemy.reward * rewardMul * (0.5 + 0.5 * hpMul)));
      }
    }
    this.enemies.push(enemy);
    if (typeof EnemyHint !== 'undefined') EnemyHint.notice(type);
    return enemy;
};
// 重置连续刷怪与坚守计时的全部状态（载入关卡时调用；开战前 battleActive 为 false）
Game.prototype.resetBattleState = function(level) {
    this.battleActive = false;
    this.inputLocked = false;
    this.density = null;
    this.spawnAcc = 0;
    this.giantTimer = 0;
    this.holdTotal = (level && level.holdSeconds) || CONFIG.HOLD_SECONDS;
    this.holdLeft = this.holdTotal;
    this.kills = 0;
    this.leaks = 0;
    this.elapsed = 0;
    this.spawnedElites = new Set();
    this.heavyTimers = [];
    this.bossSpawned = false;
    this.duel = false;
    BossFlow.reset(this);
    // 字形弹道、特效与全局大招间隔
    if (typeof GlyphSystem !== 'undefined') GlyphSystem.reset(this);
};
Game.prototype.updateSpawner = function(dt) {
    BattleDirector.update(this, dt);
};
// 玩家确认敌潮档位后开战：开始计时，敌人从入口陆续刷出
Game.prototype.beginBattle = function(densityKey) {
    // 开场演出只属于开战前：开战即收尾，否则还在飞行途中的塔卡会继续隐藏且不可点
    if (this.inkTrailAnimation && this.inkTrailAnimation.active) this.inkTrailAnimation.stop();
    BattleDirector.begin(this, densityKey);
    this.runtimeIndexes.rebuildEnemies();
    this.updateUI();
    if (window.InkAudio) window.InkAudio.play('wave');
};
// 开局前弹出敌潮选择；暂停和继续不会再次弹出
Game.prototype.promptDensity = function() {
    this.battleActive = false;
    DensityPicker.open(
      (key) => this.beginBattle(key),
      () => this.returnToMenu(),
      this.currentLevelData
    );
};
Game.prototype.spawnSplitEnemy = function(parent) {
    for (let i = 0; i < parent.splitCount; i++) {
      const enemy = new Enemy("corpse", parent.path, this);
      enemy.char = "小";
      enemy.maxHp = parent.splitHp;
      enemy.hp = parent.splitHp;
      enemy.baseSpeed = enemy.speed = 1.5;
      enemy.reward = Math.floor(parent.reward / 3);
      enemy.s = parent.s;
      enemy.lane = parent.lane + (i === 0 ? -8 : 8);
      enemy.syncPosition();
      this.enemies.push(enemy);
    }
    this.runtimeIndexes.rebuildEnemies();
  
};
// 在路径里程 s 处召唤敌人（死亡召唤、召唤师使用）
Game.prototype.spawnEnemyAt = function(enemyType, s, x, y) {
    const enemy = this.spawnGlyphEnemy(enemyType);
    enemy.s = Math.min(Math.max(0, s), enemy.track.total);
    enemy.syncPosition();
    this.runtimeIndexes.rebuildEnemies();
    
    // 创建召唤特效
    if (this.particleSystem) {
      this.particleSystem.createExplosion(x, y, 8, '#9c27b0');
    }
  
};
Game.prototype.triggerExplosion = function(x, y, damage, range) {
    const rangeSq = (range * CONFIG.CELL_SIZE) ** 2;
    // 敌人的死亡爆炸只伤害有血量的炮塔（路径塔），不伤同伴
    for (const tower of this.towers.slice()) {
      if (!(tower.hp > 0)) continue;
      if (distanceSq(x, y, tower.x, tower.y) <= rangeSq) {
        tower.takeDamage(damage);
        if (tower.hp <= 0) this.removeTower(tower);
      }
    }

    this.particleSystem.createExplosion(x, y, damage * 5, '#ff6644');
  
};
