const MENU_EFFECT_MODES = [
  { id: 'splash', label: '泼墨' },
  { id: 'fog', label: '雾气渐浓' },
  { id: 'rain', label: '雨丝渐密' },
  { id: 'splash+fog', label: '泼墨+雾气' },
  { id: 'fog+rain', label: '雾气+雨丝' },
  { id: 'splash+rain', label: '泼墨+雨丝' },
  { id: 'splash+fog+rain', label: '泼墨+雾气+雨丝' }
];

class MenuInkBackground {
  constructor() {
    this.canvas = document.getElementById('menu-ink-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.mode = this._pickMode();
    this.enableSplash = this.mode.id.includes('splash');
    this.enableFog = this.mode.id.includes('fog');
    this.enableRain = this.mode.id.includes('rain');

    this.splashes = [];
    this.fogDensity = 0;
    this.fogTargetDensity = this.enableFog ? 0.7 : 0;
    this.rainAmount = 0;
    this.rainTargetAmount = this.enableRain ? 0.8 : 0;
    this.drops = [];
    this.ripples = [];
    this.puddles = [];

    this.staticCache = null;
    this.staticCtx = null;
    this.animId = null;
    this.isRunning = false;
    this.frameCount = 0;

    this.MAX_SPLASHES = 6;
    this.SPLASH_INTERVAL = 180;
    this.SPLASH_LIFESPAN = 5000;

    this.resize();
    this._initStaticCache();
    this._initRain();
    this._generateInitial();
    this._startAnimation();

    this._resizeHandler = () => this.resize();
    window.addEventListener('resize', this._resizeHandler);
  }

  _pickMode() {
    const idx = Math.floor(Math.random() * MENU_EFFECT_MODES.length);
    return MENU_EFFECT_MODES[idx];
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = this.w * this.dpr;
    this.canvas.height = this.h * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);

    if (this.staticCache) {
      this.staticCache.width = this.canvas.width;
      this.staticCache.height = this.canvas.height;
      this.staticCtx = this.staticCache.getContext('2d');
      this.staticCtx.scale(this.dpr, this.dpr);
      this._redrawStaticCache();
    }

    this._initRain();
  }

  _initStaticCache() {
    this.staticCache = document.createElement('canvas');
    this.staticCache.width = this.canvas.width;
    this.staticCache.height = this.canvas.height;
    this.staticCtx = this.staticCache.getContext('2d');
    this.staticCtx.scale(this.dpr, this.dpr);
  }

  _redrawStaticCache() {
    const c = this.staticCtx;
    c.clearRect(0, 0, this.w, this.h);
    this.splashes.forEach(s => {
      if (s.done && !s.fading) this._drawSplashToCtx(c, s);
    });
  }

  _initRain() {
    this.drops = [];
    for (let i = 0; i < 300; i++) {
      this.drops.push({
        x: this._rand(0, this.w + 50),
        y: this._rand(-this.h, this.h),
        speed: this._rand(8, 16),
        len: this._rand(10, 25),
        opacity: this._rand(0.1, 0.4)
      });
    }
    this.ripples = [];
    this.puddles = [];
    for (let i = 0; i < 6; i++) {
      this.puddles.push({
        x: this._rand(50, this.w - 50),
        y: this._rand(this.h * 0.55, this.h * 0.85),
        rx: this._rand(25, 55),
        ry: this._rand(8, 16)
      });
    }
  }

  _rand(a, b) { return a + Math.random() * (b - a); }
  _lerp(a, b, t) { return a + (b - a) * t; }

  _generateInitial() {
    if (this.enableSplash) {
      for (let i = 0; i < 3; i++) {
        this._addSplash(this._rand(this.w * 0.05, this.w * 0.95), this._rand(this.h * 0.05, this.h * 0.95));
      }
    }
  }

  _addSplash(x, y) {
    if (!this.enableSplash) return;
    if (this.splashes.filter(s => !s.done || s.fading).length >= this.MAX_SPLASHES) return;

    const force = this._rand(15, 45);
    const main = {
      x, y,
      radius: 0,
      maxRadius: force * 1.2 + this._rand(10, 25),
      growing: true
    };

    const dots = [];
    const dotCount = Math.floor(force * 0.3 + this._rand(3, 8));
    for (let i = 0; i < dotCount; i++) {
      const angle = this._rand(0, Math.PI * 2);
      const dist = this._rand(force * 0.5, force * 2);
      dots.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        size: this._rand(1.5, 4),
        opacity: this._rand(0.3, 0.7)
      });
    }

    const streaks = [];
    const streakCount = Math.floor(this._rand(2, 5));
    for (let i = 0; i < streakCount; i++) {
      const angle = this._rand(0, Math.PI * 2);
      const len = this._rand(force * 0.6, force * 1.8);
      streaks.push({
        x1: x + Math.cos(angle) * force * 0.3,
        y1: y + Math.sin(angle) * force * 0.3,
        x2: x + Math.cos(angle) * len,
        y2: y + Math.sin(angle) * len,
        width: this._rand(1, 2.5),
        opacity: this._rand(0.15, 0.4),
        mx: (x + Math.cos(angle) * len * 0.5) + this._rand(-3, 3),
        my: (y + Math.sin(angle) * len * 0.5) + this._rand(-3, 3)
      });
    }

    const wash = {
      x, y,
      radius: 0,
      maxRadius: force * 1.8 + this._rand(15, 35),
      opacity: 0.12,
      growing: true
    };

    this.splashes.push({
      main, dots, streaks, wash,
      done: false,
      fading: false,
      fadeAlpha: 1,
      createdAt: Date.now(),
      age: 0
    });
  }

  _drawSplashToCtx(c, s, alphaMultiplier) {
    const am = alphaMultiplier !== undefined ? alphaMultiplier : 1;

    const wash = s.wash;
    if (wash.radius > 1) {
      const wGrad = c.createRadialGradient(wash.x, wash.y, 0, wash.x, wash.y, wash.radius);
      wGrad.addColorStop(0, `rgba(66, 62, 55, ${wash.opacity * am})`);
      wGrad.addColorStop(0.5, `rgba(55, 52, 46, ${wash.opacity * 0.5 * am})`);
      wGrad.addColorStop(1, 'rgba(45, 42, 38, 0)');
      c.fillStyle = wGrad;
      c.beginPath();
      c.arc(wash.x, wash.y, wash.radius, 0, Math.PI * 2);
      c.fill();
    }

    const m = s.main;
    if (m.radius > 1) {
      const mGrad = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.radius);
      mGrad.addColorStop(0, `rgba(28, 26, 23, ${0.85 * am})`);
      mGrad.addColorStop(0.6, `rgba(45, 42, 38, ${0.5 * am})`);
      mGrad.addColorStop(1, 'rgba(66, 62, 55, 0)');
      c.fillStyle = mGrad;
      c.beginPath();
      const pts = 12;
      for (let i = 0; i <= pts; i++) {
        const a = (Math.PI * 2 * i) / pts;
        const r = m.radius + Math.sin(a * 3) * m.radius * 0.08;
        const px = m.x + Math.cos(a) * r;
        const py = m.y + Math.sin(a) * r;
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.closePath();
      c.fill();
    }

    s.streaks.forEach(sk => {
      c.strokeStyle = `rgba(35, 33, 29, ${sk.opacity * am})`;
      c.lineWidth = sk.width;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(sk.x1, sk.y1);
      c.quadraticCurveTo(sk.mx, sk.my, sk.x2, sk.y2);
      c.stroke();
    });

    s.dots.forEach(d => {
      c.fillStyle = `rgba(28, 26, 23, ${d.opacity * am})`;
      c.beginPath();
      c.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      c.fill();
    });
  }

  _updateSplash(s) {
    if (s.done && !s.fading) return;
    s.age++;

    if (s.wash.growing) {
      s.wash.radius = this._lerp(s.wash.radius, s.wash.maxRadius, 0.03);
      if (s.wash.radius > s.wash.maxRadius * 0.95) s.wash.growing = false;
    }

    if (s.main.growing) {
      s.main.radius = this._lerp(s.main.radius, s.main.maxRadius, 0.05);
      if (s.main.radius > s.main.maxRadius * 0.95) s.main.growing = false;
    }

    if (!s.done && !s.wash.growing && !s.main.growing) {
      s.done = true;
    }

    if (s.done && !s.fading) {
      const elapsed = Date.now() - s.createdAt;
      if (elapsed >= this.SPLASH_LIFESPAN) {
        s.fading = true;
        s.fadeAlpha = 1;
      }
    }

    if (s.fading) {
      s.fadeAlpha -= 0.015;
      if (s.fadeAlpha <= 0) {
        s.fadeAlpha = 0;
        s.removed = true;
      }
    }
  }

  _drawFog(ctx) {
    if (this.fogDensity < 0.005) return;

    for (let layer = 0; layer < 3; layer++) {
      const layerDensity = this.fogDensity * (0.3 + layer * 0.25);
      const yOffset = layer * 30;
      const gradient = ctx.createLinearGradient(0, this.h * 0.3 - yOffset, 0, this.h);
      gradient.addColorStop(0, `rgba(132, 126, 115, ${layerDensity * 0.3})`);
      gradient.addColorStop(0.4, `rgba(110, 104, 94, ${layerDensity * 0.6})`);
      gradient.addColorStop(1, `rgba(88, 83, 75, ${layerDensity * 0.8})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    const time = Date.now() / 3000;
    for (let i = 0; i < 8; i++) {
      const fx = (Math.sin(time + i * 1.7) * 0.5 + 0.5) * this.w;
      const fy = this.h * 0.3 + i * 25 + Math.sin(time * 0.7 + i) * 15;
      const fr = 60 + i * 15;
      const fogGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
      fogGrad.addColorStop(0, `rgba(150, 143, 130, ${this.fogDensity * 0.35})`);
      fogGrad.addColorStop(1, 'rgba(150, 143, 130, 0)');
      ctx.fillStyle = fogGrad;
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.fogDensity > 0.5) {
      const coverAlpha = (this.fogDensity - 0.5) * 2;
      ctx.fillStyle = `rgba(66, 62, 58, ${coverAlpha * 0.5})`;
      ctx.fillRect(0, 0, this.w, this.h * 0.5);
    }
  }

  _drawRain(ctx) {
    if (this.rainAmount < 0.01) return;
    const activeCount = Math.floor(this.drops.length * this.rainAmount);

    ctx.save();
    for (let i = 0; i < activeCount; i++) {
      const d = this.drops[i];
      d.y += d.speed * (0.5 + this.rainAmount);
      d.x -= 1.5;
      if (d.y > this.h) { d.y = this._rand(-50, -10); d.x = this._rand(0, this.w + 50); }
      if (d.x < -10) d.x = this.w + 10;

      ctx.strokeStyle = `rgba(150, 170, 200, ${d.opacity * this.rainAmount})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 1.5, d.y + d.len);
      ctx.stroke();
    }

    if (this.puddles.length > 0 && Math.random() < this.rainAmount * 0.3) {
      const p = this.puddles[Math.floor(Math.random() * this.puddles.length)];
      this.ripples.push({
        x: p.x + this._rand(-p.rx, p.rx),
        y: p.y + this._rand(-p.ry * 0.3, p.ry * 0.3),
        r: 0,
        maxR: this._rand(8, 20),
        life: 1
      });
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const rp = this.ripples[i];
      rp.r += 0.5;
      rp.life -= 0.02;
      if (rp.life <= 0) { this.ripples.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(100, 140, 180, ${rp.life * 0.4 * this.rainAmount})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    this.puddles.forEach(p => {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.rx);
      grad.addColorStop(0, `rgba(30, 50, 70, ${0.3 * this.rainAmount})`);
      grad.addColorStop(1, 'rgba(30, 50, 70, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    if (this.rainAmount > 0.3) {
      const fogAlpha = (this.rainAmount - 0.3) * 0.2;
      ctx.fillStyle = `rgba(40, 45, 55, ${fogAlpha})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    ctx.restore();
  }

  _startAnimation() {
    if (this.isRunning) return;
    this.isRunning = true;

    const loop = () => {
      if (!this.isRunning) return;

      this.frameCount++;

      // 检查 canvas 尺寸是否有效
      if (!this.w || !this.h || !this.staticCache || !this.staticCache.width || !this.staticCache.height) {
        this.animId = requestAnimationFrame(loop);
        return;
      }

      this.ctx.clearRect(0, 0, this.w, this.h);

      this.ctx.drawImage(
        this.staticCache, 0, 0,
        this.staticCache.width, this.staticCache.height,
        0, 0, this.w, this.h
      );

      if (this.enableFog) {
        this.fogDensity = this._lerp(this.fogDensity, this.fogTargetDensity, 0.015);
      }

      if (this.enableRain) {
        this.rainAmount = this._lerp(this.rainAmount, this.rainTargetAmount, 0.012);
      }

      if (this.enableSplash) {
        this.splashes.forEach(s => {
          if (!s.removed) {
            this._updateSplash(s);
            if (s.fading) {
              this._drawSplashToCtx(this.ctx, s, s.fadeAlpha);
            } else if (!s.done) {
              this._drawSplashToCtx(this.ctx, s);
            }
          }
        });

        this.splashes = this.splashes.filter(s => !s.removed);

        if (this.frameCount % this.SPLASH_INTERVAL === 0) {
          this._addSplash(this._rand(this.w * 0.05, this.w * 0.95), this._rand(this.h * 0.05, this.h * 0.95));
        }
      }

      if (this.enableRain) {
        this._drawRain(this.ctx);
      }

      if (this.enableFog) {
        this._drawFog(this.ctx);
      }

      this.animId = requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }
  }

  start() {
    if (this.isRunning) return;
    this._startAnimation();
  }
}
