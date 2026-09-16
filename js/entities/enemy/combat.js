// Enemy：路径阻挡、伤害与状态
Enemy.prototype.checkBlocking = function() {
    const nextPoint = this.path[this.pathIndex + 1];
    if (!nextPoint || !this.game.runtimeIndexes) {
      this.blocked = false;
      this.blockTarget = null;
      return false;
    }

    const tower = this.game.runtimeIndexes.getBlockingTowerAt(nextPoint.x, nextPoint.y);
    if (tower && tower.hp > 0) {
      this.blocked = true;
      this.blockTarget = tower;

      tower.takeDamage(this.damage);
      if (tower.hp <= 0) {
        this.game.removeTower(tower);
        this.blocked = false;
        this.blockTarget = null;
      }
      return true;
    }

    this.blocked = false;
    this.blockTarget = null;
    return false;
  
};
Enemy.prototype.takeDamage = function(amount, elementType) {
    // 隐形状态下不受伤害
    if (this.invisible) {
      return;
    }
    
    // 计算伤害倍数
    let damageMultiplier = 1;

    // 火标记效果：灼烧状态下继续被火攻击时伤害 X2
    if (elementType === 'fire' && this.fireMarked) {
      damageMultiplier = 2;
    }

    // 蒸发效果：火/水交替攻击触发
    if (elementType && this.lastElementType && elementType !== this.lastElementType) {
      // 火 + 水 或 水 + 火 触发蒸发
      if ((elementType === 'fire' && this.lastElementType === 'water') ||
          (elementType === 'water' && this.lastElementType === 'fire')) {
        this.triggerVaporize();
      }
    }

    // 更新最后攻击元素类型
    if (elementType) {
      this.lastElementType = elementType;
    }

    amount = Math.floor(amount * damageMultiplier);

    if (this.markBonus > 0) {
      amount = Math.floor(amount * (1 + this.markBonus));
    }

    if (this.armor) {
      amount = Math.floor(amount * (1 - this.armorReduction));
    }
    
    // 护盾优先承受伤害
    if (this.shield > 0) {
      if (this.shield >= amount) {
        this.shield -= amount;
        amount = 0;
      } else {
        amount -= this.shield;
        this.shield = 0;
      }
    }
    amount = Math.max(0, amount);

    this.hp -= amount;

    this.triggerShake();

    if (this.hp <= 0) {
      if (this.shadowMark && this.game) {
        this.game.coreHp = Math.min(this.game.coreHp + 1, this.game.maxCoreHp);
      }
      if (this.parasite && this.game) {
        const range = 2 * CONFIG.CELL_SIZE;
        const enemies = this.game.runtimeIndexes
          ? this.game.runtimeIndexes.aliveEnemies
          : this.game.enemies;
        for (const enemy of enemies) {
          if (enemy === this || enemy.dead) continue;
          if (distanceSq(this.x, this.y, enemy.x, enemy.y) <= range * range) {
            enemy.takeDamage(3.0);
          }
        }
      }
      this.die();
    }
  
};
Enemy.prototype.triggerVaporize = function() {
    // 蒸发效果：额外造成 2 点伤害
    this.hp -= 2;
    this.vaporizeMark = true;

    // 创建蒸发特效（使用粒子系统）
    if (this.game && this.game.particleSystem) {
      this.game.particleSystem.createExplosion(this.x, this.y, 8, '#00ffff');
    }

    // 蒸发效果触发后，清除元素标记（防止连续触发）
    this.lastElementType = null;

    // 检查是否死亡
    if (this.hp <= 0) {
      this.die();
    }
  
};
Enemy.prototype.triggerShake = function() {
    this.shakeEndTime = Date.now() + this.shakeDuration;
  
};
Enemy.prototype.updateShake = function() {
    if (Date.now() < this.shakeEndTime) {
      const progress = 1 - (this.shakeEndTime - Date.now()) / this.shakeDuration;
      const currentMagnitude = this.shakeMagnitude * (1 - progress);
      this.shakeOffset.x = (Math.random() - 0.5) * currentMagnitude * 2;
      this.shakeOffset.y = (Math.random() - 0.5) * currentMagnitude * 2;
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
    }
  
};
Enemy.prototype.applySlow = function(amount, duration) {
    this.slowed = true;
    this.slowAmount = amount;
    this.slowEnd = Date.now() + duration;
    this.speed = this.baseSpeed * (1 - amount);
  
};
Enemy.prototype.applyBurn = function(duration, burnDamage = 0) {
    if (this.immuneBurn) {
      return;
    }
    
    this.burning = true;
    this.burnEnd = Date.now() + duration;
    this.burnDamage = burnDamage;
    this.burnTickTime = 0;
    this.fireMarked = true;
  
};
Enemy.prototype.applyFrozen = function(duration) {
    if (Date.now() < this.frozenCooldownEnd) return;
    this.frozen = true;
    this.frozenEnd = Date.now() + duration;
    this.frozenCooldownEnd = Date.now() + duration +
      (CONFIG.GAMEPLAY?.frozenImmunityDuration || 8000);
  
};
Enemy.prototype.applyPoison = function(damage, duration) {
    this.poisonStacks++;
    this.poisonEnd = Date.now() + duration;
    this.poisonDamage = damage;
    if (this.poisonStacks >= 3 && !this.ulcerActive) {
      this.ulcerActive = true;
      this.ulcerEnd = Date.now() + 5000;
      this.originalArmorReduction = this.armorReduction;
      this.armorReduction = 0;
    }
  
};
Enemy.prototype.applyParasite = function(duration) {
    this.parasite = true;
    this.parasiteEnd = Date.now() + duration;
  
};
Enemy.prototype.applyShadowMark = function(duration) {
    this.shadowMark = true;
    this.shadowMarkEnd = Date.now() + duration;
  
};
Enemy.prototype.applyStun = function(duration) {
    this.stunned = true;
    this.stunnedEnd = Date.now() + duration;
  
};
Enemy.prototype.applyReveal = function(duration) {
    this.revealed = true;
    this.revealedEnd = Date.now() + duration;
    if (this.invisible) {
      this.invisible = false;
    }
  
};
Enemy.prototype.applyMark = function(bonus, duration) {
    this.markBonus = bonus;
    this.markEnd = Date.now() + duration;
  
};
