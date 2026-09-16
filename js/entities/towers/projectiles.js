// Tower：投射物与弹道特效
Tower.prototype.addProjectile = function(data) {
    const projectile = this.game.projectilePool
      ? this.game.projectilePool.acquire(data)
      : data;
    if (!projectile.trail) projectile.trail = [];
    this.projectiles.push(projectile);
  
};
Tower.prototype.releaseProjectile = function(index) {
    const projectile = this.projectiles[index];
    this.projectiles.splice(index, 1);
    if (this.game.projectilePool) {
      this.game.projectilePool.release(projectile);
    }
  
};
Tower.prototype.getAliveEnemies = function() {
    return this.game.runtimeIndexes
      ? this.game.runtimeIndexes.aliveEnemies
      : this.game.enemies;
  
};
Tower.prototype.updateProjectiles = function(deltaTime) {
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
  
};
// === 抛射物绘制方法（包含弹道、特效文字等） ===
Tower.prototype.drawProjectilesWithAnimation = function(ctx) {
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
  
};
Tower.prototype.drawTrail = function(ctx, p) {
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
  
};
Tower.prototype.drawFireProjectile = function(ctx, p) {
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
  
};
Tower.prototype.drawWaterProjectile = function(ctx, p) {
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
  
};
Tower.prototype.drawWoodProjectile = function(ctx, p) {
    // 木塔弹道：简洁墨迹效果
    ctx.fillStyle = "#90b090";
    ctx.fillText(this.char, p.x, p.y);

    // 轻微旋转
    ctx.translate(p.x, p.y);
    const angle = (p.x + p.y) % 360 * Math.PI / 180 * 0.1;
    ctx.rotate(angle);
  
};
Tower.prototype.drawXinZhongYanProjectile = function(ctx, p) {
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
  
};
Tower.prototype.drawIceProjectile = function(ctx, p) {
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
  
};
Tower.prototype.drawPoisonProjectile = function(ctx, p) {
    ctx.fillStyle = CONFIG.COLORS.poison;
    ctx.fillText(this.char, p.x, p.y);
  
};
Tower.prototype.drawWindProjectile = function(ctx, p) {
    ctx.fillStyle = CONFIG.COLORS.wind;
    ctx.fillText(this.char, p.x, p.y);
  
};
Tower.prototype.drawDarkProjectile = function(ctx, p) {
    ctx.fillStyle = CONFIG.COLORS.dark;
    ctx.fillText(this.char, p.x, p.y);
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12);
    gradient.addColorStop(0, 'rgba(124, 77, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(124, 77, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.fill();
  
};
Tower.prototype.drawStarProjectile = function(ctx, p) {
    const color = p.elementType === 'fire' ? '#ff6600' :
                  p.elementType === 'water' ? '#00aaff' :
                  p.elementType === 'thunder' ? '#b388ff' :
                  p.elementType === 'ice' ? '#80d8ff' : '#e0e0e0';
    ctx.fillStyle = color;
    ctx.fillText(this.char, p.x, p.y);
  
};
Tower.prototype.drawBeamEffects = function(ctx) {
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
  
};
Tower.prototype.drawShockwaves = function(ctx) {
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
  
};
Tower.prototype.drawChainEffects = function(ctx) {
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
  
};
Tower.prototype.drawFrostGrounds = function(ctx) {
    const now = Date.now();
    for (const fg of this.frostGrounds) {
      const elapsed = now - fg.startTime;
      const alpha = Math.max(0, 0.15 * (1 - elapsed / fg.duration));
      ctx.fillStyle = `rgba(179, 229, 252, ${alpha})`;
      ctx.beginPath();
      ctx.arc(fg.x, fg.y, fg.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  
};
