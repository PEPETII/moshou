class Enemy {
  constructor(type, path, game) {
    // 支持对象池模式：无参数构造函数
    if (type === undefined) {
      this._pooled = true;
      return;
    }

    this._pooled = false;
    this.reset(type, path, game);
  }

  /**
   * 重置对象状态（用于对象池）
   */
  reset(type, path, game) {
    this.type = type;
    this.path = path;
    this.game = game;

    const config = CONFIG.ENEMIES[type];
    this.char = config.char;
    this.maxHp = config.hp;
    this.hp = config.hp;
    this.damage = config.damage;
    this.baseSpeed = config.speed;
    this.speed = config.speed;
    this.reward = config.reward;
    this.flying = config.flying || false;
    this.armor = config.armor || false;
    this.armorReduction = config.armorReduction || 0.5;
    this.split = config.split || false;
    this.splitHp = config.splitHp || 2;
    this.splitCount = config.splitCount || 2;

    // 新增特殊能力
    this.invisible = config.invisible || false;
    this.invisibleDuration = config.invisibleDuration || 3000;
    this.invisibleEnd = this.invisible ? Date.now() + this.invisibleDuration : 0;
    this.immuneBurn = config.immuneBurn || false;
    this.explodeOnDeath = config.explodeOnDeath || false;
    this.explodeDamage = config.explodeDamage || 2;
    this.explodeRange = config.explodeRange || 2;

    this.pathIndex = 0;

    // 检查 path 是否有效
    if (!path || path.length === 0) {
      console.error('Enemy 构造函数：path 参数无效', path);
      // 尝试从 game 对象获取当前关卡的默认路径
      if (game && game.currentLevel && game.currentLevel.path) {
        const levelPath = game.currentLevel.path;
        this.path = Array.isArray(levelPath[0]) ? levelPath[0] : levelPath;
      } else {
        // 如果也无法从 game 获取，抛出明确错误
        throw new Error('Enemy: 无法获取有效路径，path 参数和 game.currentLevel 均为空');
      }
    } else {
      this.path = path; // 保存 path 引用
      const start = path[0];
      this.x = start.x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
      this.y = start.y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
    }

    this.slowed = false;
    this.slowEnd = 0;
    this.slowAmount = 0;

    this.burning = false;
    this.burnEnd = 0;
    this.burnDamage = 0;
    this.burnTickTime = 0;

    // 火标记和蒸发效果相关属性
    this.fireMarked = false;
    this.lastElementType = null;
    this.vaporizeMark = false;

    this.frozen = false;
    this.frozenEnd = 0;
    this.frozenCooldownEnd = 0;
    this.poisonStacks = 0;
    this.poisonEnd = 0;
    this.poisonDamage = 0;
    this.poisonTickTime = 0;
    this.ulcerActive = false;
    this.ulcerEnd = 0;
    this.originalArmorReduction = 0;
    this.parasite = false;
    this.parasiteEnd = 0;
    this.shadowMark = false;
    this.shadowMarkEnd = 0;
    this.stunned = false;
    this.stunnedEnd = 0;
    this.revealed = false;
    this.revealedEnd = 0;
    this.markBonus = 0;
    this.markEnd = 0;

    this.blocked = false;
    this.blockTarget = null;

    this.dead = false;
    this.deathTime = 0;

    // 晃动效果相关属性
    this.shakeOffset = { x: 0, y: 0 };
    this.shakeEndTime = 0;
    this.shakeDuration = 150; // 晃动持续时间 (ms)
    this.shakeMagnitude = 4; // 晃动幅度 (像素)

    // ===== 新增机制属性 =====

    // 护盾系统
    this.shield = config.shield || 0;
    this.maxShield = config.shield || 0;
    this.shieldRegen = config.shieldRegen || 0;
    this.lastShieldRegen = 0;

    // 狂暴系统
    this.rageBelowHp = config.rageBelowHp || 0;
    this.rageSpeedBonus = config.rageSpeedBonus || 0;
    this.rageDamageBonus = config.rageDamageBonus || 0;
    this.isRaged = false;

    // 召唤系统
    this.summonCooldown = config.summonCooldown || 0;
    this.summonType = config.summonType || null;
    this.summonCount = config.summonCount || 1;
    this.lastSummon = 0;

    // 死亡召唤
    this.summonOnDeath = config.summonOnDeath || false;
    this.deathSummonType = config.deathSummonType || null;
    this.deathSummonCount = config.deathSummonCount || 1;

    // 毒雾系统
    this.poisonCloudOnDeath = config.poisonCloudOnDeath || false;
    this.poisonCloudDuration = config.poisonCloudDuration || 3000;
    this.poisonCloudDamage = config.poisonCloudDamage || 0.5;
    
    // 冲锋系统
    this.chargeCooldown = config.chargeCooldown || 0;
    this.chargeDuration = config.chargeDuration || 0;
    this.chargeSpeedMultiplier = config.chargeSpeedMultiplier || 1;
    this.isCharging = false;
    this.chargeEnd = 0;
    this.lastCharge = 0;
    
    // 吸血
    this.lifeSteal = config.lifeSteal || 0;
    
    // 远程攻击
    this.ranged = config.ranged || false;
    this.range = config.range || 0;
    this.lastAttack = 0;
    this.attackCooldown = 1500;
    
    // 永久隐身
    this.permanentInvisible = config.permanentInvisible || false;
    if (this.permanentInvisible) {
      this.invisible = true;
      this.invisibleEnd = Infinity;
    }
    
    // 生命回复
    this.regenPerSecond = config.regenPerSecond || 0;
    this.lastRegen = 0;
    
    // 免疫控制
    this.immuneControl = config.immuneControl || false;
    this.immuneKnockback = config.immuneKnockback || false;
    
    // 免疫中毒
    this.immunePoison = config.immunePoison || false;
    
    // 全屏爆炸
    this.globalExplosion = config.globalExplosion || false;
  }

  update(now, deltaTime) {
    if (this.dead) return;

    // 基准帧率 60fps 对应的时间步长（约 16.67ms）
    const timeScale = deltaTime / 16.67;

    if (this.frozen && now > this.frozenEnd) {
      this.frozen = false;
    }

    if (this.stunned && now > this.stunnedEnd) {
      this.stunned = false;
    }

    if (this.poisonStacks > 0 && now > this.poisonEnd) {
      this.poisonStacks = 0;
      this.poisonDamage = 0;
    }

    if (this.ulcerActive && now > this.ulcerEnd) {
      this.ulcerActive = false;
      this.armorReduction = this.originalArmorReduction;
    }

    if (this.parasite && now > this.parasiteEnd) {
      this.parasite = false;
    }

    if (this.shadowMark && now > this.shadowMarkEnd) {
      this.shadowMark = false;
    }

    if (this.revealed && now > this.revealedEnd) {
      this.revealed = false;
    }

    if (this.markBonus > 0 && now > this.markEnd) {
      this.markBonus = 0;
    }

    if (this.frozen || this.stunned) return;

    this.updateShake();

    // 更新隐形状态
    if (this.invisible && now > this.invisibleEnd) {
      this.invisible = false;
    }

    if (this.slowed && now > this.slowEnd) {
      this.slowed = false;
    }

    let speedMultiplier = 1;
    if (this.slowed) speedMultiplier *= (1 - this.slowAmount);
    if (this._globalSlow) speedMultiplier *= (1 - this._globalSlow);
    // 冲锋时速度加成
    if (this.isCharging) speedMultiplier *= this.chargeSpeedMultiplier;
    this.speed = this.baseSpeed * speedMultiplier;

    if (this.burning && now > this.burnEnd) {
      this.burning = false;
      this.burnDamage = 0;
    }

    // 燃烧伤害 - 每配置间隔造成一次伤害（免疫燃烧的敌人不受影响）
    // 使用 deltaTime 累积燃烧伤害计时器
    if (!this._burnAccum) this._burnAccum = 0;
    if (this.burning && this.burnDamage > 0 && !this.immuneBurn) {
      const burnInterval = CONFIG.GAMEPLAY?.burnTickInterval || 500;
      this._burnAccum += deltaTime;
      if (this._burnAccum >= burnInterval) {
        this.takeDamage(this.burnDamage, 'fire');
        this._burnAccum = 0;
      }
    }

    // 中毒伤害 - 使用 deltaTime 累积
    if (!this._poisonAccum) this._poisonAccum = 0;
    if (this.poisonStacks > 0) {
      this._poisonAccum += deltaTime;
      if (this._poisonAccum >= 1000) {
        this._poisonAccum = 0;
        // 免疫中毒的敌人不受毒伤
        if (!this.immunePoison) {
          this.hp -= this.poisonDamage * this.poisonStacks;
          if (this.hp <= 0) {
            this.die();
          }
        }
      }
    }

    // ===== 新增机制更新 =====

    // 护盾回复 - 使用 deltaTime 累积
    if (!this._shieldRegenAccum) this._shieldRegenAccum = 0;
    if (this.shieldRegen > 0 && this.shield < this.maxShield) {
      this._shieldRegenAccum += deltaTime;
      if (this._shieldRegenAccum >= 1000) {
        this._shieldRegenAccum = 0;
        this.shield = Math.min(this.maxShield, this.shield + this.shieldRegen);
      }
    }

    // 生命回复 - 使用 deltaTime 累积
    if (!this._regenAccum) this._regenAccum = 0;
    if (this.regenPerSecond > 0 && this.hp < this.maxHp) {
      this._regenAccum += deltaTime;
      if (this._regenAccum >= 1000) {
        this._regenAccum = 0;
        this.hp = Math.min(this.maxHp, this.hp + this.regenPerSecond);
      }
    }

    // 狂暴检测
    if (this.rageBelowHp > 0 && !this.isRaged) {
      if (this.hp / this.maxHp <= this.rageBelowHp) {
        this.isRaged = true;
        this.baseSpeed *= (1 + this.rageSpeedBonus);
        this.damage *= (1 + (this.rageDamageBonus || 0));
      }
    }

    // 冲锋逻辑 - 使用 deltaTime 累积
    if (!this._chargeAccum) this._chargeAccum = 0;
    if (this.chargeCooldown > 0 && !this.isCharging) {
      this._chargeAccum += deltaTime;
      if (this._chargeAccum >= this.chargeCooldown) {
        this.isCharging = true;
        this.chargeEnd = now + this.chargeDuration;
        this._chargeAccum = 0;
      }
    }

    if (this.isCharging && now > this.chargeEnd) {
      this.isCharging = false;
    }

    // 召唤逻辑 - 使用 deltaTime 累积
    if (!this._summonAccum) this._summonAccum = 0;
    if (this.summonCooldown > 0 && this.summonType && !this.dead) {
      this._summonAccum += deltaTime;
      if (this._summonAccum >= this.summonCooldown) {
        this._summonAccum = 0;
        this.summonEnemies();
      }
    }

    // 远程攻击逻辑 - 使用 deltaTime 累积
    if (!this._attackAccum) this._attackAccum = 0;
    if (this.ranged && this.range > 0 && !this.dead) {
      this._attackAccum += deltaTime;
      if (this._attackAccum >= this.attackCooldown) {
        this._attackAccum = 0;
        this.performRangedAttack();
      }
    }

    if (!this.flying && this.checkBlocking()) {
      return;
    }

    // 边界检查：确保 pathIndex 在有效范围内
    if (this.pathIndex >= this.path.length - 1) {
      this.reachCore();
      return;
    }

    const target = this.path[this.pathIndex + 1];
    // 额外的安全检查：确保目标点存在
    if (!target) {
      this.reachCore();
      return;
    }
    const targetX = target.x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
    const targetY = target.y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;

    if (isNaN(targetX) || isNaN(targetY) || isNaN(this.x) || isNaN(this.y)) {
      this.dead = true;
      return;
    }

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (isNaN(dist) || dist <= 0) {
      this.pathIndex++;
      return;
    }

    if (dist < 2) {
      this.pathIndex++;
      return;
    }

    // 使用 timeScale 实现帧率独立的移动速度
    // 原公式：moveSpeed = (speed * CELL_SIZE) / 60 是基于每帧的
    // 新公式：moveSpeed = speed * CELL_SIZE * (deltaTime / 1000) 是基于时间的
    const moveSpeed = this.speed * CONFIG.CELL_SIZE * (deltaTime / 1000);
    if (isNaN(moveSpeed)) {
      this.pathIndex++;
      return;
    }
    this.x += (dx / dist) * moveSpeed;
    this.y += (dy / dist) * moveSpeed;
  }

  checkBlocking() {
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
  }

  takeDamage(amount, elementType) {
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
  }

  triggerVaporize() {
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
  }

  triggerShake() {
    this.shakeEndTime = Date.now() + this.shakeDuration;
  }

  updateShake() {
    if (Date.now() < this.shakeEndTime) {
      const progress = 1 - (this.shakeEndTime - Date.now()) / this.shakeDuration;
      const currentMagnitude = this.shakeMagnitude * (1 - progress);
      this.shakeOffset.x = (Math.random() - 0.5) * currentMagnitude * 2;
      this.shakeOffset.y = (Math.random() - 0.5) * currentMagnitude * 2;
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
    }
  }

  applySlow(amount, duration) {
    this.slowed = true;
    this.slowAmount = amount;
    this.slowEnd = Date.now() + duration;
    this.speed = this.baseSpeed * (1 - amount);
  }

  applyBurn(duration, burnDamage = 0) {
    if (this.immuneBurn) {
      return;
    }
    
    this.burning = true;
    this.burnEnd = Date.now() + duration;
    this.burnDamage = burnDamage;
    this.burnTickTime = 0;
    this.fireMarked = true;
  }

  applyFrozen(duration) {
    if (Date.now() < this.frozenCooldownEnd) return;
    this.frozen = true;
    this.frozenEnd = Date.now() + duration;
    this.frozenCooldownEnd = Date.now() + duration +
      (CONFIG.GAMEPLAY?.frozenImmunityDuration || 8000);
  }

  applyPoison(damage, duration) {
    this.poisonStacks++;
    this.poisonEnd = Date.now() + duration;
    this.poisonDamage = damage;
    if (this.poisonStacks >= 3 && !this.ulcerActive) {
      this.ulcerActive = true;
      this.ulcerEnd = Date.now() + 5000;
      this.originalArmorReduction = this.armorReduction;
      this.armorReduction = 0;
    }
  }

  applyParasite(duration) {
    this.parasite = true;
    this.parasiteEnd = Date.now() + duration;
  }

  applyShadowMark(duration) {
    this.shadowMark = true;
    this.shadowMarkEnd = Date.now() + duration;
  }

  applyStun(duration) {
    this.stunned = true;
    this.stunnedEnd = Date.now() + duration;
  }

  applyReveal(duration) {
    this.revealed = true;
    this.revealedEnd = Date.now() + duration;
    if (this.invisible) {
      this.invisible = false;
    }
  }

  applyMark(bonus, duration) {
    this.markBonus = bonus;
    this.markEnd = Date.now() + duration;
  }

  die() {
    this.dead = true;
    this.deathTime = Date.now();
    this.game.gold += this.reward;
    this.game.updateUI();

    // 播放死亡音效、金币音效和粒子效果
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
  }
  
  // 召唤敌人
  summonEnemies() {
    if (!this.summonType || !this.game.spawnEnemyAt) return;
    
    for (let i = 0; i < this.summonCount; i++) {
      this.game.spawnEnemyAt(this.summonType, this.pathIndex, this.x, this.y);
    }
  }
  
  // 创建毒雾
  createPoisonCloud() {
    // 创建毒雾区域效果
    if (this.game.particleSystem) {
      this.game.particleSystem.createPoisonCloud(this.x, this.y, this.poisonCloudDuration, this.poisonCloudDamage);
    }
  }
  
  // 远程攻击
  performRangedAttack() {
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
  }

  reachCore() {
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
  }

  draw(ctx, inkRenderer) {
    if (this.dead) return;
    if (isNaN(this.x) || isNaN(this.y)) return;

    ctx.save();
    
    // 应用晃动偏移
    ctx.translate(this.shakeOffset.x, this.shakeOffset.y);
    
    // 绘制墨晕底座
    inkRenderer.drawInkWash(this.x, this.y + 8, 18, '#1a1a1a', 0.25);
    
    // 确定敌人颜色状态
    let color = CONFIG.COLORS.enemy;
    if (this.vaporizeMark) {
      color = "#c0c0c0";  // 蒸发状态显示淡灰
    } else if (this.burning || this.fireMarked) {
      color = "#a0a0a0";  // 灼烧状态显示浅墨
    } else if (this.blocked) {
      color = "#909090";
    } else if (this.slowed) {
      color = "#b0b0b0";
    }

    // 绘制敌人文字（水墨风格）
    inkRenderer.drawInkText(this.char, this.x, this.y, 26, color, true);

    if (this.frozen) {
      ctx.strokeStyle = '#80d8ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x - 14, this.y - 14, 28, 28);
    }

    if (this.poisonStacks > 0) {
      ctx.fillStyle = '#76ff03';
      ctx.font = '10px Microsoft YaHei';
      ctx.textAlign = 'center';
      ctx.fillText('毒' + this.poisonStacks, this.x, this.y - 18);
    }

    if (this.stunned) {
      ctx.fillStyle = '#ffd54f';
      ctx.font = '10px Microsoft YaHei';
      ctx.textAlign = 'center';
      ctx.fillText('晕', this.x + 14, this.y - 14);
    }

    if (this.parasite) {
      ctx.strokeStyle = '#69f0ae';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(this.x - 12, this.y - 12, 24, 24);
      ctx.setLineDash([]);
    }

    if (this.shadowMark) {
      ctx.fillStyle = 'rgba(124, 77, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.markBonus > 0) {
      ctx.strokeStyle = '#ffcc02';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 18, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.font = '12px "ZCOOL XiaoWei", serif';
    ctx.fillStyle = "#ff4444";
    ctx.textAlign = "center";
    ctx.fillText(`${this.hp}/${this.maxHp}`, this.x, this.y - 20);

    // 护盾显示
    if (this.shield > 0) {
      ctx.fillStyle = "#00bcd4";
      ctx.fillText(`盾${this.shield}`, this.x, this.y - 32);
    }

    // 飞行标记
    if (this.flying) {
      ctx.font = '10px "ZCOOL XiaoWei", serif';
      ctx.fillStyle = "#666";
      ctx.textAlign = "center";
      ctx.fillText("·飞·", this.x, this.y + 28);
    }

    // 狂暴标记
    if (this.isRaged) {
      ctx.fillStyle = '#ff1744';
      ctx.font = 'bold 12px "ZCOOL XiaoWei", serif';
      ctx.fillText('狂', this.x + 16, this.y - 16);
    }

    // 冲锋标记
    if (this.isCharging) {
      ctx.fillStyle = '#ff9100';
      ctx.font = 'bold 12px "ZCOOL XiaoWei", serif';
      ctx.fillText('冲', this.x - 16, this.y - 16);
    }

    // 远程标记
    if (this.ranged) {
      ctx.fillStyle = '#4caf50';
      ctx.font = '10px "ZCOOL XiaoWei", serif';
      ctx.fillText('远', this.x + 14, this.y + 14);
    }

    // 永久隐身标记（只在显形时显示）
    if (this.permanentInvisible && this.revealed) {
      ctx.strokeStyle = '#9c27b0';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }
}
