class Particle {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.char = '0';
    this.lifespan = 0;
    this.maxLifespan = 0;
    this.isActive = false;
    this.color = null;
  }

  init(x, y, vx, vy, char, lifespan, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.char = char;
    this.lifespan = lifespan;
    this.maxLifespan = lifespan;
    this.isActive = true;
    this.color = color || null;
  }

  update(deltaTime) {
    if (!this.isActive) return;

    this.x += this.vx * deltaTime / 1000;
    this.y += this.vy * deltaTime / 1000;
    this.vy += 200 * deltaTime / 1000;

    this.lifespan -= deltaTime;
    if (this.lifespan <= 0) {
      this.isActive = false;
    }
  }

  draw(ctx) {
    if (!this.isActive) return;

    const alpha = Math.max(0, this.lifespan / this.maxLifespan);

    ctx.save();

    const inkAlpha = alpha * 0.6;
    ctx.globalAlpha = inkAlpha;

    const size = 4 * alpha;
    const fillColor = this.color || '#2a2a2a';
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
    ctx.fill();

    const strokeColor = this.color || '#3a3a3a';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = inkAlpha * 0.5;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.1, this.y - this.vy * 0.1);
    ctx.stroke();

    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];

    // 根据设备类型动态设置最大粒子数量
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.maxParticles = isMobile ? 50 : 100;

    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(new Particle());
    }
  }

  acquireParticle() {
    for (const particle of this.particles) {
      if (!particle.isActive) return particle;
    }
    return null;
  }

  createExplosion(x, y, count, color) {
    let created = 0;
    while (created < count) {
      const particle = this.acquireParticle();
      if (!particle) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 200 + 100;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - Math.random() * 100;
      const char = Math.random() > 0.5 ? "0" : "1";
      const lifespan = Math.random() * 500 + 500;

      particle.init(x, y, vx, vy, char, lifespan, color || null);
      created++;
    }
  }

  // 创建毒雾效果
  createPoisonCloud(x, y, duration, damagePerSecond) {
    // 创建毒雾粒子效果
    const particleCount = 20;
    let created = 0;
    while (created < particleCount) {
      const particle = this.acquireParticle();
      if (!particle) break;

      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 40;
      const px = x + Math.cos(angle) * distance;
      const py = y + Math.sin(angle) * distance;
      const vx = (Math.random() - 0.5) * 20;
      const vy = -Math.random() * 30 - 10;
      const char = "毒";
      const lifespan = duration + Math.random() * 500;

      particle.init(px, py, vx, vy, char, lifespan, '#76ff03');
      created++;
    }
    
    // 毒雾持续伤害效果由游戏逻辑处理
    if (this.game && this.game.createPoisonCloudArea) {
      this.game.createPoisonCloudArea(x, y, duration, damagePerSecond);
    }
  }

  update(deltaTime) {
    for (const particle of this.particles) {
      particle.update(deltaTime);
    }
  }

  draw(ctx) {
    for (const particle of this.particles) {
      particle.draw(ctx);
    }
  }

  getActiveCount() {
    let count = 0;
    for (const particle of this.particles) {
      if (particle.isActive) count++;
    }
    return count;
  }

  clear() {
    for (const particle of this.particles) {
      particle.isActive = false;
    }
  }
}
