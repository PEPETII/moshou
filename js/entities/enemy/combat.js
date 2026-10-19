// Enemy：路径阻挡、伤害与状态
Enemy.prototype.checkBlocking = function(deltaTime = 0) {
    const nextPoint = this.path[this.pathIndex + 1];
    if (!nextPoint || !this.game.runtimeIndexes) {
      this.blocked = false;
      this.blockTarget = null;
      this._blockAccum = 0;
      return false;
    }

    const tower = this.game.runtimeIndexes.getBlockingTowerAt(nextPoint.x, nextPoint.y);
    if (tower && tower.hp > 0) {
      // 换了阻挡目标则重新计时；按固定间隔出手，与帧率无关
      if (this.blockTarget !== tower) this._blockAccum = 0;
      this.blocked = true;
      this.blockTarget = tower;

      const interval = CONFIG.GAMEPLAY?.blockAttackInterval || 800;
      this._blockAccum = (this._blockAccum || 0) + deltaTime;
      while (this._blockAccum >= interval && tower.hp > 0) {
        this._blockAccum -= interval;
        tower.takeDamage(this.damage, this);
      }
      if (tower.hp <= 0) {
        this.game.removeTower(tower);
        this.blocked = false;
        this.blockTarget = null;
        this._blockAccum = 0;
      }
      return true;
    }

    this.blocked = false;
    this.blockTarget = null;
    this._blockAccum = 0;
    return false;
  
};
Enemy.prototype.takeDamage = function(amount, elementType) {
    // 隐形状态下不受伤害
    if (this.invisible && !this.revealed) {
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

    amount = amount * damageMultiplier;

    if (this.markBonus > 0) {
      amount = amount * (1 + this.markBonus);
    }

    if (this.armor) {
      amount = amount * (1 - this.armorReduction);
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
      // 重入保护：寄生爆炸会反向伤害仍未置 dead 的邻近敌人，避免互相递归
      if (this._dying) return;
      this._dying = true;
      if (this.shadowMark && this.game) {
        // 击杀影印目标回复核心：量取标记塔的 killHeal，每塔每波以 healPerWaveMax 封顶
        const src = this.shadowMarkSource;
        let heal = src ? src.killHeal : 1;
        if (src && src.healPerWaveMax > 0) {
          heal = Math.max(0, Math.min(heal, src.healPerWaveMax - (src.healedThisWave || 0)));
          src.healedThisWave = (src.healedThisWave || 0) + heal;
        }
        this.game.coreHp = Math.min(this.game.coreHp + heal, this.game.maxCoreHp);
      }
      if (this.parasite && this.game) {
        const range = (this.parasiteExplosionRange || 2) * CONFIG.CELL_SIZE;
        const enemies = this.game.runtimeIndexes
          ? this.game.runtimeIndexes.aliveEnemies
          : this.game.enemies;
        for (const enemy of enemies) {
          if (enemy === this || enemy.dead) continue;
          if (distanceSq(this.x, this.y, enemy.x, enemy.y) <= range * range) {
            enemy.takeDamage(this.parasiteExplosionDamage || 3.0);
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
    if (this._glyphHit) return;
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
    const now = Date.now();
    // 取最强减速：已有更强且未过期的减速时，弱减速不覆盖；同强度只延长时间
    if (this.slowed && now <= this.slowEnd && amount < this.slowAmount) return;
    const end = now + duration;
    this.slowEnd = (this.slowed && now <= this.slowEnd && amount === this.slowAmount)
      ? Math.max(this.slowEnd, end)
      : end;
    this.slowed = true;
    this.slowAmount = amount;
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
Enemy.prototype.applyFrozen = function(duration, immunityDuration) {
    if (Date.now() < this.frozenCooldownEnd) return;
    this.frozen = true;
    this.frozenEnd = Date.now() + duration;
    this.frozenCooldownEnd = Date.now() + duration +
      (immunityDuration || CONFIG.GAMEPLAY?.frozenImmunityDuration || 8000);
  
};
Enemy.prototype.applyPoison = function(damage, duration, ulcerDuration = 5000, stackMax = 5) {
    if (this.poisonStacks < stackMax) this.poisonStacks++;
    this.poisonEnd = Date.now() + duration;
    this.poisonDamage = damage;
    if (this.poisonStacks >= 3 && !this.ulcerActive) {
      this.ulcerActive = true;
      this.ulcerEnd = Date.now() + (ulcerDuration || 5000);
      this.originalArmorReduction = this.armorReduction;
      this.armorReduction = 0;
    }
  
};
Enemy.prototype.applyParasite = function(duration, explosionDamage = 3.0, explosionRange = 2) {
    this.parasite = true;
    this.parasiteExplosionDamage = explosionDamage || 3.0;
    this.parasiteExplosionRange = explosionRange || 2;
    this.parasiteEnd = Date.now() + duration;
  
};
Enemy.prototype.applyShadowMark = function(duration, source = null) {
    this.shadowMark = true;
    this.shadowMarkSource = source;
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
