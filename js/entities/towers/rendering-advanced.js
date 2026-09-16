// Tower：特殊炮塔绘制与信息
Tower.prototype.drawLightTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawDarkTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawStarTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawFrostTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawMountainTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawDrumTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawBannerTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawBellTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawMirrorTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawZitherTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawTalismanTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawFormationTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawLanternTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawTreasureTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawHealerTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawSoulTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawShadowTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawTimeTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawDetonatorTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawParasiteTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawWheelTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawPathTower = function(ctx, progress) {
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
  
};
Tower.prototype.drawBasicTower = function(ctx, progress) {
    ctx.font = "bold 28px Microsoft YaHei";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = this.selected ? CONFIG.COLORS.highlight : CONFIG.COLORS.tower;
    ctx.fillText(this.char, this.x, this.y);

    this.drawLevelInfo(ctx);
  
};
Tower.prototype.drawLevelInfo = function(ctx) {
    if (this.level > 1) {
      ctx.font = "12px Microsoft YaHei";
      ctx.fillStyle = "#888";
      ctx.fillText(`Lv${this.level}`, this.x, this.y + 20);
    }
  
};
