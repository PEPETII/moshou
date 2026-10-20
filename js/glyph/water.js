// 水塔：竖钩被拉长成一道贯穿水箭（普攻「水箭」）；横撇、撇、捺离开塔身化作浪头，
// 沿路径倒卷，把卷入的敌人一路推回去（大招「潮」，蓄满自动释放）。
// 移植自原型 water.js（工单 05）。浪头是一个路径里程值，被卷入的敌人把自己的里程锁在浪后。
const GlyphWater = {
  // 普攻：竖钩写满才能发射，目标是射程内里程最靠前的敌人
  update(t, dt, pool) {
    const gl = t.gl;
    const cfg = gl.cfg;
    gl.timer -= dt;
    if (gl.timer > 0 || !GlyphTower.ready(t, 0)) return;
    const target = GlyphTower.frontTarget(pool);
    if (!target) return;
    const S = CONFIG.GLYPH_SCALE;
    gl.timer = cfg.jetInterval;
    const ox = t.x;
    const oy = t.y - gl.size * 0.08;
    const aim = Math.atan2(target.y - oy, target.x - ox);
    const len = Math.min(cfg.range + 20 * S, Math.hypot(target.x - ox, target.y - oy) + cfg.jetReach);
    GlyphTower.consume(t, 0, 0.3, cfg.shuRewrite);
    gl.recoil = 4 * S;
    GlyphSystem.push(t.game, { tower: t, kind: 'jet', x: ox, y: oy, aim, len, t: 0, dur: 0.38, hit: false });
  },

  // 大招「潮」：浪从射程内最靠前的敌人前方涌起，向来路倒卷；没有合适落点返回 false
  cast(t, pool) {
    const gl = t.gl;
    const cfg = gl.cfg;
    const S = CONFIG.GLYPH_SCALE;
    const front = GlyphTower.frontTarget(pool, true);
    if (!front || !front.track) return false;
    const track = front.track;
    const s0 = Math.min(track.total - 10 * S, front.s + cfg.waveLead);
    // 倒卷下限：塔防不把敌人推出画面；征服（环形）不跨过 0 点绕回
    const floor = track.loop ? Math.max(0, s0 - cfg.waveSpeed * cfg.waveTime) : cfg.waveFloor;
    if (s0 - floor < cfg.waveMinTravel) return false;
    const step = cfg.rewriteSides / 3;
    for (let i = 1; i < 4; i++) GlyphTower.consume(t, i, cfg.waveTime * 0.7 + (i - 1) * step, step);
    GlyphSystem.push(t.game, {
      tower: t, kind: 'wave', track, s: s0, s0, floor, t: 0, dur: cfg.waveTime, caught: [],
      budget: CONFIG.CONTROL.carryBudget.water, touched: new Set(),
    });
    GlyphFX.addShake(5);
    GlyphFX.addHitstop(0.05);
    GlyphFX.emit(24, t.x, t.y, { color: CONFIG.GLYPH_COLORS.waterLight, speed: [80, 240], life: [0.3, 0.6], size: [1.5, 3], kind: 'drop' });
    return true;
  },

  updateShot(s, dt) {
    if (s.kind === 'jet') this.updateJet(s, dt);
    else if (s.kind === 'wave') this.updateWave(s, dt);
  },

  updateJet(s, dt) {
    s.t += dt;
    if (!s.hit && s.t >= 0.09) { s.hit = true; this.jetHit(s); }
    if (s.t >= s.dur) s.done = true;
  },

  jetHit(s) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    const dx = Math.cos(s.aim);
    const dy = Math.sin(s.aim);
    // 只查水柱附近的敌人：以线段中点为圆心的圆足以覆盖
    const near = GlyphWorld.enemiesInRange(s.game, s.x + dx * s.len / 2, s.y + dy * s.len / 2, s.len / 2 + cfg.jetWidth + 30);
    let hits = 0;
    for (const e of near) {
      const along = (e.x - s.x) * dx + (e.y - s.y) * dy;
      if (along < 0 || along > s.len) continue;
      const off = Math.abs((e.x - s.x) * dy - (e.y - s.y) * dx);
      if (off > cfg.jetWidth + e.size * 0.3) continue;
      hits++;
      ControlRules.knock(e, cfg.jetKnock, 'water');
      e.makeWet(cfg.wetDuration);
      e.pushVx = dx * 140 * CONFIG.GLYPH_SCALE;
      GlyphWorld.damage(e, Math.round(GlyphFX.rnd(cfg.jetDamage[0], cfg.jetDamage[1])), { color: c.water, kind: 'water', delivery: 'instant' });
      GlyphFX.emit(7, e.x, e.y, { color: c.waterLight, speed: [60, 200], life: [0.25, 0.5], size: [1.5, 3], angle: s.aim, spread: 0.9, kind: 'drop' });
    }
    // 充能按命中数计，但每发最多按 jetChargeCap 个，避免敌群扎堆时潮无限连放
    GlyphTower.addCharge(s.tower, cfg.chargePerHit * Math.min(cfg.jetChargeCap, hits));
    const ex = s.x + dx * s.len;
    const ey = s.y + dy * s.len;
    // 钩 = 水花：在末端甩出一簇水滴
    GlyphFX.emit(12, ex, ey, { color: c.waterLight, speed: [60, 240], life: [0.25, 0.55], size: [1.5, 3], angle: s.aim + Math.PI * 0.75, spread: 0.8, kind: 'drop' });
    GlyphFX.ring(ex, ey, 26, c.water, 0.25, 3);
    if (hits) GlyphFX.addShake(Math.min(3, 0.6 * hits));
  },

  updateWave(s, dt) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    const track = s.track;
    if (!s.touched) { s.touched = new Set(); s.budget = CONFIG.CONTROL.carryBudget.water; }
    s.t += dt;
    const prev = s.s;
    s.s = Math.max(s.floor, s.s - cfg.waveSpeed * dt);
    // 卷入受体量预算约束（工单 12）：按里程从大到小（离核心近的优先），预算不够的敌人只吃伤害、被打湿，不被拖走；
    // 三字、四字敌人不卷入；刚被放下的敌人有 carryImmune 抗性
    const reach = [];
    for (const e of s.game.enemies) {
      if (e.dead || e.track !== track || s.touched.has(e)) continue;
      if (e.s >= s.s - cfg.waveCatchBack && e.s <= prev + cfg.waveCatchFront && e.s <= s.s0 + cfg.waveLead) reach.push(e);
    }
    reach.sort((a, b) => b.s - a.s);
    for (const e of reach) {
      s.touched.add(e);
      const cost = ControlRules.carryCost(e);
      if (ControlRules.canCarry(e, 'water') && s.budget >= cost) {
        s.budget -= cost;
        e.carried = s;
        e.carryOff = GlyphFX.rnd(cfg.waveCarryOff[0], cfg.waveCarryOff[1]);
        e.carryCatchS = s.s;
        s.caught.push(e);
      }
      e.makeWet(cfg.wetDuration + 1.5);
      GlyphWorld.damage(e, cfg.waveCatchDamage, { color: c.water, kind: 'water', delivery: 'instant', aoe: true });
    }
    for (const e of s.caught) {
      if (e.dead) continue;
      // 倒卷距离按档位打折：重敌、双字被拖着走的距离更短
      const lag = (1 - ControlRules.tier(e).carryDistMul) * (e.carryCatchS - s.s);
      e.s = s.s + e.carryOff + lag;
      e.syncPosition();
    }
    const p = track.pointAt(s.s);
    const travel = p.ang + Math.PI;
    const nx = -Math.sin(p.ang);
    const ny = Math.cos(p.ang);
    const n = Math.ceil(dt * 70);
    for (let i = 0; i < n; i++) {
      const o = GlyphFX.rnd(-30, 30) * CONFIG.GLYPH_SCALE;
      GlyphFX.emit(1, p.x + nx * o, p.y + ny * o, {
        color: Math.random() < 0.6 ? c.waterLight : c.water, speed: [90, 240], life: [0.2, 0.45],
        size: [1.5, 3.2], angle: travel, spread: 0.6, kind: 'drop', drag: 3,
      });
    }
    if (Math.random() < dt * 20) {
      GlyphFX.emit(1, p.x, p.y, { color: c.waterLight, speed: [5, 20], life: [0.6, 1], size: [12, 20], kind: 'smoke', drag: 1 });
    }
    if (s.t >= s.dur || s.s <= s.floor) { s.done = true; this.release(s, p); }
  },

  release(s, p) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    for (const e of s.caught) {
      if (e.dead) continue;
      e.carried = null;
      e.carryImmuneT = CONFIG.CONTROL.carryImmune;
      ControlRules.stun(e, cfg.waveStun, 'water');
      e.makeWet(cfg.wetDuration + 1.5);
      GlyphWorld.damage(e, cfg.waveEndDamage, { color: c.water, kind: 'water', delivery: 'instant', aoe: true });
    }
    GlyphFX.addShake(9, true);
    GlyphFX.addHitstop(0.07);
    GlyphFX.ring(p.x, p.y, 95, c.water, 0.5, 9);
    GlyphFX.emit(55, p.x, p.y, { color: c.waterLight, speed: [80, 400], life: [0.3, 0.8], size: [1.5, 3.5], kind: 'drop', drag: 2.5 });
    GlyphFX.emit(20, p.x, p.y, { color: c.water, speed: [60, 220], life: [0.3, 0.6], size: [2, 3.5], kind: 'drop' });
    GlyphFX.stain(p.x, p.y, 32, '#2a4a60', 0.2);
  },

  drawShot(ctx, s) {
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    const gl = s.tower.gl;
    if (s.kind === 'jet') {
      const prog = Math.min(1, s.t / 0.09);
      const fade = s.t > 0.09 ? 1 - (s.t - 0.09) / (s.dur - 0.09) : 1;
      // 把塔身的竖钩本身拉长到目标：竖是水柱，钩是甩出的水花
      const shu = gl.glyph.strokes[0];
      const widthK = gl.size / 100;
      for (const layer of [{ w: 2.2, color: c.waterLight, a: 0.28 }, { w: 1 + 0.4 * fade, color: c.water, a: 0.4 + 0.6 * fade }]) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.aim - Math.PI / 2);
        ctx.scale(widthK * layer.w, s.len / 85);
        ctx.translate(-51, -5);
        Brush.drawStroke(ctx, shu, { x: 50, y: 50, size: 100, progress: prog, color: layer.color, alpha: layer.a * fade, wash: false, dry: layer.w < 2 });
        ctx.restore();
      }
    } else if (s.kind === 'wave') {
      const track = s.track;
      const p = track.pointAt(s.s);
      // 浪后的水痕
      const trail = gl.cfg.waveTrail;
      const step = 10 * S;
      for (let d = 0; d < trail; d += step) {
        const q = track.pointAt(Math.min(s.s0, s.s + d));
        ctx.fillStyle = `rgba(60,110,145,${0.2 * (1 - d / trail)})`;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 30 * S, 0, Math.PI * 2);
        ctx.fill();
      }
      // 浪头 = 「水」字离开塔身的三笔，字顶朝向前进方向
      const travel = p.ang + Math.PI;
      const swell = 1 + 0.08 * Math.sin(s.t * 18);
      Brush.drawGlyph(ctx, gl.glyph, {
        x: p.x, y: p.y, size: gl.cfg.waveGlyph * swell, rot: travel + Math.PI / 2,
        color: c.water, glow: 'rgba(80,140,180,0.45)', glowBlur: 14,
      }, (i) => (i === 0 ? { hidden: true } : null));
    }
  },
};
