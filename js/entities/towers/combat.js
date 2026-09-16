// Tower：攻击与目标交互
Tower.prototype.attack = function(target, now) {
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
  
};
Tower.prototype.triggerAttackAnimation = function() {
    this.isAttacking = true;
    this.attackAnimTime = Date.now();
  
};
Tower.prototype.pierceAttack = function(target) {
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
  
};
Tower.prototype.aoeAttack = function(target) {
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
  
};
Tower.prototype.xinZhongYanAttack = function(target) {
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
  
};
Tower.prototype.chainAttack = function(target) {
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
  
};
Tower.prototype.thunderAttack = function(target) {
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
  
};
Tower.prototype.iceAttack = function(target) {
    this.addProjectile({
      x: this.x, y: this.y, target: target,
      damage: this.damage, slow: this.slow, duration: this.slowDuration,
      speed: 5, wavePhase: 0, trail: [], type: 'ice'
    });
  
};
Tower.prototype.poisonAttack = function(target) {
    this.addProjectile({
      x: this.x, y: this.y, target: target,
      damage: this.damage, speed: 6, trail: [], type: 'poison'
    });
  
};
Tower.prototype.windAttack = function(target) {
    this.addProjectile({
      x: this.x, y: this.y, target: target,
      damage: this.damage, speed: 8, trail: [], type: 'wind'
    });
  
};
Tower.prototype.lightAttack = function(target) {
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
  
};
Tower.prototype.darkAttack = function(target) {
    this.addProjectile({
      x: this.x, y: this.y, target: target,
      damage: this.damage, speed: 5, trail: [], type: 'dark'
    });
  
};
Tower.prototype.starAttack = function(target) {
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
  
};
Tower.prototype.frostAttack = function(target) {
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
  
};
Tower.prototype.bellAttack = function(target) {
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
  
};
Tower.prototype.talismanAttack = function(target) {
    if (this.currentMarkCount < this.markCount) {
      this.addProjectile({
        x: this.x, y: this.y, target: target,
        damage: this.damage, speed: 5, trail: [], type: 'talisman'
      });
    }
  
};
Tower.prototype.arrowAttack = function(target) {
    this.addProjectile({
      x: this.x, y: this.y, target: target,
      damage: this.damage, speed: 10, trail: [], type: 'arrow'
    });
  
};
Tower.prototype.bunkerAttack = function(target) {
    this.addProjectile({
      x: this.x, y: this.y, target: target,
      damage: this.damage, speed: 6, trail: [], type: 'bunker'
    });
  
};
Tower.prototype.checkTrapTrigger = function() {
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
  
};
Tower.prototype.checkMoatEffect = function() {
    const triggerRangeSq = (CONFIG.CELL_SIZE * 0.8) ** 2;
    for (const enemy of this.getAliveEnemies()) {
      if (enemy.hp <= 0 || enemy.flying) continue;
      if (distanceSq(this.x, this.y, enemy.x, enemy.y) < triggerRangeSq) {
        enemy.applySlow(this.slow, this.slowDuration);
        enemy.takeDamage(this.damage);
      }
    }
  
};
