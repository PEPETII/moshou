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
// 玩家确认敌潮档位后开战：开始计时、预铺敌人
Game.prototype.beginBattle = function(densityKey) {
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
Game.prototype.updateAuras = function() {
    // 每轮先清零，光环塔被出售/移走后加成才会消失
    for (const t of this.towers) t.auraBonuses = {};
    for (const tower of this.towers) {
      if (!tower.aura) continue;
      const auraEntries = [];
      if (tower.auraType && (tower.auraType === 'attackSpeed' || tower.auraType === 'range' || tower.auraType === 'reflect')) {
        auraEntries.push({ type: tower.auraType, value: tower.auraValue });
      }
      if (Array.isArray(tower.extraAuras) && tower.extraAuras.length > 0) {
        for (const extra of tower.extraAuras) {
          if (!extra?.type) continue;
          auraEntries.push({ type: extra.type, value: extra.value || 0 });
        }
      }
      if (auraEntries.length === 0) continue;

      const rangePx = tower.auraRange * CONFIG.CELL_SIZE;
      const rangeSq = rangePx * rangePx;
      for (const other of this.towers) {
        if (other === tower) continue;
        if (distanceSq(tower.x, tower.y, other.x, other.y) > rangeSq) continue;

        for (const auraEntry of auraEntries) {
          if (auraEntry.type === 'attackSpeed') {
            other.auraBonuses.attackSpeed = Math.max(
              other.auraBonuses.attackSpeed || 0, auraEntry.value
            );
          } else if (auraEntry.type === 'range') {
            other.auraBonuses.range = Math.max(
              other.auraBonuses.range || 0, auraEntry.value
            );
          } else if (auraEntry.type === 'reflect') {
            let reflectValue = auraEntry.value;
            if (other.onPath && tower.mountainBonus) {
              reflectValue += tower.mountainBonus;
            }
            other.auraBonuses.reflect = Math.max(
              other.auraBonuses.reflect || 0, reflectValue
            );
          }
        }
      }
    }
  
};
Game.prototype.updateGlobalSlow = function() {
    let maxSlow = 0;
    for (const tower of this.towers) {
      if (tower.type === 'time' && tower.globalSlow > maxSlow) {
        maxSlow = tower.globalSlow;
      }
    }
    for (const enemy of this.enemies) {
      if (maxSlow > 0 && !enemy.flying) {
        enemy._globalSlow = maxSlow;
      } else {
        enemy._globalSlow = 0;
      }
    }
  
};
Game.prototype.updateSpecialTowers = function() {
  
};
