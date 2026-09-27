// Enemy：敌人绘制
Enemy.prototype.draw = function(ctx, inkRenderer) {
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
      color = "#8a8377";  // 蒸发状态显示干墨（墨色转淡）
    } else if (this.burning || this.fireMarked) {
      color = "#b03a2e";  // 灼烧状态显示朱砂
    } else if (this.blocked) {
      color = "#5d4037";  // 阻挡状态显示滞墨
    } else if (this.slowed) {
      color = "#6a6459";  // 减速状态显示淡墨
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
      ctx.fillStyle = "#6a6459";
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
  
};
