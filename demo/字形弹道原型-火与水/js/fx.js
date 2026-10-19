// 打击反馈：粒子、伤害数字、冲击环、碎字、墨渍、震屏、顿帧、连斩
const rnd = (a, b) => a + Math.random() * (b - a);

const FX = {
  particles: [], numbers: [], rings: [], shards: [],
  shake: 0, hitstop: 0, feedback: true,
  combo: 0, comboTimer: 0, bestCombo: 0, comboPop: 0, banner: null, nextMark: 0,
  stainCtx: null, fadeTimer: 0,

  init(stainCtx) { this.stainCtx = stainCtx; },

  reset() {
    this.particles.length = 0; this.numbers.length = 0; this.rings.length = 0; this.shards.length = 0;
    this.shake = 0; this.hitstop = 0; this.combo = 0; this.comboTimer = 0; this.bestCombo = 0;
    this.banner = null; this.nextMark = 0;
    if (this.stainCtx) this.stainCtx.clearRect(0, 0, STAGE.W, STAGE.H);
  },

  // 通用发射：o = { color, speed:[a,b], life:[a,b], size:[a,b], angle, spread, grav, drag, kind }
  emit(n, x, y, o) {
    for (let i = 0; i < n; i++) {
      const a = (o.angle == null ? rnd(0, Math.PI * 2) : o.angle + rnd(-1, 1) * (o.spread || 0));
      const sp = rnd(o.speed[0], o.speed[1]);
      const life = rnd(o.life[0], o.life[1]);
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, max: life,
        size: rnd(o.size[0], o.size[1]), color: o.color, kind: o.kind || 'ink',
        grav: o.grav || 0, drag: o.drag == null ? 2 : o.drag,
      });
    }
  },

  number(x, y, value, o) {
    if (!this.feedback) return;
    const crit = o && o.crit;
    this.numbers.push({
      x: x + rnd(-8, 8), y: y - 14, vy: crit ? -95 : -70, text: String(Math.round(value)) + (crit ? '!' : ''),
      size: crit ? 34 : (o && o.size) || 19, color: (o && o.color) || COLORS.ink, life: crit ? 1 : 0.75, max: crit ? 1 : 0.75,
    });
  },

  ring(x, y, maxR, color, life, width) {
    this.rings.push({ x, y, r: maxR * 0.15, maxR, color, life, max: life, width: width || 6 });
  },

  addShake(v) { if (this.feedback && !this.reduceMotion) this.shake = Math.min(22, this.shake + v); },
  addHitstop(t) { if (this.feedback) this.hitstop = Math.max(this.hitstop, t); },

  // 敌字从中斜劈成两半飞散
  shatter(e, tint) {
    if (!this.feedback) return;
    const cut = rnd(-0.6, 0.6);
    for (const half of [0, 1]) {
      const dir = half ? 1 : -1;
      this.shards.push({
        char: e.char, size: e.size, x: e.x, y: e.y, cut, half, color: tint || COLORS.ink,
        vx: dir * rnd(60, 140) + e.pushVx, vy: rnd(-160, -60), rot: 0, vr: dir * rnd(2, 6), life: 0.7, max: 0.7,
      });
    }
  },

  stain(x, y, r, color, alpha) {
    if (!this.feedback || !this.stainCtx) return;
    const c = this.stainCtx;
    c.save();
    c.fillStyle = color;
    for (let i = 0; i < 7; i++) {
      c.globalAlpha = alpha * rnd(0.35, 0.9);
      c.beginPath();
      c.arc(x + rnd(-r, r) * 0.7, y + rnd(-r, r) * 0.5, r * rnd(0.25, 0.7), 0, Math.PI * 2);
      c.fill();
    }
    for (let i = 0; i < 6; i++) {
      const a = rnd(0, Math.PI * 2), d = r * rnd(1, 2.2);
      c.globalAlpha = alpha * 0.7;
      c.beginPath();
      c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, rnd(1, 3.2), 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  },

  stampGlyph(glyph, x, y, size, color, alpha) {
    if (!this.stainCtx) return;
    Brush.drawGlyph(this.stainCtx, glyph, { x, y, size, color, alpha, dry: false });
  },

  kill() {
    this.combo++;
    this.comboTimer = 1.6;
    this.comboPop = 1;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;
    const mark = COMBO_MARKS[this.nextMark];
    if (this.feedback && mark && this.combo >= mark.at) {
      this.banner = { text: mark.text, life: 1.4, max: 1.4 };
      this.nextMark++;
      this.addShake(6);
    }
  },

  update(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.vx -= p.vx * p.drag * dt; p.vy -= p.vy * p.drag * dt;
      p.vy += p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const n of this.numbers) { n.life -= dt; n.y += n.vy * dt; n.vy *= 1 - 3 * dt; }
    this.numbers = this.numbers.filter((n) => n.life > 0);
    for (const r of this.rings) { r.life -= dt; r.r += (r.maxR - r.r) * Math.min(1, dt * 9); }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const s of this.shards) {
      s.life -= dt; s.vy += 520 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt;
    }
    this.shards = this.shards.filter((s) => s.life > 0);
    this.shake = Math.max(0, this.shake - dt * 40);
    this.comboPop = Math.max(0, this.comboPop - dt * 5);
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) { this.combo = 0; this.nextMark = 0; }
    }
    if (this.banner) { this.banner.life -= dt; if (this.banner.life <= 0) this.banner = null; }
    // 墨渍缓慢褪去
    this.fadeTimer += dt;
    if (this.fadeTimer > 0.5 && this.stainCtx) {
      this.fadeTimer = 0;
      const c = this.stainCtx;
      c.save();
      c.globalCompositeOperation = 'destination-out';
      c.fillStyle = 'rgba(0,0,0,0.035)';
      c.fillRect(0, 0, STAGE.W, STAGE.H);
      c.restore();
    }
  },

  drawWorld(ctx) {
    for (const r of this.rings) {
      ctx.save();
      ctx.globalAlpha = (r.life / r.max) * 0.8;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (r.life / r.max) + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    for (const p of this.particles) {
      const k = p.life / p.max;
      ctx.globalAlpha = p.kind === 'smoke' ? k * 0.22 : Math.min(1, k * 1.4);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      if (p.kind === 'drop') {
        const a = Math.atan2(p.vy, p.vx);
        ctx.ellipse(p.x, p.y, p.size * 1.8, p.size * 0.8, a, 0, Math.PI * 2);
      } else if (p.kind === 'smoke') {
        ctx.arc(p.x, p.y, p.size * (2 - k), 0, Math.PI * 2);
      } else {
        ctx.arc(p.x, p.y, p.size * (p.kind === 'ember' ? k : 1), 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const s of this.shards) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (s.life / s.max) * 1.6);
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.beginPath();
      const big = s.size * 2;
      const sign = s.half ? 1 : -1;
      ctx.moveTo(-big, -big * s.cut);
      ctx.lineTo(big, big * s.cut);
      ctx.lineTo(big, sign * big * 2);
      ctx.lineTo(-big, sign * big * 2);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = s.color;
      ctx.font = `${s.size}px ${FONT_BRUSH}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.char, 0, 0);
      ctx.restore();
    }
  },

  drawNumbers(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const n of this.numbers) {
      const k = n.life / n.max;
      const pop = 1 + Math.max(0, k - 0.8) * 2.5;
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.font = `${Math.round(n.size * pop)}px ${FONT_BRUSH}`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(242,236,223,0.85)';
      ctx.strokeText(n.text, n.x, n.y);
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, n.x, n.y);
    }
    ctx.globalAlpha = 1;
  },

  drawHud(ctx) {
    if (!this.feedback) return;
    if (this.combo >= 3) {
      const s = 1 + this.comboPop * 0.35;
      ctx.save();
      ctx.translate(STAGE.W / 2, 44);
      ctx.scale(s, s);
      ctx.globalAlpha = Math.min(1, this.comboTimer * 1.5);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = COLORS.inkSoft;
      ctx.font = `22px ${FONT_BRUSH}`;
      ctx.fillText('连斩', -6, 4);
      ctx.textAlign = 'left';
      ctx.fillStyle = this.combo >= 25 ? COLORS.seal : COLORS.ink;
      ctx.font = `44px ${FONT_BRUSH}`;
      ctx.fillText(String(this.combo), 0, 0);
      ctx.restore();
    }
    if (this.banner) {
      // 朱印：四字两行竖排
      const b = this.banner, k = b.life / b.max;
      const s = k > 0.85 ? 1 + (k - 0.85) * 4 : 1;
      ctx.save();
      ctx.translate(STAGE.W / 2, STAGE.H / 2 - 10);
      ctx.rotate(-0.06);
      ctx.scale(s, s);
      ctx.globalAlpha = Math.min(1, k * 3) * 0.92;
      ctx.strokeStyle = COLORS.seal;
      ctx.lineWidth = 7;
      ctx.strokeRect(-62, -62, 124, 124);
      ctx.fillStyle = COLORS.seal;
      ctx.font = `52px ${FONT_BRUSH}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const t = b.text;
      ctx.fillText(t[0], 26, -27); ctx.fillText(t[1], 26, 28);
      ctx.fillText(t[2], -26, -27); ctx.fillText(t[3], -26, 28);
      ctx.restore();
    }
  },
};
