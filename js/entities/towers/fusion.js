

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
      ctx.font = `bold ${28 * scale}px ${CONFIG.FONTS.BRUSH}`;
      ctx.fillText(text, x, y);
      return;
    }

    const splitIndex = Math.ceil(text.length / 2);
    const top = text.slice(0, splitIndex);
    const bottom = text.slice(splitIndex);
    const baseSize = text.length >= 4 ? 18 : 22;
    const fontSize = baseSize * scale;
    const lineGap = 8 * scale;

    ctx.font = `bold ${fontSize}px ${CONFIG.FONTS.BRUSH}`;
    ctx.fillText(top, x, y - lineGap);
    ctx.fillText(bottom, x, y + lineGap);
  }

  upgrade() {
    // 融合炮塔不可升级
    return false;
  }
}


