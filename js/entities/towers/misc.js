// 未归类兼容方法
/**
   * 重置对象状态（用于对象池）
   */
Tower.prototype.reset = function(type, gx, gy, game) {
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
    this.inkPerWave = config.inkPerWave || 0;
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
  
};
Tower.prototype.upgrade = function() {
    if (this.level >= this.maxLevel) return false;
    if (this.game.ink < this.upgradeCost * this.level) return false;

    this.game.ink -= this.upgradeCost * this.level;
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
      if (params.inkPerWaveInc && this.inkPerWave) this.inkPerWave += params.inkPerWaveInc;
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
  
};
Tower.prototype.getSellValue = function() {
    return Math.floor(this.cost * 0.7);
  
};
Tower.prototype.update = function(now, deltaTime, enemies) {
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
  
};
// 更新山塔震动效果
Tower.prototype.updateShake = function() {
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
  
};
// 触发山塔震动
Tower.prototype.triggerShake = function() {
    this.shakeEndTime = Date.now() + this.shakeDuration;
  
};
Tower.prototype.findTarget = function(enemies) {
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
  
};
Tower.prototype.drawSummons = function(ctx) {
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
  
};
