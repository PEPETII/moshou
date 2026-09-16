class Tower {
  constructor(type, gx, gy, game) {
    // 支持对象池模式：无参数构造函数
    if (type === undefined) {
      this._pooled = true;
      return;
    }

    this.reset(type, gx, gy, game);
  }

  /**
   * 重置对象状态（用于对象池）
   */
  reset(type, gx, gy, game) {
    this.type = type;
    this.gx = gx;
    this.gy = gy;
    this.game = game;

    const config = CONFIG.TOWERS[type];
    this.char = config.char;
    this.level = 1;
    this.maxLevel = config.maxLevel;

    this.damage = config.damage;
    this.range = config.range;
    this.cooldown = config.cooldown;
    this.lastAttack = 0;

    this.slow = config.slow || 0;
    this.slowDuration = config.slowDuration || 0;
    this.pierce = config.pierce || false;
    this.aoe = config.aoe || false;
    this.aoeRange = config.aoeRange || 1.5;
    this.onPath = config.onPath || false;
    this.burn = config.burn || false;
    this.burnDuration = config.burnDuration || 0;
    this.burnDamage = config.burnDamage || 0;
    this.chain = config.chain || false;
    this.chainCount = config.chainCount || 0;
    this.chainRange = config.chainRange || 150;

    this.chainDecay = config.chainDecay || 0.15;
    this.conductBonus = config.conductBonus || 1;
    this.freezeDuration = config.freezeDuration || 0;
    this.freezeCooldown = config.freezeCooldown || 0;
    this.poisonDamage = config.poisonDamage || 0;
    this.poisonDuration = config.poisonDuration || 0;
    this.poisonStackMax = config.poisonStackMax || 5;
    this.ulcerDuration = config.ulcerDuration || 0;
    this.knockback = config.knockback || 0;
    this.knockbackCooldown = config.knockbackCooldown || 0;
    this.dispel = config.dispel || false;
    this.pierceCount = config.pierceCount || 0;
    this.revealDuration = config.revealDuration || 0;
    this.revealBonus = config.revealBonus || 1;
    this.killHeal = config.killHeal || 0;
    this.shadowMarkDuration = config.shadowMarkDuration || 0;
    this.shadowMarkBonusHeal = config.shadowMarkBonusHeal || 0;
    this.elementChances = config.elementChances || null;
    this.comboBonus = config.comboBonus || 0;
    this.lastElement = null;
    this.frostSlow = config.frostSlow || 0;
    this.frostSlowDuration = config.frostSlowDuration || 0;
    this.deepColdBonus = config.deepColdBonus || 1;
    this.frostGroundDuration = config.frostGroundDuration || 0;
    this.aura = config.aura || false;
    this.auraRange = config.auraRange || 0;
    this.auraType = config.auraType || null;
    this.auraValue = config.auraValue || 0;
    this.extraAuras = config.extraAuras || [];
    this.auraBonuses = {};
    this.stunDuration = config.stunDuration || 0;
    this.stunRange = config.stunRange || 0;
    this.mountainBonus = config.mountainBonus || 0;
    this.markDuration = config.markDuration || 0;
    this.markBonus = config.markBonus || 0;
    this.markCount = config.markCount || 0;
    this.currentMarkCount = 0;
    this.auraSlow = config.auraSlow || 0;
    this.repairRatio = config.repairRatio || 0;
    this.triggerCount = config.triggerCount || 0;
    this.maxTriggers = config.maxTriggers || config.triggerCount || 0;
    this.reflectDamage = config.reflectDamage || 0;
    this.damageReduction = config.damageReduction || 0;
    this.goldPerWave = config.goldPerWave || 0;
    this.interestInterval = config.interestInterval || 3;
    this.interestBonus = config.interestBonus || 0;
    this.waveCount = 0;
    this.healPerWave = config.healPerWave || 0;
    this.emergencyThreshold = config.emergencyThreshold || 0;
    this.emergencyBonus = config.emergencyBonus || 0;
    this.summonHp = config.summonHp || 0;
    this.summonDamage = config.summonDamage || 0;
    this.summonDuration = config.summonDuration || 0;
    this.maxSummons = config.maxSummons || 0;
    this.activeSummons = [];
    this.copyEfficiency = config.copyEfficiency || 0;
    this.globalSlow = config.globalSlow || 0;
    this.explodeRange = config.explodeRange || 0;
    this.isDetonator = config.isDetonator || false;
    this.parasiteDuration = config.parasiteDuration || 0;
    this.explosionDamage = config.explosionDamage || 0;
    this.explosionRange = config.explosionRange || 0;
    this.rotationSpeed = config.rotationSpeed || 0;
    this.fanAngle = config.fanAngle || 0;
    this.currentRotation = 0;
    this.frostGrounds = [];

    this.hp = config.hp || 0;
    this.maxHp = this.hp;

    this.cost = config.cost;
    this.upgradeCost = config.upgradeCost;

    const pos = gridToPixel(gx, gy);
    this.x = pos.x;
    this.y = pos.y;

    this.projectiles = [];
    this.selected = false;

    // === 攻击动画系统 ===
    this.attackAnimTime = 0;
    this.attackAnimDuration = CONFIG.GAMEPLAY?.attackAnimDuration || 200;
    this.isAttacking = false;

    // 山塔受击震动系统
    this.shakeOffset = { x: 0, y: 0 };
    this.shakeEndTime = 0;
    this.shakeDuration = CONFIG.GAMEPLAY?.shakeDuration || 150;
    this.shakeMagnitude = 4;

    // 金塔光束效果
    this.beamEffects = [];

    // 土塔冲击波效果
    this.shockwaves = [];

    // 风链弹射效果
    this.chainEffects = [];
  }

  upgrade() {
    if (this.level >= this.maxLevel) return false;
    if (this.game.gold < this.upgradeCost * this.level) return false;

    this.game.gold -= this.upgradeCost * this.level;
    this.level++;

    const config = CONFIG.TOWERS[this.type];
    const params = config ? config.upgradeParams : null;

    if (params) {
      if (params.damageInc) this.damage += params.damageInc;
      if (params.rangeInc) this.range += params.rangeInc;
      if (params.cooldownDec && this.cooldown > 200) this.cooldown -= params.cooldownDec;
      if (params.slowInc && this.slow) this.slow += params.slowInc;
      if (params.hpInc && this.hp) {
        this.hp += params.hpInc;
        this.maxHp = this.hp;
      }
      if (params.chainCountInc && this.chainCount) this.chainCount += params.chainCountInc;
      if (params.freezeDurationInc && this.freezeDuration) this.freezeDuration += params.freezeDurationInc;
      if (params.poisonDamageInc && this.poisonDamage) this.poisonDamage += params.poisonDamageInc;
      if (params.knockbackInc && this.knockback) this.knockback += params.knockbackInc;
      if (params.pierceCountInc && this.pierceCount) this.pierceCount += params.pierceCountInc;
      if (params.revealDurationInc && this.revealDuration) this.revealDuration += params.revealDurationInc;
      if (params.killHealInc && this.killHeal) this.killHeal += params.killHealInc;
      if (params.comboBonusInc && this.comboBonus) this.comboBonus += params.comboBonusInc;
      if (params.aoeRangeInc && this.aoeRange) this.aoeRange += params.aoeRangeInc;
      if (params.frostSlowInc && this.frostSlow) this.frostSlow += params.frostSlowInc;
      if (params.auraRangeInc && this.auraRange) this.auraRange += params.auraRangeInc;
      if (params.auraValueInc && this.auraValue) this.auraValue += params.auraValueInc;
      if (params.stunDurationInc && this.stunDuration) this.stunDuration += params.stunDurationInc;
      if (params.mountainBonusInc && this.mountainBonus) this.mountainBonus += params.mountainBonusInc;
      if (params.markDurationInc && this.markDuration) this.markDuration += params.markDurationInc;
      if (params.markBonusInc && this.markBonus) this.markBonus += params.markBonusInc;
      if (params.markCountInc && this.markCount) this.markCount += params.markCountInc;
      if (params.auraSlowInc && this.auraSlow) this.auraSlow += params.auraSlowInc;
      if (params.repairRatioInc && this.repairRatio) this.repairRatio += params.repairRatioInc;
      if (params.slowDurationInc && this.slowDuration) this.slowDuration += params.slowDurationInc;
      if (params.triggerCountInc && this.triggerCount) this.triggerCount += params.triggerCountInc;
      if (params.reflectDamageInc && this.reflectDamage) this.reflectDamage += params.reflectDamageInc;
      if (params.damageReductionInc && this.damageReduction) this.damageReduction += params.damageReductionInc;
      if (params.goldPerWaveInc && this.goldPerWave) this.goldPerWave += params.goldPerWaveInc;
      if (params.interestBonusInc && this.interestBonus) this.interestBonus += params.interestBonusInc;
      if (params.healPerWaveInc && this.healPerWave) this.healPerWave += params.healPerWaveInc;
      if (params.emergencyBonusInc && this.emergencyBonus) this.emergencyBonus += params.emergencyBonusInc;
      if (params.summonHpInc && this.summonHp) this.summonHp += params.summonHpInc;
      if (params.summonDamageInc && this.summonDamage) this.summonDamage += params.summonDamageInc;
      if (params.maxSummonsInc && this.maxSummons) this.maxSummons += params.maxSummonsInc;
      if (params.copyEfficiencyInc && this.copyEfficiency) this.copyEfficiency += params.copyEfficiencyInc;
      if (params.globalSlowInc && this.globalSlow) this.globalSlow += params.globalSlowInc;
      if (params.explodeRangeInc && this.explodeRange) this.explodeRange += params.explodeRangeInc;
      if (params.explosionDamageInc && this.explosionDamage) this.explosionDamage += params.explosionDamageInc;
      if (params.explosionRangeInc && this.explosionRange) this.explosionRange += params.explosionRangeInc;
      if (params.rotationSpeedInc && this.rotationSpeed) this.rotationSpeed += params.rotationSpeedInc;
      if (params.fanAngleInc && this.fanAngle) this.fanAngle += params.fanAngleInc;
      if (params.ulcerDurationInc && this.ulcerDuration) this.ulcerDuration += params.ulcerDurationInc;
    } else {
      this.damage += 1;
      this.range += this.type === "water" ? 1 : 0.5;
      if (this.cooldown > 200) this.cooldown -= 100;
      if (this.slow) this.slow += 0.1;
      if (this.hp) {
        this.hp += 2;
        this.maxHp = this.hp;
      }
    }

    return true;
  }

  getSellValue() {
    return Math.floor(this.cost * 0.7);
  }

  update(now, deltaTime, enemies) {
    // 使用 deltaTime 累积冷却时间，实现帧率独立的攻击冷却
    if (!this._cooldownAccum) this._cooldownAccum = 0;
    this._cooldownAccum += deltaTime;

    if (this.onPath) {
      this.updateShake();
      if (this.type === 'arrow' || this.type === 'bunker') {
        if (this._cooldownAccum >= this.cooldown) {
          const target = this.findTarget(this.getAliveEnemies());
          if (target) {
            this.attack(target, now);
            this._cooldownAccum = 0;
          }
        }
      }
      if (this.type === 'trap' && this.triggerCount > 0) {
        this.checkTrapTrigger();
      }
      if (this.type === 'moat') {
        this.checkMoatEffect();
      }
      return;
    }

    if (this.aura) {
      this.updateAura();
    }
    if (this.type === 'treasure') {
    }
    if (this.type === 'healer') {
    }
    if (this.type === 'soul' && this._cooldownAccum >= this.cooldown) {
      this.summonSoul();
      this._cooldownAccum = 0;
    }
    if (this.type === 'shadow') {
      this.updateShadowCopy(now);
    }
    if (this.type === 'time') {
    }
    if (this.type === 'detonator') {
    }
    if (this.type === 'parasite' && this._cooldownAccum >= this.cooldown) {
      const pTarget = this.findTarget(enemies);
      if (pTarget) {
        this._cooldownAccum = 0;
        this.triggerAttackAnimation();
        this.addProjectile({
          x: this.x, y: this.y, target: pTarget,
          damage: this.damage, speed: 6, trail: [], type: 'parasite'
        });
      }
    }
    if (this.type === 'wheel' && this._cooldownAccum >= this.cooldown) {
      this.wheelAttack();
      this._cooldownAccum = 0;
    }

    const target = this.findTarget(enemies);
    if (target && this._cooldownAccum >= this.cooldown) {
      this.attack(target, now);
      this._cooldownAccum = 0;
    }

    // 更新特效
    this.updateBeamEffects();
    this.updateShockwaves();
    this.updateChainEffects();
    this.updateFrostGrounds();
  }

  // 更新山塔震动效果
  updateShake() {
    if (Date.now() < this.shakeEndTime) {
      const progress = 1 - (this.shakeEndTime - Date.now()) / this.shakeDuration;
      const currentMagnitude = this.shakeMagnitude * (1 - progress);
      // 使用基于时间的正弦波替代随机，避免高频抖动
      const time = Date.now() / 1000; // 使用秒级时间
      this.shakeOffset.x = Math.sin(time * 10) * currentMagnitude;
      this.shakeOffset.y = Math.cos(time * 8) * currentMagnitude;
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
    }
  }

  // 触发山塔震动
  triggerShake() {
    this.shakeEndTime = Date.now() + this.shakeDuration;
  }

  findTarget(enemies) {
    let closest = null;
    let closestDistSq = Infinity;
    const rangePx = this.range * CONFIG.CELL_SIZE;
    const rangeSq = rangePx * rangePx;

    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue;
      const distSq = distanceSq(this.x, this.y, enemy.x, enemy.y);

      if (distSq <= rangeSq && distSq < closestDistSq) {
        closest = enemy;
        closestDistSq = distSq;
      }
    }

    return closest;
  }

  addProjectile(data) {
    const projectile = this.game.projectilePool
      ? this.game.projectilePool.acquire(data)
      : data;
    if (!projectile.trail) projectile.trail = [];
    this.projectiles.push(projectile);
  }

  releaseProjectile(index) {
    const projectile = this.projectiles[index];
    this.projectiles.splice(index, 1);
    if (this.game.projectilePool) {
      this.game.projectilePool.release(projectile);
    }
  }

  getAliveEnemies() {
    return this.game.runtimeIndexes
      ? this.game.runtimeIndexes.aliveEnemies
      : this.game.enemies;
  }

  attack(target, now) {
    this.lastAttack = now;
    this.triggerAttackAnimation();

    if (this.type === "fire") {
      this.addProjectile({
        x: this.x,
        y: this.y,
        target: target,
        damage: this.damage,
        burn: true,
        burnDuration: 1500,
        speed: 6,
        rotation: 0,
        trail: [],
        type: 'fire'
      });
    } else if (this.type === "water") {
      this.addProjectile({
        x: this.x,
        y: this.y,
        target: target,
        damage: 0,
        slow: this.slow,
        duration: this.slowDuration,
        speed: 5,
        wavePhase: 0,
        trail: [],
        type: 'water'
      });
    } else if (this.type === "wood") {
      this.addProjectile({
        x: this.x,
        y: this.y,
        target: target,
        damage: this.damage,
        speed: 12,
        trail: [],
        type: 'wood'
      });
    } else if (this.type === "gold") {
      this.pierceAttack(target);
    } else if (this.type === "earth") {
      this.aoeAttack(target);
    } else if (this.type === "xinZhongYan") {
      this.xinZhongYanAttack(target);
    } else if (this.type === "ruFengSiZhen") {
      this.chainAttack(target);
    } else if (this.type === "thunder") {
      this.thunderAttack(target);
    } else if (this.type === "ice") {
      this.iceAttack(target);
    } else if (this.type === "poison") {
      this.poisonAttack(target);
    } else if (this.type === "wind") {
      this.windAttack(target);
    } else if (this.type === "light") {
      this.lightAttack(target);
    } else if (this.type === "dark") {
      this.darkAttack(target);
    } else if (this.type === "star") {
      this.starAttack(target);
    } else if (this.type === "frost") {
      this.frostAttack(target);
    } else if (this.type === "bell") {
      this.bellAttack(target);
    } else if (this.type === "talisman") {
      this.talismanAttack(target);
    } else if (this.type === "arrow") {
      this.arrowAttack(target);
    } else if (this.type === "bunker") {
      this.bunkerAttack(target);
    }
  }

  triggerAttackAnimation() {
    this.isAttacking = true;
    this.attackAnimTime = Date.now();
  }

  pierceAttack(target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const angle = Math.atan2(dy, dx);

    // 添加光束效果
    this.beamEffects.push({
      startX: this.x,
      startY: this.y,
      angle: angle,
      length: 800,
      lifespan: 300,
      maxLifespan: 300,
      startTime: Date.now()
    });

    for (const enemy of this.getAliveEnemies()) {
      if (enemy.hp <= 0) continue;

      const ex = enemy.x - this.x;
      const ey = enemy.y - this.y;
      const enemyAngle = Math.atan2(ey, ex);

      if (Math.abs(angle - enemyAngle) < 0.2) {
        enemy.takeDamage(this.damage);
      }
    }
  }

  aoeAttack(target) {
    const rangePx = this.range * CONFIG.CELL_SIZE;

    // 添加冲击波效果
    this.shockwaves.push({
      x: target.x,
      y: target.y,
      radius: 0,
      maxRadius: rangePx,
      lifespan: 400,
      maxLifespan: 400,
      startTime: Date.now()
    });

    for (const enemy of this.getAliveEnemies()) {
      if (enemy.hp <= 0) continue;
      if (distanceSq(target.x, target.y, enemy.x, enemy.y) <= rangePx * rangePx) {
        enemy.takeDamage(this.damage);
      }
    }
  }

  xinZhongYanAttack(target) {
    // 心中炎：发射心火弹
    this.addProjectile({
      x: this.x,
      y: this.y,
      target: target,
      damage: this.damage,
      burn: true,
      burnDuration: this.burnDuration,
      burnDamage: this.burnDamage,
      speed: 5,
      rotation: 0,
      trail: [],
      type: 'xinZhongYan',
      char: '心'
    });
  }

  chainAttack(target) {
    // 如风似真：风链弹射
    const hitEnemies = new Set();
    let currentTarget = target;
    let chainIndex = 0;

    const chainEffect = {
      segments: [],
      startTime: Date.now(),
      lifespan: 500
    };

    while (currentTarget && chainIndex < this.chainCount) {
      if (hitEnemies.has(currentTarget)) break;

      hitEnemies.add(currentTarget);

      // 记录链路段
      chainEffect.segments.push({
        from: chainIndex === 0 ? { x: this.x, y: this.y } : { x: currentTarget.x, y: currentTarget.y },
        to: { x: currentTarget.x, y: currentTarget.y }
      });

      // 造成伤害
      const damageMultiplier = 1 - (chainIndex * 0.15); // 每次弹射伤害递减
      currentTarget.takeDamage(this.damage * damageMultiplier);

      // 寻找下一个目标
      let nextTarget = null;
      let nextDist = Infinity;

      const chainRangeSq = this.chainRange * this.chainRange;
      for (const enemy of this.getAliveEnemies()) {
        if (enemy.hp <= 0 || hitEnemies.has(enemy)) continue;
        const dist = distanceSq(currentTarget.x, currentTarget.y, enemy.x, enemy.y);
        if (dist <= chainRangeSq && dist < nextDist) {
          nextTarget = enemy;
          nextDist = dist;
        }
      }

      currentTarget = nextTarget;
      chainIndex++;
    }

    // 添加链路视觉效果
    this.chainEffects = this.chainEffects || [];
    this.chainEffects.push(chainEffect);
  }

  thunderAttack(target) {
    const hitEnemies = new Set();
    let currentTarget = target;
    let chainIndex = 0;
    const chainEffect = { segments: [], startTime: Date.now(), lifespan: 500 };

    while (currentTarget && chainIndex < this.chainCount) {
      if (hitEnemies.has(currentTarget)) break;
      hitEnemies.add(currentTarget);

      chainEffect.segments.push({
        from: chainIndex === 0 ? { x: this.x, y: this.y } : { x: currentTarget.x, y: currentTarget.y },
        to: { x: currentTarget.x, y: currentTarget.y }
      });

      let damageMultiplier = 1 - (chainIndex * this.chainDecay);
      if (currentTarget.burning || currentTarget.slowed) {
        damageMultiplier *= this.conductBonus;
      }
      currentTarget.takeDamage(this.damage * damageMultiplier, 'thunder');

      let nextTarget = null;
      let nextDist = Infinity;
      const chainRangeSq = this.chainRange * this.chainRange;
      for (const enemy of this.getAliveEnemies()) {
        if (enemy.hp <= 0 || hitEnemies.has(enemy)) continue;
        const dist = distanceSq(currentTarget.x, currentTarget.y, enemy.x, enemy.y);
        if (dist <= chainRangeSq && dist < nextDist) {
          nextTarget = enemy;
          nextDist = dist;
        }
      }
      currentTarget = nextTarget;
      chainIndex++;
    }
    this.chainEffects.push(chainEffect);
  }

  iceAttack(target) {
    this.addProjectile({
      x: this.x, y: this.y, target: target,
      damage: this.damage, slow: this.slow, duration: this.slowDuration,
      speed: 5, wavePhase: 0, trail: [], type: 'ice'
    });
  }

  poisonAttack(target) {
    this.addProjectile({
      x: this.x, y: this.y, target: target,
      damage: this.damage, speed: 6, trail: [], type: 'poison'
    });
  }

  windAttack(target) {
    this.addProjectile({
      x: this.x, y: this.y, target: target,
      damage: this.damage, speed: 8, trail: [], type: 'wind'
    });
  }

  lightAttack(target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const angle = Math.atan2(dy, dx);

    this.beamEffects.push({
      startX: this.x, startY: this.y, angle: angle,
      length: this.range * CONFIG.CELL_SIZE,
      lifespan: 300, maxLifespan: 300, startTime: Date.now()
    });

    let hitCount = 0;
    for (const enemy of this.getAliveEnemies()) {
      if (enemy.hp <= 0) continue;
      const ex = enemy.x - this.x;
      const ey = enemy.y - this.y;
      const enemyAngle = Math.atan2(ey, ex);
      if (Math.abs(angle - enemyAngle) < 0.2) {
        let dmg = this.damage;
        if (enemy.invisible || enemy.revealed) dmg *= this.revealBonus;
        enemy.takeDamage(dmg, 'light');
        if (enemy.invisible) enemy.applyReveal(this.revealDuration);
        hitCount++;
        if (hitCount >= this.pierceCount + 1) break;
      }
    }
  }

  darkAttack(target) {
    this.addProjectile({
      x: this.x, y: this.y, target: target,
      damage: this.damage, speed: 5, trail: [], type: 'dark'
    });
  }

  starAttack(target) {
    const rand = Math.random();
    let elementType = 'fire';
    let cumulative = 0;
    const chances = this.elementChances;
    for (const [element, chance] of Object.entries(chances)) {
      cumulative += chance;
      if (rand < cumulative) { elementType = element; break; }
    }

    let comboMultiplier = 1;
    if (this.lastElement === elementType) {
      comboMultiplier = 1 + this.comboBonus;
    }
    this.lastElement = elementType;

    this.addProjectile({
      x: this.x, y: this.y, target: target,
      damage: this.damage * comboMultiplier, speed: 6,
      trail: [], type: 'star', elementType: elementType
    });
  }

  frostAttack(target) {
    const rangePx = this.aoeRange * CONFIG.CELL_SIZE;

    this.shockwaves.push({
      x: target.x, y: target.y, radius: 0,
      maxRadius: rangePx, lifespan: 400, maxLifespan: 400,
      startTime: Date.now()
    });

    for (const enemy of this.getAliveEnemies()) {
      if (enemy.hp <= 0) continue;
      if (distanceSq(target.x, target.y, enemy.x, enemy.y) <= rangePx * rangePx) {
        let dmg = this.damage;
        if (enemy.frozen || enemy.slowed) dmg *= this.deepColdBonus;
        enemy.takeDamage(dmg, 'frost');
        if (this.frostSlow > 0) {
          enemy.applySlow(this.frostSlow, this.frostSlowDuration);
        }
      }
    }

    this.frostGrounds.push({
      x: target.x, y: target.y, radius: rangePx,
      startTime: Date.now(), duration: this.frostGroundDuration
    });
  }

  bellAttack(target) {
    const rangePx = this.stunRange * CONFIG.CELL_SIZE;
    this.shockwaves.push({
      x: this.x, y: this.y, radius: 0,
      maxRadius: rangePx, lifespan: 600, maxLifespan: 600,
      startTime: Date.now()
    });
    for (const enemy of this.getAliveEnemies()) {
      if (enemy.hp <= 0 || enemy.flying) continue;
      if (distanceSq(this.x, this.y, enemy.x, enemy.y) <= rangePx * rangePx) {
        enemy.takeDamage(this.damage);
        enemy.applyStun(this.stunDuration);
      }
    }
  }

  talismanAttack(target) {
    if (this.currentMarkCount < this.markCount) {
      this.addProjectile({
        x: this.x, y: this.y, target: target,
        damage: this.damage, speed: 5, trail: [], type: 'talisman'
      });
    }
  }

  arrowAttack(target) {
    this.addProjectile({
      x: this.x, y: this.y, target: target,
      damage: this.damage, speed: 10, trail: [], type: 'arrow'
    });
  }

  bunkerAttack(target) {
    this.addProjectile({
      x: this.x, y: this.y, target: target,
      damage: this.damage, speed: 6, trail: [], type: 'bunker'
    });
  }

  checkTrapTrigger() {
    const triggerRangeSq = (CONFIG.CELL_SIZE * 0.8) ** 2;
    for (const enemy of this.getAliveEnemies()) {
      if (enemy.hp <= 0 || enemy.flying) continue;
      if (distanceSq(this.x, this.y, enemy.x, enemy.y) < triggerRangeSq) {
        enemy.takeDamage(this.damage);
        enemy.applyStun(this.stunDuration);
        this.triggerCount--;
        this.triggerShake();
        if (this.triggerCount <= 0) {
          this.hp = 0;
          return;
        }
        break;
      }
    }
  }

  checkMoatEffect() {
    const triggerRangeSq = (CONFIG.CELL_SIZE * 0.8) ** 2;
    for (const enemy of this.getAliveEnemies()) {
      if (enemy.hp <= 0 || enemy.flying) continue;
      if (distanceSq(this.x, this.y, enemy.x, enemy.y) < triggerRangeSq) {
        enemy.applySlow(this.slow, this.slowDuration);
        enemy.takeDamage(this.damage);
      }
    }
  }

  updateAura() {
    const rangePx = this.auraRange * CONFIG.CELL_SIZE;
    if (this.auraType === 'slow' || this.auraType === 'dot' || this.auraType === 'reveal') {
      for (const enemy of this.getAliveEnemies()) {
        if (enemy.hp <= 0) continue;
        if (distanceSq(this.x, this.y, enemy.x, enemy.y) <= rangePx * rangePx) {
          if (this.auraType === 'slow') {
            enemy.applySlow(this.auraValue, 1500);
          } else if (this.auraType === 'dot') {
            enemy.hp -= this.auraValue / 60;
            if (this.auraSlow) enemy.applySlow(this.auraSlow, 1500);
          } else if (this.auraType === 'reveal') {
            if (enemy.invisible) {
              enemy.revealed = true;
              enemy.revealedEnd = Date.now() + 2000;
            }
          }
        }
      }
    }
  }

  summonSoul() {
    if (this.activeSummons.length >= this.maxSummons) return;
    const summon = {
      x: this.x + (Math.random() - 0.5) * 60,
      y: this.y + (Math.random() - 0.5) * 60,
      hp: this.summonHp,
      maxHp: this.summonHp,
      damage: this.summonDamage,
      range: 2 * CONFIG.CELL_SIZE,
      lastAttack: 0,
      cooldown: 800,
      startTime: Date.now(),
      duration: this.summonDuration
    };
    this.activeSummons.push(summon);
  }

  updateShadowCopy(now) {
    if (now - (this._lastCopyAttack || 0) < 1000) return;
    const neighbors = this.getAdjacentTowers();
    let bestDps = 0;
    let bestTower = null;
    for (const t of neighbors) {
      if (t.isFusion || t.type === 'shadow') continue;
      const dps = t.damage / (t.cooldown / 1000);
      if (dps > bestDps) { bestDps = dps; bestTower = t; }
    }
    if (bestTower) {
      this._lastCopyAttack = now;
      const target = bestTower.findTarget(this.getAliveEnemies());
      if (target) {
        this.triggerAttackAnimation();
        target.takeDamage(bestTower.damage * this.copyEfficiency);
      }
    }
  }

  getAdjacentTowers() {
    const result = [];
    for (const t of this.game.towers) {
      if (t === this) continue;
      const dx = Math.abs(t.gx - this.gx);
      const dy = Math.abs(t.gy - this.gy);
      if (dx <= 1 && dy <= 1) result.push(t);
    }
    return result;
  }

  wheelAttack() {
    this.currentRotation += this.rotationSpeed;
    if (this.currentRotation >= 360) this.currentRotation -= 360;
    const angle = this.currentRotation * Math.PI / 180;
    const halfFan = (this.fanAngle / 2) * Math.PI / 180;
    const rangePx = this.range * CONFIG.CELL_SIZE;

    for (const enemy of this.getAliveEnemies()) {
      if (enemy.hp <= 0) continue;
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      if (dx * dx + dy * dy > rangePx * rangePx) continue;
      const enemyAngle = Math.atan2(dy, dx);
      let angleDiff = Math.abs(enemyAngle - angle);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
      if (angleDiff <= halfFan) {
        enemy.takeDamage(this.damage);
      }
    }
  }

  updateBeamEffects() {
    for (let i = this.beamEffects.length - 1; i >= 0; i--) {
      const elapsed = Date.now() - this.beamEffects[i].startTime;
      if (elapsed > this.beamEffects[i].lifespan) {
        this.beamEffects.splice(i, 1);
      }
    }
  }

  updateShockwaves() {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      const elapsed = Date.now() - sw.startTime;
      if (elapsed > sw.lifespan) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  updateChainEffects() {
    for (let i = this.chainEffects.length - 1; i >= 0; i--) {
      const ce = this.chainEffects[i];
      const elapsed = Date.now() - ce.startTime;
      if (elapsed > ce.lifespan) {
        this.chainEffects.splice(i, 1);
      }
    }
  }

  updateFrostGrounds() {
    const now = Date.now();
    for (let i = this.frostGrounds.length - 1; i >= 0; i--) {
      const fg = this.frostGrounds[i];
      if (now - fg.startTime > fg.duration) {
        this.frostGrounds.splice(i, 1);
      }
    }
  }

  updateProjectiles(deltaTime) {
    // 基准帧率 60fps 对应的时间步长（约 16.67ms）
    const timeScale = deltaTime / 16.67;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      // 检查目标是否已死亡，如果死亡则停止追踪并释放子弹
      if (p.target && (p.target.dead || p.target.hp <= 0)) {
        this.releaseProjectile(i);
        continue;
      }

      if (p.target && !p.target.dead && p.target.hp !== undefined && p.target.hp > 0) {
        const dx = p.target.x - p.x;
        const dy = p.target.y - p.y;
        const distSq = dx * dx + dy * dy;

        // 添加轨迹点
        if (!p.trail) p.trail = [];
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 8) p.trail.shift();

        if (distSq < 100) {
          if (p.damage) {
            const elementType = p.burn ? 'fire' : (p.slow ? 'water' : null);
            p.target.takeDamage(p.damage, elementType);
          }
          if (p.slow) {
            p.target.applySlow(p.slow, p.duration);
          }
          if (p.burn) {
            p.target.applyBurn(p.burnDuration, p.burnDamage || 0);
          }
          if (p.type === 'ice' && p.target.slowed) {
            const towerConfig = CONFIG.TOWERS[this.type];
            if (towerConfig && towerConfig.freezeDuration) {
              p.target.applyFrozen(towerConfig.freezeDuration);
            }
          }
          if (p.type === 'poison' && p.target.applyPoison) {
            const towerConfig = CONFIG.TOWERS[this.type];
            if (towerConfig) {
              p.target.applyPoison(towerConfig.poisonDamage, towerConfig.poisonDuration);
            }
          }
          if (p.type === 'dark' && p.target.applyShadowMark) {
            const towerConfig = CONFIG.TOWERS[this.type];
            if (towerConfig) {
              p.target.applyShadowMark(towerConfig.shadowMarkDuration);
            }
          }
          if (p.type === 'wind') {
            const now = Date.now();
            if (p.target.path && p.target.pathIndex > 0) {
              if (!p.target._lastKnockback || now - p.target._lastKnockback > 3000) {
                p.target._lastKnockback = now;
                p.target.pathIndex = Math.max(0, p.target.pathIndex - 1);
              }
            }
            if (this.dispel) {
              p.target.armor = false;
              p.target.armorReduction = 0;
              if (p.target.invisible) {
                p.target.invisible = false;
                p.target.revealed = true;
                p.target.revealedEnd = Date.now() + 4000;
              }
            }
          }
          if (p.type === 'star' && p.elementType) {
            const et = p.elementType;
            if (et === 'fire') p.target.applyBurn(1500, 0.8);
            else if (et === 'water') p.target.applySlow(0.3, 2000);
            else if (et === 'thunder') {
              let nextTarget = null, nextDist = Infinity;
              for (const e of this.getAliveEnemies()) {
                if (e.hp <= 0 || e === p.target) continue;
                const d = distanceSq(p.target.x, p.target.y, e.x, e.y);
                if (d <= 150 * 150 && d < nextDist) { nextTarget = e; nextDist = d; }
              }
              if (nextTarget) nextTarget.takeDamage(this.damage * 0.5, 'thunder');
            }
            else if (et === 'ice') {
              p.target.applySlow(0.2, 2000);
              if (Math.random() < 0.05) p.target.applyFrozen(1000);
            }
          }
          if (p.type === 'talisman' && p.target.applyMark) {
            const towerConfig = CONFIG.TOWERS[this.type];
            if (towerConfig) {
              p.target.applyMark(towerConfig.markBonus, towerConfig.markDuration);
              this.currentMarkCount++;
              setTimeout(() => { if (this.currentMarkCount > 0) this.currentMarkCount--; }, towerConfig.markDuration);
            }
          }
          if (p.type === 'parasite' && p.target.applyParasite) {
            const towerConfig = CONFIG.TOWERS[this.type];
            if (towerConfig) {
              p.target.applyParasite(towerConfig.parasiteDuration);
            }
          }
          this.releaseProjectile(i);
          continue;
        }

        const dist = Math.sqrt(distSq);
        // 使用 timeScale 实现帧率独立的弹道速度
        const speed = p.speed * timeScale;
        p.x += (dx / dist) * speed;
        p.y += (dy / dist) * speed;

        // 更新特殊动画属性（也基于时间缩放）
        if (p.rotation !== undefined) {
          p.rotation += 0.3 * timeScale;
        }
        if (p.wavePhase !== undefined) {
          p.wavePhase += 0.15 * timeScale;
        }
      } else {
        this.releaseProjectile(i);
      }
    }
  }

  draw(ctx, timestamp) {
    ctx.save();

    if (this.selected) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.range * CONFIG.CELL_SIZE, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 0, 0.3)";
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 0, 0.1)";
      ctx.fill();
    }

    // 计算攻击动画进度（使用传入的 timestamp 或当前时间）
    const now = timestamp || Date.now();
    let attackProgress = 0;

    if (this.isAttacking && this.attackAnimTime > 0) {
      attackProgress = Math.min(1, (now - this.attackAnimTime) / this.attackAnimDuration);
      if (attackProgress >= 1) {
        this.isAttacking = false;
        this.attackAnimTime = 0;
      }
    } else if (this.isAttacking && this.attackAnimTime === 0) {
      // 如果正在攻击但没有设置动画时间，重置状态
      this.isAttacking = false;
    }

    if (this.onPath && this.hp > 0) {
      if (this.type === 'mountain') {
        this.drawMountainTower(ctx, attackProgress);
      } else {
        this.drawPathTower(ctx, attackProgress);
      }
    } else {
      // 根据炮塔类型绘制不同动画效果
      switch (this.type) {
        case 'fire':
          this.drawFireTower(ctx, attackProgress);
          break;
        case 'water':
          this.drawWaterTower(ctx, attackProgress);
          break;
        case 'wood':
          this.drawWoodTower(ctx, attackProgress);
          break;
        case 'gold':
          this.drawGoldTower(ctx, attackProgress);
          break;
        case 'earth':
          this.drawEarthTower(ctx, attackProgress);
          break;
        case 'xinZhongYan':
          this.drawXinZhongYanTower(ctx, attackProgress);
          break;
        case 'ruFengSiZhen':
          this.drawRuFengSiZhenTower(ctx, attackProgress);
          break;
        case 'thunder':
          this.drawThunderTower(ctx, attackProgress);
          break;
        case 'ice':
          this.drawIceTower(ctx, attackProgress);
          break;
        case 'poison':
          this.drawPoisonTower(ctx, attackProgress);
          break;
        case 'wind':
          this.drawWindTower(ctx, attackProgress);
          break;
        case 'light':
          this.drawLightTower(ctx, attackProgress);
          break;
        case 'dark':
          this.drawDarkTower(ctx, attackProgress);
          break;
        case 'star':
          this.drawStarTower(ctx, attackProgress);
          break;
        case 'frost':
          this.drawFrostTower(ctx, attackProgress);
          break;
        case 'drum':
          this.drawDrumTower(ctx, attackProgress);
          break;
        case 'banner':
          this.drawBannerTower(ctx, attackProgress);
          break;
        case 'bell':
          this.drawBellTower(ctx, attackProgress);
          break;
        case 'mirror':
          this.drawMirrorTower(ctx, attackProgress);
          break;
        case 'zither':
          this.drawZitherTower(ctx, attackProgress);
          break;
        case 'talisman':
          this.drawTalismanTower(ctx, attackProgress);
          break;
        case 'formation':
          this.drawFormationTower(ctx, attackProgress);
          break;
        case 'lantern':
          this.drawLanternTower(ctx, attackProgress);
          break;
        case 'treasure':
          this.drawTreasureTower(ctx, attackProgress);
          break;
        case 'healer':
          this.drawHealerTower(ctx, attackProgress);
          break;
        case 'soul':
          this.drawSoulTower(ctx, attackProgress);
          break;
        case 'shadow':
          this.drawShadowTower(ctx, attackProgress);
          break;
        case 'time':
          this.drawTimeTower(ctx, attackProgress);
          break;
        case 'detonator':
          this.drawDetonatorTower(ctx, attackProgress);
          break;
        case 'parasite':
          this.drawParasiteTower(ctx, attackProgress);
          break;
        case 'wheel':
          this.drawWheelTower(ctx, attackProgress);
          break;
        default:
          this.drawBasicTower(ctx, attackProgress);
      }
    }

    ctx.restore();

    // 绘制弹道和特效
    this.drawProjectilesWithAnimation(ctx);
    this.drawBeamEffects(ctx);
    this.drawShockwaves(ctx);
    this.drawChainEffects(ctx);
    this.drawFrostGrounds(ctx);
    this.updateSummons(this.getAliveEnemies());
    this.drawSummons(ctx);
  }

  // === 各炮塔绘制方法 ===

  /**
   * 绘制墨晕底座
   * 统一的墨晕效果绘制方法，减少重复代码
   * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
   * @param {number} x - 中心 x 坐标
   * @param {number} y - 中心 y 坐标
   * @param {string} color - 墨晕颜色（rgba 格式）
   * @param {number} radius - 墨晕半径，默认 18
   */
  drawInkBase(ctx, x, y, color, radius = 18) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y + 5, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawFireTower(ctx, progress) {
    // 火塔：攻击时放大抖动
    let offsetX = 0, offsetY = 0;
    let scale = 1;

    if (this.isAttacking && progress > 0 && progress < 1) {
      // 抖动效果 - 使用基于时间的正弦波，避免每帧随机导致的高频抖动
      const shakeIntensity = 4 * (1 - progress);
      offsetX = Math.sin(progress * Math.PI * 4) * shakeIntensity * 0.5;
      offsetY = Math.cos(progress * Math.PI * 3) * shakeIntensity * 0.5;
      // 放大脉冲
      scale = 1 + 0.2 * Math.sin(progress * Math.PI);
    }

    ctx.font = `bold ${28 * scale}px Microsoft YaHei`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 墨晕底座
    this.drawInkBase(ctx, this.x + offsetX, this.y + offsetY, 'rgba(255, 100, 0, 0.2)');

    // 火焰色渐变
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : "#ff6600";
    ctx.fillText(this.char, this.x + offsetX, this.y + offsetY);

    // 火焰光晕效果（攻击时）
    if (this.isAttacking && progress > 0 && progress < 0.5) {
      ctx.fillStyle = 'rgba(255, 200, 0, 0.3)';
      ctx.beginPath();
      const glowRadius = Math.max(0, 20 * (1 - progress * 2));
      ctx.arc(this.x + offsetX, this.y + offsetY, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    this.drawLevelInfo(ctx);
  }

  drawWaterTower(ctx, progress) {
    // 水塔：攻击时波动涟漪
    let waveOffset = 0;

    if (this.isAttacking && progress < 1) {
      waveOffset = Math.sin(progress * Math.PI * 4) * 3;
    }

    ctx.font = "bold 28px Microsoft YaHei";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 水波纹效果（攻击时）
    if (this.isAttacking && progress > 0 && progress < 1) {
      const rippleRadius = Math.max(0, 20 * progress);
      ctx.strokeStyle = `rgba(0, 170, 255, ${0.5 * (1 - progress)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y + waveOffset, rippleRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 墨晕底座
    this.drawInkBase(ctx, this.x, this.y + waveOffset, 'rgba(0, 100, 200, 0.15)');

    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : "#00aaff";
    ctx.fillText(this.char, this.x, this.y + waveOffset);

    this.drawLevelInfo(ctx);
  }

  drawWoodTower(ctx, progress) {
    // 木塔：攻击时快速弹跳
    let bounceOffset = 0;

    if (this.isAttacking && progress < 1) {
      // 弹跳曲线
      bounceOffset = -Math.sin(progress * Math.PI) * 4;
    }

    ctx.font = "bold 28px Microsoft YaHei";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 墨晕底座
    this.drawInkBase(ctx, this.x, this.y, 'rgba(100, 150, 100, 0.15)');

    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : "#90b090";
    ctx.fillText(this.char, this.x, this.y + bounceOffset);

    this.drawLevelInfo(ctx);
  }

  drawGoldTower(ctx, progress) {
    // 金塔：攻击时闪光效果
    let glowIntensity = 0;

    if (this.isAttacking && progress < 1) {
      glowIntensity = Math.sin(progress * Math.PI);
    }

    ctx.font = "bold 28px Microsoft YaHei";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 金色光晕（攻击时）
    if (glowIntensity > 0) {
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 25);
      gradient.addColorStop(0, `rgba(255, 215, 0, ${glowIntensity * 0.6})`);
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 25, 0, Math.PI * 2);
      ctx.fill();
    }

    // 墨晕底座
    this.drawInkBase(ctx, this.x, this.y, 'rgba(200, 170, 50, 0.15)');

    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : "#ffd700";
    ctx.fillText(this.char, this.x, this.y);

    this.drawLevelInfo(ctx);
  }

  drawEarthTower(ctx, progress) {
    // 土塔：攻击时震动下沉
    let shakeX = 0, shakeY = 0;

    if (this.isAttacking && progress > 0 && progress < 1) {
      // 使用基于时间的正弦波替代随机，避免高频抖动
      shakeX = Math.sin(progress * Math.PI * 5) * 1.5;
      shakeY = Math.sin(progress * Math.PI) * 3; // 下沉效果
    }

    ctx.font = "bold 28px Microsoft YaHei";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 墨晕底座
    this.drawInkBase(ctx, this.x, this.y, 'rgba(139, 115, 85, 0.2)');

    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : "#8b7355";
    ctx.fillText(this.char, this.x + shakeX, this.y + shakeY);

    this.drawLevelInfo(ctx);
  }

  drawXinZhongYanTower(ctx, progress) {
    // 心中炎：心火脉动效果
    let scale = 1;
    let glowIntensity = 0;

    if (this.isAttacking && progress < 1) {
      scale = 1 + 0.2 * Math.sin(progress * Math.PI);
      glowIntensity = Math.sin(progress * Math.PI);
    }

    // 心火光晕
    if (glowIntensity > 0) {
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 30);
      gradient.addColorStop(0, `rgba(255, 100, 50, ${glowIntensity * 0.6})`);
      gradient.addColorStop(0.5, `rgba(255, 50, 100, ${glowIntensity * 0.3})`);
      gradient.addColorStop(1, 'rgba(255, 0, 50, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 30, 0, Math.PI * 2);
      ctx.fill();
    }

    // 墨晕底座
    this.drawInkBase(ctx, this.x, this.y, 'rgba(255, 80, 80, 0.2)', 20);

    // 绘制"心中炎"三字 - 第一行两字，第二行一字
    ctx.font = `bold ${16 * scale}px "Ma Shan Zheng", cursive`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : "#ff5050";
    ctx.fillText("心中", this.x, this.y - 8);
    ctx.fillText("炎", this.x, this.y + 10);

    this.drawLevelInfo(ctx);
  }

  drawRuFengSiZhenTower(ctx, progress) {
    let windOffset = 0;

    if (this.isAttacking && progress < 1) {
      windOffset = Math.sin(progress * Math.PI * 3) * 3;
    }

    ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const startX = this.x - 25 + i * 20;
      const startY = this.y - 10 + Math.sin(Date.now() / 400 + i) * 5;
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(startX + 10, startY - 5, startX + 20, startY);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(100, 180, 220, 0.2)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 14px "Ma Shan Zheng", cursive';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : "#64b4dc";
    ctx.fillText("如风", this.x + windOffset, this.y - 8);
    ctx.fillText("似真", this.x + windOffset, this.y + 8);

    this.drawLevelInfo(ctx);
  }

  drawThunderTower(ctx, progress) {
    let scale = 1;
    if (this.isAttacking && progress < 1) {
      scale = 1 + 0.15 * Math.sin(progress * Math.PI);
    }
    ctx.font = `bold ${28 * scale}px "Ma Shan Zheng", cursive`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'rgba(179, 136, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    if (this.isAttacking && progress > 0 && progress < 0.5) {
      ctx.fillStyle = 'rgba(179, 136, 255, 0.4)';
      ctx.beginPath();
      const glowRadius = Math.max(0, 20 * (1 - progress * 2));
      ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.thunder;
    ctx.fillText(this.char, this.x, this.y);
    this.drawLevelInfo(ctx);
  }

  drawIceTower(ctx, progress) {
    let waveOffset = 0;
    if (this.isAttacking && progress < 1) {
      waveOffset = Math.sin(progress * Math.PI * 4) * 3;
    }
    ctx.font = 'bold 28px "Ma Shan Zheng", cursive';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (this.isAttacking && progress > 0 && progress < 1) {
      ctx.strokeStyle = `rgba(128, 216, 255, ${0.5 * (1 - progress)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const rippleRadius = Math.max(0, 20 * progress);
      ctx.arc(this.x, this.y + waveOffset, rippleRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(128, 216, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + waveOffset + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.ice;
    ctx.fillText(this.char, this.x, this.y + waveOffset);
    this.drawLevelInfo(ctx);
  }

  drawPoisonTower(ctx, progress) {
    let bounceOffset = 0;
    if (this.isAttacking && progress < 1) {
      bounceOffset = -Math.sin(progress * Math.PI) * 3;
    }
    ctx.font = 'bold 28px "Ma Shan Zheng", cursive';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'rgba(118, 255, 3, 0.15)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.poison;
    ctx.fillText(this.char, this.x, this.y + bounceOffset);
    this.drawLevelInfo(ctx);
  }

  drawWindTower(ctx, progress) {
    let windOffset = 0;
    if (this.isAttacking && progress < 1) {
      windOffset = Math.sin(progress * Math.PI * 6) * 3;
    }
    ctx.font = 'bold 28px "Ma Shan Zheng", cursive';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = 'rgba(176, 190, 197, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const startX = this.x - 20 + i * 15;
      const startY = this.y - 8 + Math.sin(Date.now() / 300 + i) * 4;
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(startX + 8, startY - 4, startX + 16, startY);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(176, 190, 197, 0.15)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.wind;
    ctx.fillText(this.char, this.x + windOffset, this.y);
    this.drawLevelInfo(ctx);
  }

  drawLightTower(ctx, progress) {
    let glowIntensity = 0;
    if (this.isAttacking && progress < 1) {
      glowIntensity = Math.sin(progress * Math.PI);
    }
    ctx.font = 'bold 28px "Ma Shan Zheng", cursive';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (glowIntensity > 0) {
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 25);
      gradient.addColorStop(0, `rgba(255, 249, 196, ${glowIntensity * 0.6})`);
      gradient.addColorStop(1, 'rgba(255, 249, 196, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255, 249, 196, 0.2)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.light;
    ctx.fillText(this.char, this.x, this.y);
    this.drawLevelInfo(ctx);
  }

  drawDarkTower(ctx, progress) {
    let scale = 1;
    if (this.isAttacking && progress < 1) {
      scale = 1 + 0.1 * Math.sin(progress * Math.PI);
    }
    ctx.font = `bold ${28 * scale}px "Ma Shan Zheng", cursive`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'rgba(124, 77, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    if (this.isAttacking && progress > 0 && progress < 0.5) {
      ctx.fillStyle = 'rgba(124, 77, 255, 0.3)';
      ctx.beginPath();
      const glowRadius = Math.max(0, 22 * (1 - progress * 2));
      ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.dark;
    ctx.fillText(this.char, this.x, this.y);
    this.drawLevelInfo(ctx);
  }

  drawStarTower(ctx, progress) {
    let scale = 1;
    if (this.isAttacking && progress < 1) {
      scale = 1 + 0.1 * Math.sin(progress * Math.PI);
    }
    ctx.font = `bold ${28 * scale}px "Ma Shan Zheng", cursive`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'rgba(224, 224, 224, 0.15)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    const starColor = this.lastElement === 'fire' ? '#ff6600' :
                      this.lastElement === 'water' ? '#00aaff' :
                      this.lastElement === 'thunder' ? '#b388ff' :
                      this.lastElement === 'ice' ? '#80d8ff' : CONFIG.COLORS.star;
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : starColor;
    ctx.fillText(this.char, this.x, this.y);
    this.drawLevelInfo(ctx);
  }

  drawFrostTower(ctx, progress) {
    let shakeX = 0, shakeY = 0;
    if (this.isAttacking && progress > 0 && progress < 1) {
      // 使用基于时间的正弦波替代随机，避免高频抖动
      shakeX = Math.sin(progress * Math.PI * 4) * 1.5;
      shakeY = Math.sin(progress * Math.PI) * 3;
    }
    ctx.font = 'bold 28px "Ma Shan Zheng", cursive';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'rgba(179, 229, 252, 0.2)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.frost;
    ctx.fillText(this.char, this.x + shakeX, this.y + shakeY);
    this.drawLevelInfo(ctx);
  }

  drawMountainTower(ctx, progress) {
    // 山塔：受击时震动
    ctx.font = "bold 28px Microsoft YaHei";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#888888";
    ctx.fillText(this.char, this.x + this.shakeOffset.x, this.y + this.shakeOffset.y);

    ctx.font = "12px Microsoft YaHei";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${this.hp}/${this.maxHp}`, this.x, this.y - 20);

    const barWidth = 30;
    const barHeight = 4;
    ctx.fillStyle = "#333";
    ctx.fillRect(this.x - barWidth / 2, this.y + 18, barWidth, barHeight);
    ctx.fillStyle = "#00ff00";
    ctx.fillRect(
      this.x - barWidth / 2,
      this.y + 18,
      barWidth * (this.hp / this.maxHp),
      barHeight,
    );
  }

  drawDrumTower(ctx, progress) {
    const pulse = Math.sin(Date.now() / 500) * 0.1 + 1;
    ctx.font = `bold ${28 * pulse}px "Ma Shan Zheng", cursive`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'rgba(255, 138, 101, 0.15)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 138, 101, ${0.3 + Math.sin(Date.now() / 1000) * 0.15})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.auraRange * CONFIG.CELL_SIZE, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.drum;
    ctx.fillText(this.char, this.x, this.y);
    this.drawLevelInfo(ctx);
  }

  drawBannerTower(ctx, progress) {
    const windOffset = Math.sin(Date.now() / 400) * 2;
    ctx.font = 'bold 28px "Ma Shan Zheng", cursive';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'rgba(239, 83, 80, 0.15)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(239, 83, 80, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.auraRange * CONFIG.CELL_SIZE, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.banner;
    ctx.fillText(this.char, this.x + windOffset, this.y);
    this.drawLevelInfo(ctx);
  }

  drawBellTower(ctx, progress) {
    let scale = 1;
    if (this.isAttacking && progress < 1) {
      scale = 1 + 0.2 * Math.sin(progress * Math.PI);
    }
    ctx.font = `bold ${28 * scale}px "Ma Shan Zheng", cursive`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'rgba(255, 213, 79, 0.2)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.bell;
    ctx.fillText(this.char, this.x, this.y);
    this.drawLevelInfo(ctx);
  }

  drawMirrorTower(ctx, progress) {
    const shimmer = Math.sin(Date.now() / 300) * 0.1 + 0.9;
    ctx.font = `bold ${28 * shimmer}px "Ma Shan Zheng", cursive`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'rgba(224, 224, 224, 0.2)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.mirror;
    ctx.fillText(this.char, this.x, this.y);
    this.drawLevelInfo(ctx);
  }

  drawZitherTower(ctx, progress) {
    ctx.font = 'bold 28px "Ma Shan Zheng", cursive';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'rgba(206, 147, 216, 0.15)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(206, 147, 216, ${0.2 + Math.sin(Date.now() / 800) * 0.1})`;
    ctx.lineWidth = 1;
    const rippleRadius = this.auraRange * CONFIG.CELL_SIZE;
    ctx.beginPath();
    ctx.arc(this.x, this.y, rippleRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.zither;
    ctx.fillText(this.char, this.x, this.y);
    this.drawLevelInfo(ctx);
  }

  drawTalismanTower(ctx, progress) {
    let bounceOffset = 0;
    if (this.isAttacking && progress < 1) {
      bounceOffset = -Math.sin(progress * Math.PI) * 3;
    }
    ctx.font = 'bold 28px "Ma Shan Zheng", cursive';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'rgba(255, 204, 2, 0.15)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.talisman;
    ctx.fillText(this.char, this.x, this.y + bounceOffset);
    this.drawLevelInfo(ctx);
  }

  drawFormationTower(ctx, progress) {
    ctx.font = 'bold 28px "Ma Shan Zheng", cursive';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'rgba(171, 71, 188, 0.2)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(171, 71, 188, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.auraRange * CONFIG.CELL_SIZE, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.formation;
    ctx.fillText(this.char, this.x, this.y);
    this.drawLevelInfo(ctx);
  }

  drawLanternTower(ctx, progress) {
    const flicker = Math.sin(Date.now() / 200) * 0.05 + 1;
    ctx.font = `bold ${28 * flicker}px "Ma Shan Zheng", cursive`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'rgba(255, 224, 130, 0.2)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.auraRange * CONFIG.CELL_SIZE);
    gradient.addColorStop(0, 'rgba(255, 224, 130, 0.08)');
    gradient.addColorStop(1, 'rgba(255, 224, 130, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.auraRange * CONFIG.CELL_SIZE, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.lantern;
    ctx.fillText(this.char, this.x, this.y);
    this.drawLevelInfo(ctx);
  }

  drawTreasureTower(ctx, progress) {
    const sparkle = Math.sin(Date.now() / 300) * 0.1 + 1;
    ctx.font = `bold ${28 * sparkle}px "Ma Shan Zheng", cursive`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.treasure;
    ctx.fillText(this.char, this.x, this.y);
    this.drawLevelInfo(ctx);
  }

  drawHealerTower(ctx, progress) {
    const pulse = Math.sin(Date.now() / 600) * 0.1 + 1;
    ctx.font = `bold ${28 * pulse}px "Ma Shan Zheng", cursive`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'rgba(129, 199, 132, 0.2)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.healer;
    ctx.fillText(this.char, this.x, this.y);
    this.drawLevelInfo(ctx);
  }

  drawSoulTower(ctx, progress) {
    const ghostPulse = Math.sin(Date.now() / 400) * 0.1 + 1;
    ctx.font = `bold ${28 * ghostPulse}px "Ma Shan Zheng", cursive`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'rgba(176, 190, 197, 0.15)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.soul;
    ctx.fillText(this.char, this.x, this.y);
    this.drawLevelInfo(ctx);
  }

  drawShadowTower(ctx, progress) {
    const shadowPulse = Math.sin(Date.now() / 500) * 0.1 + 0.9;
    ctx.font = `bold ${28 * shadowPulse}px "Ma Shan Zheng", cursive`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'rgba(66, 66, 66, 0.3)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.shadow;
    ctx.fillText(this.char, this.x, this.y);
    this.drawLevelInfo(ctx);
  }

  drawTimeTower(ctx, progress) {
    ctx.font = 'bold 28px "Ma Shan Zheng", cursive';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'rgba(158, 158, 158, 0.2)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.time;
    ctx.fillText(this.char, this.x, this.y);
    this.drawLevelInfo(ctx);
  }

  drawDetonatorTower(ctx, progress) {
    const pulse = Math.sin(Date.now() / 200) * 0.15 + 1;
    ctx.font = `bold ${28 * pulse}px "Ma Shan Zheng", cursive`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'rgba(255, 87, 34, 0.25)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.detonator;
    ctx.fillText(this.char, this.x, this.y);
    this.drawLevelInfo(ctx);
  }

  drawParasiteTower(ctx, progress) {
    let bounceOffset = 0;
    if (this.isAttacking && progress < 1) {
      bounceOffset = -Math.sin(progress * Math.PI) * 3;
    }
    ctx.font = 'bold 28px "Ma Shan Zheng", cursive';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'rgba(105, 240, 174, 0.15)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.parasite;
    ctx.fillText(this.char, this.x, this.y + bounceOffset);
    this.drawLevelInfo(ctx);
  }

  drawWheelTower(ctx, progress) {
    ctx.font = 'bold 28px "Ma Shan Zheng", cursive';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'rgba(255, 171, 64, 0.2)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    const angle = this.currentRotation * Math.PI / 180;
    ctx.strokeStyle = 'rgba(255, 171, 64, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + Math.cos(angle) * 25, this.y + Math.sin(angle) * 25);
    ctx.stroke();
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.wheel;
    ctx.fillText(this.char, this.x, this.y);
    this.drawLevelInfo(ctx);
  }

  drawPathTower(ctx, progress) {
    const colorMap = {
      wall: CONFIG.COLORS.wall,
      moat: CONFIG.COLORS.moat,
      trap: CONFIG.COLORS.trap,
      arrow: CONFIG.COLORS.arrow,
      bunker: CONFIG.COLORS.bunker,
      palisade: CONFIG.COLORS.palisade,
      volcano: '#ff8844',
      'water+mountain': '#4488ff'
    };
    const color = colorMap[this.type] || '#888888';

    ctx.font = 'bold 28px "Ma Shan Zheng", cursive';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = `${color}44`;
    ctx.beginPath();
    ctx.arc(this.x + this.shakeOffset.x, this.y + this.shakeOffset.y, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.fillText(this.char, this.x + this.shakeOffset.x, this.y + this.shakeOffset.y);

    ctx.font = '12px Microsoft YaHei';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${this.hp}/${this.maxHp}`, this.x, this.y - 20);

    const barWidth = 30;
    const barHeight = 4;
    ctx.fillStyle = '#333';
    ctx.fillRect(this.x - barWidth / 2, this.y + 18, barWidth, barHeight);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(this.x - barWidth / 2, this.y + 18, barWidth * (this.hp / this.maxHp), barHeight);

    if (this.type === 'trap' && this.triggerCount > 0) {
      ctx.font = '10px Microsoft YaHei';
      ctx.fillStyle = '#aaa';
      ctx.fillText(`${this.triggerCount}`, this.x, this.y + 28);
    }
  }

  drawBasicTower(ctx, progress) {
    ctx.font = "bold 28px Microsoft YaHei";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.tower;
    ctx.fillText(this.char, this.x, this.y);

    this.drawLevelInfo(ctx);
  }

  drawLevelInfo(ctx) {
    if (this.level > 1) {
      ctx.font = "12px Microsoft YaHei";
      ctx.fillStyle = "#888";
      ctx.fillText(`Lv${this.level}`, this.x, this.y + 20);
    }
  }

  // === 抛射物绘制方法（包含弹道、特效文字等） ===

  drawProjectilesWithAnimation(ctx) {
    for (const p of this.projectiles) {
      ctx.save();

      // 绘制拖尾效果
      this.drawTrail(ctx, p);

      ctx.font = "16px Microsoft YaHei";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      switch (p.type) {
        case 'fire':
          this.drawFireProjectile(ctx, p);
          break;
        case 'water':
          this.drawWaterProjectile(ctx, p);
          break;
        case 'wood':
          this.drawWoodProjectile(ctx, p);
          break;
        case 'xinZhongYan':
          this.drawXinZhongYanProjectile(ctx, p);
          break;
        case 'ice':
          this.drawIceProjectile(ctx, p);
          break;
        case 'poison':
          this.drawPoisonProjectile(ctx, p);
          break;
        case 'wind':
          this.drawWindProjectile(ctx, p);
          break;
        case 'dark':
          this.drawDarkProjectile(ctx, p);
          break;
        case 'star':
          this.drawStarProjectile(ctx, p);
          break;
        case 'talisman':
          ctx.fillStyle = CONFIG.COLORS.talisman;
          ctx.fillText(this.char, p.x, p.y);
          break;
        case 'arrow':
          ctx.fillStyle = CONFIG.COLORS.arrow;
          ctx.fillText(this.char, p.x, p.y);
          break;
        case 'bunker':
          ctx.fillStyle = CONFIG.COLORS.bunker;
          ctx.fillText(this.char, p.x, p.y);
          break;
        case 'parasite':
          ctx.fillStyle = CONFIG.COLORS.parasite;
          ctx.fillText(this.char, p.x, p.y);
          break;
        default:
          ctx.fillStyle = CONFIG.COLORS.projectile;
          ctx.fillText(this.char, p.x, p.y);
      }

      ctx.restore();
    }
  }

  drawTrail(ctx, p) {
    if (!p.trail || p.trail.length < 2) return;

    for (let i = 0; i < p.trail.length - 1; i++) {
      const alpha = (i + 1) / p.trail.length * 0.4;
      const size = 8 * (i / p.trail.length);

      let color;
      switch (p.type) {
        case 'fire':
          color = `rgba(255, 100, 0, ${alpha})`;
          break;
        case 'water':
          color = `rgba(0, 170, 255, ${alpha})`;
          break;
        case 'wood':
          color = `rgba(100, 100, 100, ${alpha})`;
          break;
        case 'xinZhongYan':
          color = `rgba(255, 80, 100, ${alpha})`;
          break;
        case 'ice':
          color = `rgba(128, 216, 255, ${alpha})`;
          break;
        case 'poison':
          color = `rgba(118, 255, 3, ${alpha})`;
          break;
        case 'wind':
          color = `rgba(176, 190, 197, ${alpha})`;
          break;
        case 'dark':
          color = `rgba(124, 77, 255, ${alpha})`;
          break;
        case 'star':
          color = `rgba(224, 224, 224, ${alpha})`;
          break;
        case 'talisman':
          color = `rgba(255, 204, 2, ${alpha})`;
          break;
        case 'arrow':
          color = `rgba(161, 136, 127, ${alpha})`;
          break;
        case 'bunker':
          color = `rgba(96, 125, 139, ${alpha})`;
          break;
        case 'parasite':
          color = `rgba(105, 240, 174, ${alpha})`;
          break;
        default:
          color = `rgba(100, 100, 100, ${alpha})`;
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.trail[i].x, p.trail[i].y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawFireProjectile(ctx, p) {
    // 火焰旋转效果
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation || 0);

    // 火焰光晕
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
    gradient.addColorStop(0, 'rgba(255, 200, 0, 0.6)');
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();

    // 火字
    ctx.fillStyle = "#ff6600";
    ctx.fillText(this.char, 0, 0);
  }

  drawWaterProjectile(ctx, p) {
    // 水波纹飘动效果
    const waveOffset = Math.sin(p.wavePhase || 0) * 3;
    const finalY = p.y + waveOffset;

    // 水波纹
    ctx.strokeStyle = 'rgba(0, 170, 255, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const radius = 8 + i * 4;
      ctx.beginPath();
      ctx.arc(p.x, finalY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 水字
    ctx.fillStyle = "#00aaff";
    ctx.fillText(this.char, p.x, finalY);
  }

  drawWoodProjectile(ctx, p) {
    // 木塔弹道：简洁墨迹效果
    ctx.fillStyle = "#90b090";
    ctx.fillText(this.char, p.x, p.y);

    // 轻微旋转
    ctx.translate(p.x, p.y);
    const angle = (p.x + p.y) % 360 * Math.PI / 180 * 0.1;
    ctx.rotate(angle);
  }

  drawXinZhongYanProjectile(ctx, p) {
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation || 0);

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
    gradient.addColorStop(0, 'rgba(255, 150, 100, 0.7)');
    gradient.addColorStop(0.5, 'rgba(255, 80, 100, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 50, 80, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "bold 14px 'Ma Shan Zheng', cursive";
    ctx.fillStyle = "#ff5060";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("心", 0, 0);
  }

  drawIceProjectile(ctx, p) {
    const waveOffset = Math.sin(p.wavePhase || 0) * 3;
    ctx.fillStyle = CONFIG.COLORS.ice;
    ctx.fillText(this.char, p.x, p.y + waveOffset);
    ctx.strokeStyle = 'rgba(128, 216, 255, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.arc(p.x, p.y + waveOffset, 6 + i * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawPoisonProjectile(ctx, p) {
    ctx.fillStyle = CONFIG.COLORS.poison;
    ctx.fillText(this.char, p.x, p.y);
  }

  drawWindProjectile(ctx, p) {
    ctx.fillStyle = CONFIG.COLORS.wind;
    ctx.fillText(this.char, p.x, p.y);
  }

  drawDarkProjectile(ctx, p) {
    ctx.fillStyle = CONFIG.COLORS.dark;
    ctx.fillText(this.char, p.x, p.y);
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12);
    gradient.addColorStop(0, 'rgba(124, 77, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(124, 77, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  drawStarProjectile(ctx, p) {
    const color = p.elementType === 'fire' ? '#ff6600' :
                  p.elementType === 'water' ? '#00aaff' :
                  p.elementType === 'thunder' ? '#b388ff' :
                  p.elementType === 'ice' ? '#80d8ff' : '#e0e0e0';
    ctx.fillStyle = color;
    ctx.fillText(this.char, p.x, p.y);
  }

  drawBeamEffects(ctx) {
    for (const beam of this.beamEffects) {
      const elapsed = Date.now() - beam.startTime;
      const progress = elapsed / beam.maxLifespan;
      const alpha = 1 - progress;

      ctx.save();

      // 光束主体
      ctx.translate(beam.startX, beam.startY);
      ctx.rotate(beam.angle);

      // 光束渐变
      const gradient = ctx.createLinearGradient(0, 0, beam.length, 0);
      gradient.addColorStop(0, `rgba(255, 215, 0, ${alpha * 0.8})`);
      gradient.addColorStop(0.5, `rgba(255, 200, 100, ${alpha * 0.5})`);
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, -3, beam.length * (1 - progress * 0.3), 6);

      // 光束中心线
      ctx.strokeStyle = `rgba(255, 255, 200, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(beam.length * 0.8, 0);
      ctx.stroke();

      ctx.restore();
    }
  }

  drawShockwaves(ctx) {
    for (const sw of this.shockwaves) {
      const elapsed = Date.now() - sw.startTime;
      const progress = elapsed / sw.maxLifespan;
      const alpha = 1 - progress;
      const currentRadius = sw.maxRadius * progress;

      ctx.save();

      // 冲击波环
      ctx.strokeStyle = `rgba(139, 115, 85, ${alpha * 0.8})`;
      ctx.lineWidth = 3 * (1 - progress);
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, currentRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 内圈
      ctx.strokeStyle = `rgba(180, 150, 100, ${alpha * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, currentRadius * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      // 土元素中心标记
      if (progress < 0.5) {
        ctx.fillStyle = `rgba(139, 115, 85, ${alpha * 0.6})`;
        ctx.font = "20px Microsoft YaHei";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("土", sw.x, sw.y);
      }

      ctx.restore();
    }
  }

  drawChainEffects(ctx) {
    for (const ce of this.chainEffects) {
      const elapsed = Date.now() - ce.startTime;
      const progress = elapsed / ce.lifespan;
      const alpha = Math.max(0, 1 - progress);

      ctx.save();

      for (let i = 0; i < ce.segments.length; i++) {
        const seg = ce.segments[i];
        const segmentAlpha = Math.max(0, alpha * (1 - i * 0.1));

        ctx.strokeStyle = `rgba(100, 200, 255, ${segmentAlpha * 0.8})`;
        ctx.lineWidth = Math.max(1, 3 * (1 - progress));
        ctx.beginPath();
        ctx.moveTo(seg.from.x, seg.from.y);
        ctx.lineTo(seg.to.x, seg.to.y);
        ctx.stroke();

        if (segmentAlpha > 0.3) {
          ctx.strokeStyle = `rgba(200, 240, 255, ${segmentAlpha})`;
          ctx.lineWidth = 1;
          const midX = (seg.from.x + seg.to.x) / 2;
          const midY = (seg.from.y + seg.to.y) / 2;
          ctx.beginPath();
          ctx.moveTo(seg.from.x, seg.from.y);
          ctx.quadraticCurveTo(
            midX + (Math.random() - 0.5) * 20,
            midY + (Math.random() - 0.5) * 20,
            seg.to.x, seg.to.y
          );
          ctx.stroke();
        }

        const radius = Math.max(1, 10 * (1 - progress));
        ctx.fillStyle = `rgba(100, 200, 255, ${segmentAlpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(seg.to.x, seg.to.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  drawFrostGrounds(ctx) {
    const now = Date.now();
    for (const fg of this.frostGrounds) {
      const elapsed = now - fg.startTime;
      const alpha = Math.max(0, 0.15 * (1 - elapsed / fg.duration));
      ctx.fillStyle = `rgba(179, 229, 252, ${alpha})`;
      ctx.beginPath();
      ctx.arc(fg.x, fg.y, fg.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  updateSummons(enemies) {
    const now = Date.now();
    for (let i = this.activeSummons.length - 1; i >= 0; i--) {
      const s = this.activeSummons[i];
      if (now - s.startTime > s.duration || s.hp <= 0) {
        this.activeSummons.splice(i, 1);
        continue;
      }
      if (now - s.lastAttack >= s.cooldown) {
        let closest = null, closestDist = Infinity;
        for (const e of enemies) {
          if (e.hp <= 0) continue;
          const d = distanceSq(s.x, s.y, e.x, e.y);
          if (d <= s.range * s.range && d < closestDist) { closest = e; closestDist = d; }
        }
        if (closest) {
          s.lastAttack = now;
          closest.takeDamage(s.damage);
        }
      }
    }
  }

  drawSummons(ctx) {
    for (const s of this.activeSummons) {
      const alpha = 0.6;
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 20px "Ma Shan Zheng", cursive';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = CONFIG.COLORS.soul;
      ctx.fillText('灵', s.x, s.y);
      ctx.font = '10px Microsoft YaHei';
      ctx.fillStyle = '#aaa';
      ctx.fillText(`${s.hp}/${s.maxHp}`, s.x, s.y - 14);
      ctx.globalAlpha = 1;
    }
  }

  takeDamage(amount) {
    if (this.damageReduction > 0) {
      amount = amount * (1 - this.damageReduction);
    }
    this.hp -= amount;
    this.triggerShake();
    return this.hp <= 0;
  }
}

class FusionSkillExecutor {
  static execute(tower, target) {
    const params = tower.skillParams || {};
    if (params.passive) return true;

    const actions = Array.isArray(params.actions) && params.actions.length > 0
      ? params.actions
      : tower.components;
    const repeat = Math.max(1, params.repeat || 1);
    const damageMultiplier = params.damageMultiplier || 1;

    for (let i = 0; i < repeat; i++) {
      for (const action of actions) {
        this.executeAction(tower, action, target, damageMultiplier);
      }
    }
    return true;
  }

  static executeAction(tower, action, target, damageMultiplier) {
    const originDamage = tower.damage;
    tower.damage = Math.round(originDamage * damageMultiplier * 10) / 10;
    try {
      tower.executeComponentAttack(action, target);
    } finally {
      tower.damage = originDamage;
    }
  }
}

// === 融合炮塔类 ===
class FusionTower extends Tower {
  constructor(fusionType, gx, gy, game) {
    // 传入一个空类型，避免从 CONFIG.TOWERS 获取配置
    super('fusion', gx, gy, game);

    let config = CONFIG.FUSION_TOWERS[fusionType];
    if (!config) {
      const parts = fusionType.split('+');
      if (parts.length === 2) {
        const reversedKey = parts[1] + '+' + parts[0];
        config = CONFIG.FUSION_TOWERS[reversedKey];
      }
    }
    if (!config) {
      console.error(`Fusion config not found: ${fusionType}`);
      // 创建降级对象而不是提前返回
      this.type = 'fusion';
      this.fusionType = fusionType;
      this.components = [];
      this.isFusion = true;
      this.maxLevel = 1;
      this.hp = 0;
      this.damage = 0;
      this.range = 0;
      this.cost = 0;
      this.char = '?';
      this.level = 1;
      this.cooldown = 1000;
      this.lastAttack = 0;
      this.skillId = '';
      this.skillParams = {};
      this.tier = 1;
      this.isEvolution = false;
      this.evolutionFrom = null;
      this.slow = 0;
      this.slowDuration = 0;
      this.pierce = false;
      this.aoe = false;
      return;
    }

    // 覆盖从父类继承的属性
    this.type = fusionType;
    this.fusionType = fusionType;
    this.components = config.components || [];
    this.isFusion = true;
    this.maxLevel = 1; // 融合炮塔不可升级

    // 从融合配置中设置属性
    this.char = config.char;
    this.level = 1;
    this.damage = config.damage || 0;
    this.range = config.range || 5;
    this.cooldown = config.cooldown || 1000;
    this.lastAttack = 0;
    this.cost = config.cost;
    this.skillId = config.skillId || '';
    this.skillParams = config.skillParams || {};
    this.tier = config.tier || 1;
    this.isEvolution = !!config.isEvolution;
    this.evolutionFrom = config.evolutionFrom || null;

    // 特殊属性
    this.slow = config.slow || 0;
    this.slowDuration = config.slowDuration || 0;
    this.pierce = config.pierce || false;
    this.aoe = config.aoe || false;
    this.onPath = config.onPath || false;
    this.burn = config.burn || false;
    this.burnDuration = config.burnDuration || 0;
    this.chain = config.chain || false;
    this.chainCount = config.chainCount || this.chainCount;
    this.chainRange = config.chainRange || this.chainRange;
    this.chainDecay = config.chainDecay || this.chainDecay;
    this.aura = config.aura || false;
    this.auraRange = config.auraRange || this.auraRange;
    this.auraType = config.auraType || this.auraType;
    this.auraValue = config.auraValue || this.auraValue;
    this.extraAuras = config.extraAuras || this.extraAuras;
    this.stunDuration = config.stunDuration || this.stunDuration;

    // 山塔属性
    this.hp = config.hp || 0;
    this.maxHp = this.hp;

    // 融合炮塔特有属性
    this.fusionChar = config.fusionChar || '';
    this.fusionColor = config.color || '#ff8844';

    // 初始化特效数组（确保父类已初始化）
    if (!this.projectiles) this.projectiles = [];
    if (!this.beamEffects) this.beamEffects = [];
    if (!this.shockwaves) this.shockwaves = [];
  }

  attack(target, now) {
    this.lastAttack = now;
    this.triggerAttackAnimation();
    if (!FusionSkillExecutor.execute(this, target)) {
      for (const componentType of this.components) {
        this.executeComponentAttack(componentType, target);
      }
    }
  }

  executeComponentAttack(type, target) {
    switch(type) {
      case 'fire':
        this.fireAttack(target);
        break;
      case 'water':
        this.waterAttack(target);
        break;
      case 'wood':
        this.woodAttack(target);
        break;
      case 'gold':
        this.goldAttack(target);
        break;
      case 'earth':
        this.earthAttack(target);
        break;
      case 'thunder':
        this.thunderAttack(target);
        break;
      case 'ice':
        this.iceAttack(target);
        break;
      case 'poison':
        this.poisonAttack(target);
        break;
      case 'wind':
        this.windAttack(target);
        break;
      case 'light':
        this.lightAttack(target);
        break;
      case 'dark':
        this.darkAttack(target);
        break;
      case 'bell':
        this.bellAttack(target);
        break;
      case 'parasite':
        this.addProjectile({
          x: this.x, y: this.y, target,
          damage: this.damage, speed: 6, trail: [], type: 'parasite',
        });
        break;
      case 'arrow':
        this.arrowAttack(target);
        break;
      case 'bunker':
        this.bunkerAttack(target);
        break;
      case 'mountain':
      case 'wall':
      case 'moat':
      case 'trap':
      case 'palisade':
      case 'drum':
      case 'banner':
      case 'mirror':
        break;
      default:
        this.woodAttack(target);
    }
  }

  fireAttack(target) {
    this.addProjectile({
      x: this.x,
      y: this.y,
      target: target,
      damage: this.damage,
      burn: this.burn || true,
      burnDuration: this.burnDuration || 1500,
      speed: 6,
      rotation: 0,
      trail: [],
      type: 'fire'
    });
  }

  waterAttack(target) {
    this.addProjectile({
      x: this.x,
      y: this.y,
      target: target,
      damage: 0,
      slow: this.slow,
      duration: this.slowDuration,
      speed: 5,
      wavePhase: 0,
      trail: [],
      type: 'water'
    });
  }

  woodAttack(target) {
    this.addProjectile({
      x: this.x,
      y: this.y,
      target: target,
      damage: this.damage,
      speed: 12,
      trail: [],
      type: 'wood'
    });
  }

  goldAttack(target) {
    this.pierceAttack(target);
  }

  earthAttack(target) {
    this.aoeAttack(target);
  }

  draw(ctx, timestamp) {
    ctx.save();

    if (this.selected) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.range * CONFIG.CELL_SIZE, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 0, 0.3)";
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 0, 0.1)";
      ctx.fill();
    }

    // 攻击动画进度
    let attackProgress = 0;
    if (this.isAttacking && this.attackAnimTime > 0) {
      attackProgress = Math.min(1, (Date.now() - this.attackAnimTime) / this.attackAnimDuration);
      if (attackProgress >= 1) {
        this.isAttacking = false;
        this.attackAnimTime = 0;
      }
    } else if (this.isAttacking && this.attackAnimTime === 0) {
      this.isAttacking = false;
    }

    // 山塔融合时的阻挡绘制
    if (this.onPath && this.hp > 0) {
      this.drawFusionMountainTower(ctx, attackProgress);
    } else {
      this.drawFusionTower(ctx, attackProgress);
    }

    ctx.restore();

    // 绘制弹道和特效
    this.drawProjectilesWithAnimation(ctx);
    this.drawBeamEffects(ctx);
    this.drawShockwaves(ctx);
    this.drawChainEffects(ctx);
  }

  drawFusionTower(ctx, progress) {
    // 融合炮塔特效：发光脉动
    let scale = 1;
    if (this.isAttacking && progress < 1) {
      scale = 1 + 0.15 * Math.sin(progress * Math.PI);
    }

    // 墨晕底座 - 使用融合颜色
    ctx.fillStyle = `${this.fusionColor}33`;
    ctx.beginPath();
    ctx.arc(this.x, this.y + 5, 20, 0, Math.PI * 2);
    ctx.fill();

    // 融合光晕效果
    if (this.isAttacking && progress > 0 && progress < 0.5) {
      ctx.fillStyle = `${this.fusionColor}66`;
      ctx.beginPath();
      const glowRadius = Math.max(0, 25 * (1 - progress * 2));
      ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 绘制融合炮塔文字
    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : this.fusionColor;
    this.drawFusionChar(ctx, this.x, this.y, scale);

    // 显示融合标记
    ctx.font = "10px Microsoft YaHei";
    ctx.fillStyle = "#888";
    const tag = this.isEvolution ? "进化" : "融合";
    ctx.fillText(tag, this.x, this.y + 22);
  }

  drawFusionMountainTower(ctx, progress) {
    // 融合山塔：在路径上的阻挡塔
    // 融合色光晕
    ctx.fillStyle = `${this.fusionColor}44`;
    ctx.beginPath();
    ctx.arc(this.x + this.shakeOffset.x, this.y + this.shakeOffset.y, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.fusionColor;
    this.drawFusionChar(ctx, this.x + this.shakeOffset.x, this.y + this.shakeOffset.y, 1);

    // 显示生命值
    ctx.font = "12px Microsoft YaHei";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${this.hp}/${this.maxHp}`, this.x, this.y - 20);

    // 生命条
    const barWidth = 30;
    const barHeight = 4;
    ctx.fillStyle = "#333";
    ctx.fillRect(this.x - barWidth / 2, this.y + 18, barWidth, barHeight);
    ctx.fillStyle = "#00ff00";
    ctx.fillRect(
      this.x - barWidth / 2,
      this.y + 18,
      barWidth * (this.hp / this.maxHp),
      barHeight,
    );

    // 融合标记
    ctx.font = "10px Microsoft YaHei";
    ctx.fillStyle = "#888";
    const tag = this.isEvolution ? "进化" : "融合";
    ctx.fillText(tag, this.x, this.y + 28);
  }

  drawFusionChar(ctx, x, y, scale = 1) {
    const text = String(this.char || '');
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (text.length <= 2) {
      ctx.font = `bold ${28 * scale}px Microsoft YaHei`;
      ctx.fillText(text, x, y);
      return;
    }

    const splitIndex = Math.ceil(text.length / 2);
    const top = text.slice(0, splitIndex);
    const bottom = text.slice(splitIndex);
    const baseSize = text.length >= 4 ? 18 : 22;
    const fontSize = baseSize * scale;
    const lineGap = 8 * scale;

    ctx.font = `bold ${fontSize}px Microsoft YaHei`;
    ctx.fillText(top, x, y - lineGap);
    ctx.fillText(bottom, x, y + lineGap);
  }

  upgrade() {
    // 融合炮塔不可升级
    return false;
  }
}


