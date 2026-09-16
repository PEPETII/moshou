// Game：波次、敌人与战斗调度
Game.prototype.startWave = function() {
    if (this.inputLocked || this.waveInProgress || this.gameEnded) return;
    if (this.wave >= this.maxWave) return;
    if (this.inkTrailAnimation && this.inkTrailAnimation.active) return;

    this._waveCompleteChecking = false;

    if (this.spawnTimerId) {
      clearTimeout(this.spawnTimerId);
      this.spawnTimerId = null;
    }

    this.wave++;
    this.waveInProgress = true;

    for (const tower of this.towers) {
      if (tower.type === 'treasure') {
        tower.waveCount++;
        let gold = tower.goldPerWave;
        if (tower.waveCount % tower.interestInterval === 0) {
          gold += tower.interestBonus;
        }
        this.gold += gold;
      }
    }

    const level = this.currentLevelData;
    const waveData = level.waves[this.wave - 1];

    this.spawnQueue = [];
    for (const enemyGroup of waveData.enemies) {
      for (let i = 0; i < enemyGroup.count; i++) {
        this.spawnQueue.push({
          type: enemyGroup.type,
          delay: enemyGroup.delay,
        });
      }
    }

    this.spawnedCount = 0;

    this.spawnNextEnemy();
    this.updateUI();
  
};
Game.prototype.spawnNextEnemy = function() {
    if (this.spawnedCount >= this.MAX_SPAWN_COUNT) {
      console.warn('达到最大生成数量限制');
      return;
    }

    if (this.spawnQueue.length === 0) {
      this.checkWaveComplete();
      return;
    }

    const data = this.spawnQueue.shift();

    const paths = Array.isArray(this.path[0]) ? this.path : [this.path];
    const randomPath = paths[Math.floor(Math.random() * paths.length)];

    const enemy = new Enemy(data.type, randomPath, this);
    this.enemies.push(enemy);
    this.spawnedCount++;
    this.runtimeIndexes.rebuildEnemies();

    if (this.spawnQueue.length > 0) {
      const nextDelay = this.spawnQueue[0].delay;
      this.spawnTimerId = setTimeout(() => this.spawnNextEnemy(), nextDelay);
    } else {
      this.checkWaveComplete();
    }
  
};
Game.prototype.spawnSplitEnemy = function(parent) {
    for (let i = 0; i < parent.splitCount; i++) {
      const enemy = new Enemy(
        "corpse",
        parent.path.slice(parent.pathIndex),
        this,
      );
      enemy.char = "小";
      enemy.maxHp = parent.splitHp;
      enemy.hp = parent.splitHp;
      enemy.speed = 1.5;
      enemy.reward = Math.floor(parent.reward / 3);
      enemy.x = parent.x + (i === 0 ? -15 : 15);
      enemy.y = parent.y;
      this.enemies.push(enemy);
    }
    this.runtimeIndexes.rebuildEnemies();
  
};
// 在指定位置召唤敌人
Game.prototype.spawnEnemyAt = function(enemyType, pathIndex, x, y) {
    const paths = Array.isArray(this.path[0]) ? this.path : [this.path];
    const randomPath = paths[Math.floor(Math.random() * paths.length)];

    const enemy = new Enemy(enemyType, randomPath, this);
    enemy.pathIndex = Math.min(pathIndex, randomPath.length - 1);
    enemy.x = x + (Math.random() - 0.5) * 30;
    enemy.y = y + (Math.random() - 0.5) * 30;
    this.enemies.push(enemy);
    this.runtimeIndexes.rebuildEnemies();
    
    // 创建召唤特效
    if (this.particleSystem) {
      this.particleSystem.createExplosion(x, y, 8, '#9c27b0');
    }
  
};
Game.prototype.triggerExplosion = function(x, y, damage, range) {
    const rangeSq = (range * CONFIG.CELL_SIZE) ** 2;
    for (const enemy of this.runtimeIndexes.aliveEnemies) {
      if (enemy.dead) continue;

      if (distanceSq(x, y, enemy.x, enemy.y) <= rangeSq) {
        enemy.takeDamage(damage);
      }
    }

    this.particleSystem.createExplosion(x, y, damage * 5, '#ff6644');
  
};
Game.prototype.spawnEnemy = function(enemyType) {
    const paths = Array.isArray(this.path[0]) ? this.path : [this.path];
    const randomPath = paths[Math.floor(Math.random() * paths.length)];

    const enemy = new Enemy(enemyType, randomPath, this);
    this.enemies.push(enemy);
    this.runtimeIndexes.rebuildEnemies();
    this.updateUI();
  
};
Game.prototype.updateAuras = function() {
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
        if (other === tower || other.isFusion) continue;
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
Game.prototype.checkWaveComplete = function() {
    if (this._waveCompleteChecking) return;
    this._waveCompleteChecking = true;

    this.runtimeIndexes.rebuildEnemies();
    const aliveEnemies = this.runtimeIndexes.aliveEnemies;

    if (aliveEnemies.length === 0 && this.spawnQueue.length === 0) {
      this.waveInProgress = false;

      for (const tower of this.towers) {
        if (tower.type === 'healer') {
          let heal = tower.healPerWave;
          if (this.coreHp / this.maxCoreHp < tower.emergencyThreshold) {
            heal += tower.emergencyBonus;
          }
          this.coreHp = Math.min(this.maxCoreHp, this.coreHp + heal);
        }
      }

      for (const tower of this.towers) {
        if (tower.onPath && tower.repairRatio > 0 && tower.hp < tower.maxHp) {
          tower.hp = Math.min(tower.maxHp, tower.hp + Math.floor(tower.maxHp * tower.repairRatio));
        }
        if (tower.type === 'trap') {
          tower.triggerCount = tower.maxTriggers;
        }
      }

      this.updateUI();

      if (this.wave >= this.maxWave) {
        this.gameOver(true);
      }
    }

    this._waveCompleteChecking = false;
  
};
