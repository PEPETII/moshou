const ENEMY_TRAIL_COLORS = {
  corpse: '#cccccc',
  ghost: '#aaaaff',
  armor: '#aa8866',
  split: '#cc88cc',
  giant: '#8a8377',
  superGiant: '#887766',
  overlord: '#cc4444',
  shadow: '#8888aa',
  ironArmor: '#886644',
  swiftGhost: '#aaccff'
};

const TOWER_TRAIL_COLORS = {
  fire: '#ff6600',
  water: '#00aaff',
  mountain: '#6a6459',
  wood: '#90b090',
  gold: '#a67c00',
  earth: '#8b7355',
  xinZhongYan: '#ff4400',
  ruFengSiZhen: '#88ccaa'
};

class InkTrailAnimation {
  constructor(game) {
    this.game = game;
    this.entities = [];
    this.stampEffects = [];
    this.active = false;
    this.complete = false;
    this.onComplete = null;
    this.frameCount = 0;
    this._initialized = false;
    this._levelData = null;
  }

  play(levelData) {
    this.active = true;
    this.complete = false;
    this.entities = [];
    this.stampEffects = [];
    this.frameCount = 0;
    this._initialized = false;
    this._levelData = levelData;

    this._prepareTowerCards();
    this._disableWaveButton();
  }

  stop() {
    this.active = false;
    this.complete = true;
    this.entities = [];
    this.stampEffects = [];
    this._restoreTowerCards();
    this._enableWaveButton();
  }

  _prepareTowerCards() {
    document.querySelectorAll('.tower-select:not(.locked)').forEach(el => {
      el.style.pointerEvents = 'none';
      const charEl = el.querySelector('.tower-char');
      const costEl = el.querySelector('.tower-cost');
      if (charEl) {
        charEl.style.opacity = '0';
      }
      if (costEl) {
        costEl.style.opacity = '0';
      }
    });
  }

  _restoreTowerCards() {
    document.querySelectorAll('.tower-select').forEach(el => {
      el.style.pointerEvents = '';
      el.classList.remove('stamp-anim');
      const charEl = el.querySelector('.tower-char');
      const costEl = el.querySelector('.tower-cost');
      if (charEl) {
        charEl.style.opacity = '';
        charEl.style.transition = '';
      }
      if (costEl) {
        costEl.style.opacity = '';
        costEl.style.transition = '';
      }
    });
  }

  _stampTowerCard(type) {
    const el = document.querySelector(`.tower-select[data-type="${type}"]`);
    if (!el) return;
    el.style.pointerEvents = '';

    const charEl = el.querySelector('.tower-char');
    const costEl = el.querySelector('.tower-cost');

    if (charEl) {
      charEl.style.opacity = '1';
      charEl.style.transition = 'none';
    }
    if (costEl) {
      costEl.style.opacity = '1';
      costEl.style.transition = 'opacity 0.3s ease 0.25s';
    }

    el.classList.remove('stamp-anim');
    void el.offsetWidth;
    el.classList.add('stamp-anim');

    el.addEventListener('animationend', function handler() {
      el.classList.remove('stamp-anim');
    }, { once: true });
  }

  _addStampEffect(x, y, color) {
    const particles = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
      const speed = 1.5 + Math.random() * 2.5;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        life: 1.0,
        decay: 0.03 + Math.random() * 0.02
      });
    }
    this.stampEffects.push({
      x: x,
      y: y,
      color: color,
      ring: 0,
      ringMax: 25,
      ringAlpha: 0.7,
      particles: particles,
      life: 1.0
    });
  }

  _disableWaveButton() {
    const btn = document.getElementById('start-wave');
    if (btn) btn.disabled = true;
  }

  _enableWaveButton() {
    if (!this.game) return;
    this.game.updateUI();
  }

  _getUniqueEnemyTypes(levelData) {
    const types = new Set();
    if (levelData && levelData.waves) {
      for (const wave of levelData.waves) {
        for (const group of wave.enemies) {
          types.add(group.type);
        }
      }
    }
    return Array.from(types);
  }

  _getVisibleTowerTypes() {
    const types = [];
    document.querySelectorAll('.tower-select:not(.locked)').forEach(el => {
      types.push(el.dataset.type);
    });
    return types;
  }

  _getTowerCardXPositions(towerTypes) {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return towerTypes.map((_, i) => 100 + i * 90);

    const containerRect = gameContainer.getBoundingClientRect();
    if (containerRect.width === 0) return towerTypes.map((_, i) => 100 + i * 90);

    const positions = [];
    for (const type of towerTypes) {
      const cardEl = document.querySelector(`.tower-select[data-type="${type}"]`);
      if (cardEl) {
        const cardRect = cardEl.getBoundingClientRect();
        const relativeX = (cardRect.left + cardRect.width / 2 - containerRect.left) / containerRect.width;
        positions.push(relativeX * this.game.canvas.width);
      } else {
        positions.push(100 + positions.length * 90);
      }
    }
    return positions;
  }

  _createEntities(levelData) {
    const canvasW = this.game.canvas.width;
    const canvasH = this.game.canvas.height;

    const enemyTypes = this._getUniqueEnemyTypes(levelData);
    const towerTypes = this._getVisibleTowerTypes();
    const cardXPositions = this._getTowerCardXPositions(towerTypes);

    // 限制只有前10个敌人执行飞入动画
    const maxEnemyAnimations = 10;
    for (let i = 0; i < enemyTypes.length && i < maxEnemyAnimations; i++) {
      const type = enemyTypes[i];
      const config = CONFIG.ENEMIES[type];
      const color = ENEMY_TRAIL_COLORS[type] || '#aaaacc';
      const yBase = canvasH * 0.18 + (i % 4) * 55;

      this.entities.push({
        char: config.char,
        color: color,
        x: canvasW + 40 + i * 70,
        y: yBase,
        speed: 4.5 + Math.random() * 1.5,
        trail: [],
        maxTrail: 20,
        type: 'enemy',
        done: false,
        phase: Math.random() * Math.PI * 2,
        delay: 20 + i * 10
      });
    }

    // 限制只有前10个炮塔执行飞入动画
    const maxTowerAnimations = 10;
    const baseDelay = 20 + Math.min(enemyTypes.length, maxEnemyAnimations) * 10 + 20;
    for (let i = 0; i < towerTypes.length && i < maxTowerAnimations; i++) {
      const type = towerTypes[i];
      const config = CONFIG.TOWERS[type];
      const color = TOWER_TRAIL_COLORS[type] || '#6a6459';
      const targetX = cardXPositions[i];

      this.entities.push({
        char: config.char,
        color: color,
        x: canvasW + 40 + i * 70,
        y: canvasH * 0.4 + (i % 3) * 50,
        targetX: targetX,
        targetY: canvasH + 15,
        speed: 3.5 + Math.random() * 1.5,
        trail: [],
        maxTrail: 20,
        type: 'tower',
        towerType: type,
        done: false,
        phase: Math.random() * Math.PI * 2,
        delay: baseDelay + i * 10
      });
    }
  }

  update() {
    if (!this.active || !this.game) return;

    if (!this._initialized) {
      this._initialized = true;
      this._createEntities(this._levelData);
    }

    this.frameCount++;
    let allDone = true;

    for (const e of this.entities) {
      if (e.done) continue;
      if (this.frameCount < e.delay) {
        allDone = false;
        continue;
      }

      allDone = false;

      if (e.type === 'enemy') {
        e.x -= e.speed;
        e.y += Math.sin(e.x * 0.015 + e.phase) * 1.2;
        if (e.x < -40) {
          e.done = true;
          continue;
        }
      } else {
        const dx = e.targetX - e.x;
        const dy = e.targetY - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < e.speed * 2) {
          e.done = true;
          this._stampTowerCard(e.towerType);
          this._addStampEffect(e.x, e.y, e.color);
          continue;
        }
        e.x += (dx / dist) * e.speed;
        e.y += (dy / dist) * e.speed;
        e.y += Math.sin(e.x * 0.015 + e.phase) * 0.8;
      }

      e.trail.push({ x: e.x, y: e.y });
      if (e.trail.length > e.maxTrail) e.trail.shift();
    }

    for (let i = this.stampEffects.length - 1; i >= 0; i--) {
      const s = this.stampEffects[i];
      s.ring += 1.5;
      s.ringAlpha -= 0.025;
      s.life -= 0.025;
      for (const p of s.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.life -= p.decay;
      }
      s.particles = s.particles.filter(p => p.life > 0);
      if (s.life <= 0) {
        this.stampEffects.splice(i, 1);
      }
    }

    if (allDone && this.stampEffects.length === 0) {
      this.active = false;
      this.complete = true;
      this._restoreTowerCards();
      this._enableWaveButton();
      if (this.onComplete) this.onComplete();
    }
  }

  draw(ctx) {
    if (!this.active || !this.game) return;

    ctx.save();
    for (const e of this.entities) {
      if (e.done || this.frameCount < e.delay) continue;

      if (e.trail.length > 1) {
        for (let i = 1; i < e.trail.length; i++) {
          const ratio = i / e.trail.length;
          ctx.globalAlpha = ratio * 0.5;
          ctx.strokeStyle = e.color;
          ctx.lineWidth = ratio * 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(e.trail[i - 1].x, e.trail[i - 1].y);
          ctx.lineTo(e.trail[i].x, e.trail[i].y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, 18);
      grad.addColorStop(0, e.color + '33');
      grad.addColorStop(1, e.color + '00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 22px "Ma Shan Zheng", cursive';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = e.color;
      ctx.fillText(e.char, e.x, e.y);
    }

    for (const s of this.stampEffects) {
      if (s.ringAlpha > 0) {
        ctx.globalAlpha = s.ringAlpha;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.ring, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (const p of s.particles) {
        ctx.globalAlpha = p.life * 0.8;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
