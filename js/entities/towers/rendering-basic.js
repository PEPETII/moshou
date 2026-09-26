// Tower：基础炮塔绘制
Tower.prototype.draw = function(ctx, timestamp) {
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
  
};
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
Tower.prototype.drawInkBase = function(ctx, x, y, color, radius = 18) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y + 5, radius, 0, Math.PI * 2);
    ctx.fill();
  
};
Tower.prototype.drawFireTower = function(ctx, progress) {
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

    ctx.font = `bold ${28 * scale}px ${CONFIG.FONTS.BRUSH}`;
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
  
};
Tower.prototype.drawWaterTower = function(ctx, progress) {
    // 水塔：攻击时波动涟漪
    let waveOffset = 0;

    if (this.isAttacking && progress < 1) {
      waveOffset = Math.sin(progress * Math.PI * 4) * 3;
    }

    ctx.font = `bold 28px ${CONFIG.FONTS.BRUSH}`;
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
  
};
Tower.prototype.drawWoodTower = function(ctx, progress) {
    // 木塔：攻击时快速弹跳
    let bounceOffset = 0;

    if (this.isAttacking && progress < 1) {
      // 弹跳曲线
      bounceOffset = -Math.sin(progress * Math.PI) * 4;
    }

    ctx.font = `bold 28px ${CONFIG.FONTS.BRUSH}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 墨晕底座
    this.drawInkBase(ctx, this.x, this.y, 'rgba(100, 150, 100, 0.15)');

    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : "#90b090";
    ctx.fillText(this.char, this.x, this.y + bounceOffset);

    this.drawLevelInfo(ctx);
  
};
Tower.prototype.drawGoldTower = function(ctx, progress) {
    // 金塔：攻击时闪光效果
    let glowIntensity = 0;

    if (this.isAttacking && progress < 1) {
      glowIntensity = Math.sin(progress * Math.PI);
    }

    ctx.font = `bold 28px ${CONFIG.FONTS.BRUSH}`;
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
  
};
Tower.prototype.drawEarthTower = function(ctx, progress) {
    // 土塔：攻击时震动下沉
    let shakeX = 0, shakeY = 0;

    if (this.isAttacking && progress > 0 && progress < 1) {
      // 使用基于时间的正弦波替代随机，避免高频抖动
      shakeX = Math.sin(progress * Math.PI * 5) * 1.5;
      shakeY = Math.sin(progress * Math.PI) * 3; // 下沉效果
    }

    ctx.font = `bold 28px ${CONFIG.FONTS.BRUSH}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 墨晕底座
    this.drawInkBase(ctx, this.x, this.y, 'rgba(139, 115, 85, 0.2)');

    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : "#8b7355";
    ctx.fillText(this.char, this.x + shakeX, this.y + shakeY);

    this.drawLevelInfo(ctx);
  
};
Tower.prototype.drawXinZhongYanTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawRuFengSiZhenTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawThunderTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawIceTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawPoisonTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawWindTower = function(ctx, progress) {
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
  
};
