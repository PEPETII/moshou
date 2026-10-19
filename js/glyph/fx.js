// 字形招式的世界层特效与打击反馈（工单 05 粒子 / 冲击环，工单 06 反馈）
//
// 招式表现（火星、水滴、烟、冲击环）始终保留；打击反馈由 GlyphFX.feedback 控制：
//   feedback = false：不出伤害数字、不顿帧、不震屏、不出碎字和墨渍、不计连斩、不盖朱印；
//   reduceMotion = true：只关震屏（取「墨迹动效」设置或系统「减少动态效果」之一）。
// 所有参数按原型像素给出，内部统一乘 GLYPH_SCALE；数值集中在 CONFIG.GLYPH_FEEDBACK。
const GlyphFX = {
  particles: [],
  rings: [],
  numbers: [],
  shards: [],
  MAX_PARTICLES: 700,

  feedback: true,
  numbersEnabled: true, // 战斗设置「伤害数字」开关：关闭时只隐藏数字，其余反馈照常
  shakeEnabled: true,   // 战斗设置「震动」开关：关闭时不震屏（塔与敌人受击晃动另由各自读取）
  reduceMotion: false,
  shake: 0,
  hitstop: 0,
  combo: 0,
  comboTimer: 0,
  bestCombo: 0,
  comboPop: 0,
  banner: null,
  nextMark: 0,
  stainCanvas: null,
  stainCtx: null,
  stainW: 0,
  stainH: 0,
  stainScale: 0,
  fadeTimer: 0,
  _offset: { x: 0, y: 0 },

  rnd(a, b) { return a + Math.random() * (b - a); },

  // bounds = { w, h }：世界尺寸（墨渍层按世界尺寸创建）；缺省时只清空反馈状态
  reset(bounds) {
    this.particles.length = 0;
    this.rings.length = 0;
    this.numbers.length = 0;
    this.shards.length = 0;
    this.shake = 0;
    this.hitstop = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.bestCombo = 0;
    this.banner = null;
    this.nextMark = 0;
    this.fadeTimer = 0;
    if (bounds && typeof document !== 'undefined') this.initStain(bounds.w, bounds.h);
    else if (this.stainCtx) this.stainCtx.clearRect(0, 0, this.stainW, this.stainH);
  },

  // 墨渍层位图 = 世界尺寸 × 高清倍率（跟随主画布，见 drawStain），内部按世界坐标绘制
  initStain(w, h) {
    const k = this.stainScale || 1;
    if (!this.stainCanvas || this.stainW !== w || this.stainH !== h) {
      this.stainW = w;
      this.stainH = h;
      this.stainCanvas = document.createElement('canvas');
      this._sizeStain(this.stainCanvas, k);
      this.stainCtx = this.stainCanvas.getContext('2d');
      this.stainCtx.setTransform(k, 0, 0, k, 0, 0);
      this.stainScale = k;
    } else {
      this.stainCtx.clearRect(0, 0, w, h);
    }
  },

  _sizeStain(cv, k) {
    cv.width = Math.round(this.stainW * k);
    cv.height = Math.round(this.stainH * k);
    cv.logicalWidth = this.stainW;
    cv.logicalHeight = this.stainH;
    cv.renderScale = k;
  },

  // 主画布倍率变化（缩放窗口、切换显示器）时，把已有墨渍按比例迁到新位图
  _rescaleStain(k) {
    const old = this.stainCanvas;
    const cv = document.createElement('canvas');
    this._sizeStain(cv, k);
    const c = cv.getContext('2d');
    c.drawImage(old, 0, 0, cv.width, cv.height);
    c.setTransform(k, 0, 0, k, 0, 0);
    this.stainCanvas = cv;
    this.stainCtx = c;
    this.stainScale = k;
  },

  // 退出战斗时释放墨渍画布
  release() {
    this.stainCanvas = null;
    this.stainCtx = null;
  },

  // o = { color, speed:[a,b], life:[a,b], size:[a,b], angle, spread, grav, drag, kind }
  emit(n, x, y, o) {
    const S = CONFIG.GLYPH_SCALE;
    const room = this.MAX_PARTICLES - this.particles.length;
    if (room <= 0) return;
    if (n > room) n = room;
    for (let i = 0; i < n; i++) {
      const a = o.angle == null ? this.rnd(0, Math.PI * 2) : o.angle + this.rnd(-1, 1) * (o.spread || 0);
      const sp = this.rnd(o.speed[0], o.speed[1]) * S;
      const life = this.rnd(o.life[0], o.life[1]);
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, max: life,
        size: this.rnd(o.size[0], o.size[1]) * S, color: o.color, kind: o.kind || 'ink',
        grav: (o.grav || 0) * S, drag: o.drag == null ? 2 : o.drag,
      });
    }
  },

  ring(x, y, maxR, color, life, width) {
    const S = CONFIG.GLYPH_SCALE;
    this.rings.push({ x, y, r: maxR * S * 0.15, maxR: maxR * S, color, life, max: life, width: (width || 6) * S });
  },

  // ---- 打击反馈 ----
  // 伤害数字：e 为敌人（取其坐标），opts = { crit, color, size }
  number(e, value, opts) {
    if (!this.feedback || !this.numbersEnabled) return;
    const v = Math.round(value);
    if (v < 1) return;
    const S = CONFIG.GLYPH_SCALE;
    const cfg = CONFIG.GLYPH_FEEDBACK.number;
    const crit = !!(opts && opts.crit);
    const life = crit ? cfg.critLife : cfg.life;
    if (this.numbers.length >= CONFIG.GLYPH_FEEDBACK.numberMax) this.numbers.shift();
    this.numbers.push({
      x: e.x + this.rnd(-8, 8) * S, y: e.y - 14 * S, vy: -(crit ? cfg.critRise : cfg.rise) * S,
      text: String(v) + (crit ? '!' : ''),
      size: (crit ? cfg.critSize : (opts && opts.size) || cfg.size) * S,
      color: (opts && opts.color) || CONFIG.GLYPH_COLORS.ink, life, max: life,
    });
  },

  addShake(v) {
    if (!this.feedback || this.reduceMotion || !this.shakeEnabled) return;
    const fb = CONFIG.GLYPH_FEEDBACK;
    this.shake = Math.min(fb.maxShake * CONFIG.GLYPH_SCALE, this.shake + v * CONFIG.GLYPH_SCALE);
  },

  // 顿帧：多座塔同时触发取最大值，不累加，并设上限
  addHitstop(t) {
    if (!this.feedback) return;
    this.hitstop = Math.min(CONFIG.GLYPH_FEEDBACK.hitstopMax, Math.max(this.hitstop, t));
  },

  // 主循环调用：返回本帧游戏时间倍率。dtSec 是未缩放的帧时间（游戏时间，暂停时主循环不会走到这里）
  frameScale(dtSec) {
    this.reduceMotion = typeof InkUI !== 'undefined' && typeof InkUI.motionReduced === 'function' && InkUI.motionReduced();
    if (!this.feedback) { this.clearFeedback(); return 1; }
    if (this.hitstop > 0) {
      this.hitstop -= dtSec;
      return CONFIG.GLYPH_FEEDBACK.hitstopScale;
    }
    return 1;
  },

  // 关闭反馈：立刻清掉数字、碎字、震屏、顿帧、连斩与朱印（墨渍层由 stain 开关控制显示，招式粒子不动）
  clearFeedback() {
    if (this.numbers.length) this.numbers.length = 0;
    if (this.shards.length) this.shards.length = 0;
    this.shake = 0;
    this.hitstop = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.banner = null;
    this.nextMark = 0;
  },

  // 世界层震屏偏移；暂停、结算时不抖
  shakeOffset(game) {
    const o = this._offset;
    if (!this.feedback || !this.shakeEnabled || this.reduceMotion || this.shake <= 0.05 ||
        (game && (game.gameEnded || game.isPaused || game.menuPaused || game.paused))) {
      o.x = 0; o.y = 0;
      return o;
    }
    o.x = (Math.random() * 2 - 1) * this.shake;
    o.y = (Math.random() * 2 - 1) * this.shake;
    return o;
  },

  // 敌字从中斜劈成两半飞散
  shatter(e, tint) {
    if (!this.feedback) return;
    const S = CONFIG.GLYPH_SCALE;
    const cfg = CONFIG.GLYPH_FEEDBACK.shard;
    const cut = this.rnd(-0.6, 0.6);
    const size = e.drawSize || e.size;
    for (const half of [0, 1]) {
      const dir = half ? 1 : -1;
      this.shards.push({
        char: e.char, size, x: e.x, y: e.y, cut, half, color: tint || CONFIG.GLYPH_COLORS.ink,
        vx: (dir * this.rnd(60, 140) + (e.pushVx || 0)) * S, vy: this.rnd(-160, -60) * S,
        rot: 0, vr: dir * this.rnd(2, 6), life: cfg.life, max: cfg.life,
      });
    }
  },

  stain(x, y, r, color, alpha) {
    if (!this.feedback || !this.stainCtx) return;
    const S = CONFIG.GLYPH_SCALE;
    const c = this.stainCtx;
    r *= S;
    c.save();
    c.fillStyle = color;
    for (let i = 0; i < 7; i++) {
      c.globalAlpha = alpha * this.rnd(0.35, 0.9);
      c.beginPath();
      c.arc(x + this.rnd(-r, r) * 0.7, y + this.rnd(-r, r) * 0.5, r * this.rnd(0.25, 0.7), 0, Math.PI * 2);
      c.fill();
    }
    for (let i = 0; i < 6; i++) {
      const a = this.rnd(0, Math.PI * 2);
      const d = r * this.rnd(1, 2.2);
      c.globalAlpha = alpha * 0.7;
      c.beginPath();
      c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, this.rnd(1, 3.2) * S, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  },

  // 把整字印进墨渍层（焚的焦痕）；size 已是世界像素
  stampGlyph(glyph, x, y, size, color, alpha) {
    if (!this.feedback || !this.stainCtx) return;
    Brush.drawGlyph(this.stainCtx, glyph, { x, y, size, color, alpha, dry: false });
  },

  // 击杀：连斩、碎字、墨渍、墨点；由 Enemy.hit 在击杀处调用
  kill(e, kind) {
    if (!this.feedback) return;
    const fb = CONFIG.GLYPH_FEEDBACK;
    const S = CONFIG.GLYPH_SCALE;
    this.combo++;
    this.comboTimer = fb.combo.window;
    this.comboPop = 1;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;
    const mark = fb.COMBO_MARKS[this.nextMark];
    if (mark && this.combo >= mark.at) {
      this.banner = { text: mark.text, life: fb.combo.bannerLife, max: fb.combo.bannerLife };
      this.nextMark++;
      this.addShake(6);
    }
    const tint = fb.killTint[kind] || CONFIG.GLYPH_COLORS.ink;
    const size = e.drawSize || e.size || 26;
    const heavy = e.weight > 1;
    this.shatter(e, tint);
    this.stain(e.x, e.y + 4 * S, size * 0.42 / S, tint, 0.32);
    this.emit(heavy ? 26 : 10, e.x, e.y, { color: tint, speed: [60, 220], life: [0.3, 0.6], size: [1.5, 3.5], grav: 300 });
    if (heavy) {
      this.addShake(fb.heavyKill.shake);
      this.addHitstop(fb.heavyKill.hitstop);
      this.ring(e.x, e.y, fb.heavyKill.ringR, tint, 0.4, 5);
    }
  },

  update(dt) {
    const ps = this.particles;
    let w = 0;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vx -= p.vx * p.drag * dt;
      p.vy -= p.vy * p.drag * dt;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ps[w++] = p;
    }
    ps.length = w;
    const rs = this.rings;
    w = 0;
    for (let i = 0; i < rs.length; i++) {
      const r = rs[i];
      r.life -= dt;
      if (r.life <= 0) continue;
      r.r += (r.maxR - r.r) * Math.min(1, dt * 9);
      rs[w++] = r;
    }
    rs.length = w;

    const ns = this.numbers;
    w = 0;
    for (let i = 0; i < ns.length; i++) {
      const n = ns[i];
      n.life -= dt;
      if (n.life <= 0) continue;
      n.y += n.vy * dt;
      n.vy *= 1 - 3 * dt;
      ns[w++] = n;
    }
    ns.length = w;
    const g = CONFIG.GLYPH_FEEDBACK.shard.gravity * CONFIG.GLYPH_SCALE;
    const ss = this.shards;
    w = 0;
    for (let i = 0; i < ss.length; i++) {
      const s = ss[i];
      s.life -= dt;
      if (s.life <= 0) continue;
      s.vy += g * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += s.vr * dt;
      ss[w++] = s;
    }
    ss.length = w;

    const fb = CONFIG.GLYPH_FEEDBACK;
    this.shake = Math.max(0, this.shake - dt * fb.shakeDecay * CONFIG.GLYPH_SCALE);
    this.comboPop = Math.max(0, this.comboPop - dt * 5);
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) { this.combo = 0; this.nextMark = 0; }
    }
    if (this.banner) { this.banner.life -= dt; if (this.banner.life <= 0) this.banner = null; }
    // 墨渍缓慢褪去
    this.fadeTimer += dt;
    if (this.fadeTimer > fb.stain.fadeInterval && this.stainCtx) {
      this.fadeTimer = 0;
      const c = this.stainCtx;
      c.save();
      c.globalCompositeOperation = 'destination-out';
      c.fillStyle = `rgba(0,0,0,${fb.stain.fadeRate})`;
      c.fillRect(0, 0, this.stainW, this.stainH);
      c.restore();
    }
  },

  // 墨渍层：世界层，背景之上、敌人之下
  drawStain(ctx) {
    if (!this.stainCanvas) return;
    const k = (ctx.canvas && ctx.canvas.renderScale) || 1;
    if (k !== this.stainScale) this._rescaleStain(k);
    if (this.feedback) ctx.drawImage(this.stainCanvas, 0, 0, this.stainW, this.stainH);
  },

  // 世界层特效：冲击环、粒子、碎字、伤害数字
  draw(ctx) {
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
        ctx.ellipse(p.x, p.y, p.size * 1.8, p.size * 0.8, Math.atan2(p.vy, p.vx), 0, Math.PI * 2);
      } else if (p.kind === 'smoke') {
        ctx.arc(p.x, p.y, p.size * (2 - k), 0, Math.PI * 2);
      } else {
        ctx.arc(p.x, p.y, p.size * (p.kind === 'ember' ? k : 1), 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!this.feedback) return;
    this.drawShards(ctx);
    this.drawNumbers(ctx);
  },

  drawShards(ctx) {
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
      ctx.font = `${s.size}px ${CONFIG.FONTS.BRUSH}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.char, 0, 0);
      ctx.restore();
    }
  },

  drawNumbers(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(242,236,223,0.85)';
    for (const n of this.numbers) {
      const k = n.life / n.max;
      const pop = 1 + Math.max(0, k - 0.8) * 2.5;
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.font = `${Math.round(n.size * pop)}px ${CONFIG.FONTS.BRUSH}`;
      ctx.strokeText(n.text, n.x, n.y);
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, n.x, n.y);
    }
    ctx.globalAlpha = 1;
  },

  // HUD 层（不随镜头与震屏）：连斩计数；w 为画布宽，避开右上角「危险 n / 200」
  drawHud(ctx, w) {
    if (!this.feedback) return;
    const C = CONFIG.GLYPH_COLORS;
    const font = CONFIG.FONTS.BRUSH;
    const cx = (w || 960) / 2;
    const cfg = CONFIG.GLYPH_FEEDBACK.combo;
    if (this.combo >= cfg.minShow) {
      const s = 1 + this.comboPop * 0.35;
      ctx.save();
      ctx.translate(cx, 44);
      ctx.scale(s, s);
      ctx.globalAlpha = Math.min(1, this.comboTimer * 1.5);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = C.inkSoft;
      ctx.font = `22px ${font}`;
      ctx.fillText('连斩', -6, 4);
      ctx.textAlign = 'left';
      ctx.fillStyle = this.combo >= cfg.sealAt ? C.seal : C.ink;
      ctx.font = `44px ${font}`;
      ctx.fillText(String(this.combo), 0, 0);
      ctx.restore();
    }
  },
};
