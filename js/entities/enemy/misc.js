// 未归类兼容方法
/**
   * 重置对象状态（用于对象池）
   */
Enemy.prototype.reset = function(type, path, game) {
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
  
};
Enemy.prototype.update = function(now, deltaTime) {
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
  
};
