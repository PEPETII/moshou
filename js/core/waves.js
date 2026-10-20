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
// 连续刷怪：创建一只指定类型的敌人（多条路径时随机选一条）
Game.prototype.spawnGlyphEnemy = function(type) {
    const paths = Array.isArray(this.path[0]) ? this.path : [this.path];
    const randomPath = paths[Math.floor(Math.random() * paths.length)];
    const enemy = new Enemy(type, randomPath, this);
    this.enemies.push(enemy);
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
      () => this.returnToMenu()
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
