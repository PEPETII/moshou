// Enemy：敌人绘制
Enemy.prototype.draw = function(ctx, inkRenderer) {
    if (this.dead) return;
    if (isNaN(this.x) || isNaN(this.y)) return;

    ctx.save();
    
    // 应用晃动偏移
    ctx.translate(this.shakeOffset.x, this.shakeOffset.y);
    
    const size = this.size || 26;
    const dx = this.flash > 0 ? (Math.random() - 0.5) * 4 : 0;
    const dy = this.flash > 0 ? (Math.random() - 0.5) * 4 : 0;
    const ex = this.x + dx;
    const ey = this.y + dy;

    // 墨晕底座：用实心椭圆代替径向渐变，敌人多时（上限 260）开销小得多
    ctx.fillStyle = 'rgba(40,34,28,0.12)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + size * 0.45 + (this.float ? 8 : 0), size * 0.42, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // 湿身、灼烧的淡色光晕
    if (this.wet > 0) {
      ctx.fillStyle = 'rgba(60,110,145,0.18)';
      ctx.beginPath(); ctx.arc(this.x, this.y, size * 0.62, 0, Math.PI * 2); ctx.fill();
    }
    if (this.burnTime > 0) {
      ctx.fillStyle = 'rgba(220,100,40,0.16)';
      ctx.beginPath(); ctx.arc(this.x, this.y - 2, size * 0.6, 0, Math.PI * 2); ctx.fill();
    }

    // 确定敌人颜色状态
    let color = CONFIG.COLORS.enemy;
    if (this.flash > 0) {
      color = "#b4473a";  // 受击闪朱砂
    } else if (this.vaporizeMark) {
      color = "#8a8377";  // 蒸发状态显示干墨（墨色转淡）
    } else if (this.burning || this.fireMarked || this.burnTime > 0) {
      color = "#b03a2e";  // 灼烧状态显示朱砂
    } else if (this.wet > 0) {
      color = "#1f3446";  // 湿身显示青墨
    } else if (this.blocked) {
      color = "#5d4037";  // 阻挡状态显示滞墨
    } else if (this.slowed) {
      color = "#6a6459";  // 减速状态显示淡墨
    }

    // 绘制敌人文字（水墨风格）；鬼漂浮时略淡
    if (this.float) ctx.globalAlpha = 0.85;
    inkRenderer.drawInkText(this.char, ex, ey, size, color, true);
    ctx.globalAlpha = 1;

    // 血条（受伤后才显示）；眩晕时头顶画一圈
    if (this.hp < this.maxHp) {
      const w = size * 0.9;
      ctx.fillStyle = 'rgba(40,34,28,0.18)';
      ctx.fillRect(this.x - w / 2, this.y + size * 0.58, w, 3);
      ctx.fillStyle = '#b4473a';
      ctx.fillRect(this.x - w / 2, this.y + size * 0.58, w * Math.max(0, this.hp / this.maxHp), 3);
    }
    if (this.stun > 0 && !this.carried) {
      ctx.strokeStyle = '#6f9bb8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y - size * 0.62, size * 0.35, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

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
    
    // 护盾显示
    if (this.shield > 0) {
      ctx.fillStyle = "#00bcd4";
      ctx.fillText(`盾${this.shield}`, this.x, this.y - 32);
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
  
};
