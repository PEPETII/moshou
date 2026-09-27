// Enemy：死亡、召唤与核心交互
Enemy.prototype.die = function() {
    this.dead = true;
    this.deathTime = Date.now();
    this.game.ink += this.reward;
    this.game.updateUI();

    // 播放死亡音效、墨水音效和粒子效果
    this.game.particleSystem.createExplosion(this.x, this.y, 15);

    // 死亡爆炸
    if (this.explodeOnDeath) {
      if (this.globalExplosion) {
        // 全屏爆炸 - 对所有敌人造成伤害
        const allEnemies = this.game.runtimeIndexes
          ? this.game.runtimeIndexes.aliveEnemies
          : this.game.enemies;
        for (const enemy of allEnemies) {
          if (enemy !== this && !enemy.dead) {
            enemy.takeDamage(this.explodeDamage);
          }
        }
      } else {
        this.game.triggerExplosion(this.x, this.y, this.explodeDamage, this.explodeRange);
      }
    }

    if (this.split) {
      this.game.spawnSplitEnemy(this);
    }
    
    // 死亡召唤
    if (this.summonOnDeath) {
      const summonType = this.deathSummonType || this.summonType;
      const summonCount = this.deathSummonCount || this.summonCount;
      if (summonType && this.game && typeof this.game.spawnEnemyAt === 'function') {
        for (let i = 0; i < summonCount; i++) {
          this.game.spawnEnemyAt(summonType, this.pathIndex, this.x, this.y);
        }
      }
    }
    
    // 毒雾效果
    if (this.poisonCloudOnDeath) {
      this.createPoisonCloud();
    }
  
};
// 召唤敌人
Enemy.prototype.summonEnemies = function() {
    if (!this.summonType || !this.game.spawnEnemyAt) return;
    
    for (let i = 0; i < this.summonCount; i++) {
      this.game.spawnEnemyAt(this.summonType, this.pathIndex, this.x, this.y);
    }
  
};
// 创建毒雾
Enemy.prototype.createPoisonCloud = function() {
    // 创建毒雾区域效果
    if (this.game.particleSystem) {
      this.game.particleSystem.createPoisonCloud(this.x, this.y, this.poisonCloudDuration, this.poisonCloudDamage);
    }
  
};
// 远程攻击
Enemy.prototype.performRangedAttack = function() {
    // 简化实现：对范围内的随机炮塔造成伤害
    if (!this.game.towers || this.game.towers.length === 0) return;
    
    const rangePixels = this.range * CONFIG.CELL_SIZE;
    const targets = this.game.towers.filter(tower => {
      const dx = tower.x - this.x;
      const dy = tower.y - this.y;
      return Math.sqrt(dx * dx + dy * dy) <= rangePixels;
    });
    
    if (targets.length > 0) {
      const target = targets[Math.floor(Math.random() * targets.length)];
      if (target.takeDamage) {
        target.takeDamage(this.damage);
      }
    }
  
};
Enemy.prototype.reachCore = function() {
    this.dead = true;
    this.game.coreHp -= this.damage;
    
    // 吸血效果 - 蚂蟥等怪物攻击核心时回复生命
    if (this.lifeSteal > 0) {
      this.hp = Math.min(this.maxHp, this.hp + this.lifeSteal);
    }
    
    this.game.updateUI();

    // 播放核心受伤音效

    if (this.game.coreHp <= 0) {
      this.game.gameOver(false);
    }
  
};
