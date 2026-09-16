// Tower：光环、召唤与状态效果
Tower.prototype.updateAura = function() {
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
  
};
Tower.prototype.summonSoul = function() {
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
  
};
Tower.prototype.updateShadowCopy = function(now) {
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
  
};
Tower.prototype.getAdjacentTowers = function() {
    const result = [];
    for (const t of this.game.towers) {
      if (t === this) continue;
      const dx = Math.abs(t.gx - this.gx);
      const dy = Math.abs(t.gy - this.gy);
      if (dx <= 1 && dy <= 1) result.push(t);
    }
    return result;
  
};
Tower.prototype.wheelAttack = function() {
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
  
};
Tower.prototype.updateBeamEffects = function() {
    for (let i = this.beamEffects.length - 1; i >= 0; i--) {
      const elapsed = Date.now() - this.beamEffects[i].startTime;
      if (elapsed > this.beamEffects[i].lifespan) {
        this.beamEffects.splice(i, 1);
      }
    }
  
};
Tower.prototype.updateShockwaves = function() {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      const elapsed = Date.now() - sw.startTime;
      if (elapsed > sw.lifespan) {
        this.shockwaves.splice(i, 1);
      }
    }
  
};
Tower.prototype.updateChainEffects = function() {
    for (let i = this.chainEffects.length - 1; i >= 0; i--) {
      const ce = this.chainEffects[i];
      const elapsed = Date.now() - ce.startTime;
      if (elapsed > ce.lifespan) {
        this.chainEffects.splice(i, 1);
      }
    }
  
};
Tower.prototype.updateFrostGrounds = function() {
    const now = Date.now();
    for (let i = this.frostGrounds.length - 1; i >= 0; i--) {
      const fg = this.frostGrounds[i];
      if (now - fg.startTime > fg.duration) {
        this.frostGrounds.splice(i, 1);
      }
    }
  
};
Tower.prototype.updateSummons = function(enemies) {
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
  
};
Tower.prototype.takeDamage = function(amount) {
    if (this.damageReduction > 0) {
      amount = amount * (1 - this.damageReduction);
    }
    this.hp -= amount;
    this.triggerShake();
    return this.hp <= 0;
  
};
