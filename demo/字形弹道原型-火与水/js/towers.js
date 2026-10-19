// 塔的通用部分：笔画消耗与按笔顺重写、蓄力圆相、塔身绘制、招式调度
// mode = 'glyph'（字形弹道）| 'plain'（普通弹道，对照用：机制与数值相同，只换表现）
const Towers = {
  list: [], shots: [], mode: 'glyph', auto: false, roster: 'both',

  reset() {
    this.shots = [];
    this.list = [];
    if (this.roster !== 'water') this.list.push(this.make('fire'));
    if (this.roster !== 'fire') this.list.push(this.make('water'));
  },

  make(type) {
    const cfg = TOWER_CFG[type];
    return {
      type, cfg, glyph: GLYPHS[type], x: cfg.x, y: cfg.y, size: cfg.size,
      charge: 0.35, timer: 0.5, nextDot: 0, readyPulse: 0, recoil: 0,
      strokes: GLYPHS[type].strokes.map(() => ({ prog: 1, delay: 0, rate: 1 })),
    };
  },

  get(type) { return this.list.find((t) => t.type === type); },

  // 用掉一笔：笔画消失，delay 秒后按 dur 秒重新写出
  consume(t, i, delay, dur) {
    const s = t.strokes[i];
    s.prog = 0; s.delay = delay; s.rate = 1 / dur;
  },

  ready(t, i) { return t.strokes[i].prog >= 1; },

  strokeWorld(t, i, k) {
    const p = Brush.pointAt(t.glyph.strokes[i], k);
    return Brush.toWorld(p, { x: t.x, y: t.y - t.recoil, size: t.size });
  },

  // 射程内最靠近终点的敌人
  frontTarget(t, pool) {
    let best = null;
    for (const e of pool || World.inRange(t.x, t.y, t.cfg.range)) {
      if (!best || e.s > best.s) best = e;
    }
    return best;
  },

  cast(type) {
    const t = this.get(type);
    if (!t || t.charge < 1) return false;
    const ok = type === 'fire' ? FireTower.cast(t) : WaterTower.cast(t);
    if (ok) t.charge = 0;
    return ok;
  },

  hitTest(x, y) {
    return this.list.find((t) => Math.hypot(t.x - x, t.y - y) < t.size * 0.62) || null;
  },

  update(dt) {
    for (const t of this.list) {
      for (const s of t.strokes) {
        if (s.prog >= 1) continue;
        if (s.delay > 0) s.delay -= dt;
        else s.prog = Math.min(1, s.prog + s.rate * dt);
      }
      t.recoil = Math.max(0, t.recoil - dt * 30);
      const engaged = World.inRange(t.x, t.y, t.cfg.range).length > 0;
      if (engaged) t.charge = Math.min(1, t.charge + t.cfg.chargePerSec * dt);
      if (t.charge >= 1) {
        t.readyPulse += dt;
        if (this.auto && engaged) this.cast(t.type);
      } else t.readyPulse = 0;
      if (t.type === 'fire') FireTower.update(t, dt); else WaterTower.update(t, dt);
    }
    for (const s of this.shots) {
      if (s.tower.type === 'fire') FireTower.updateShot(s, dt); else WaterTower.updateShot(s, dt);
    }
    this.shots = this.shots.filter((s) => !s.done);
  },

  addCharge(t, v) { t.charge = Math.min(1, t.charge + v); },

  drawGround(ctx) {
    for (const s of this.shots) if (s.ground) (s.tower.type === 'fire' ? FireTower : WaterTower).drawShot(ctx, s);
  },

  drawShots(ctx) {
    for (const s of this.shots) if (!s.ground) (s.tower.type === 'fire' ? FireTower : WaterTower).drawShot(ctx, s);
  },

  drawTowers(ctx) {
    for (const t of this.list) {
      const color = t.type === 'fire' ? COLORS.fire : COLORS.water;
      const full = t.charge >= 1;
      const pulse = full ? 0.5 + 0.5 * Math.sin(t.readyPulse * 7) : 0;
      ctx.save();
      // 射程
      ctx.setLineDash([3, 9]);
      ctx.strokeStyle = 'rgba(60,52,44,0.16)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(t.x, t.y, t.cfg.range, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      if (this.mode === 'plain') { this.drawPlainTower(ctx, t, full); continue; }
      // 墨托
      const g = ctx.createRadialGradient(t.x, t.y + 6, 4, t.x, t.y + 6, t.size * 0.7);
      g.addColorStop(0, 'rgba(60,50,40,0.16)');
      g.addColorStop(1, 'rgba(60,50,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(t.x, t.y + 6, t.size * 0.7, 0, Math.PI * 2); ctx.fill();
      // 圆相蓄力环
      Brush.drawRing(ctx, t.x, t.y, t.size * 0.66, t.charge, full ? color : 'rgba(60,52,44,0.42)', full ? 6 + pulse * 3 : 4, t.type === 'fire' ? 1 : 4);
      Brush.drawGlyph(ctx, t.glyph, { x: t.x, y: t.y - t.recoil, size: t.size }, (i) => {
        const s = t.strokes[i];
        const writing = s.prog < 1;
        return {
          progress: s.prog,
          color: writing || full ? color : COLORS.ink,
          glow: full ? (t.type === 'fire' ? COLORS.fireGlow : 'rgba(80,140,180,0.5)') : null,
          glowBlur: 10 + pulse * 10,
        };
      });
      if (full) this.drawHint(ctx, t, color, pulse);
    }
  },

  drawHint(ctx, t, color, pulse) {
    if (this.auto) return;
    ctx.save();
    ctx.font = `20px ${FONT_BRUSH}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.65 + pulse * 0.35;
    ctx.fillStyle = color;
    // 放在塔右侧，避开上下两条路
    ctx.fillText(t.type === 'fire' ? '点塔 · 焚' : '点塔 · 潮', t.x + t.size * 0.66 + 14, t.y);
    ctx.restore();
  },

  drawPlainTower(ctx, t, full) {
    const half = t.size * 0.42;
    ctx.save();
    ctx.fillStyle = '#e4ddcf';
    ctx.strokeStyle = COLORS.plain;
    ctx.lineWidth = 2;
    ctx.fillRect(t.x - half, t.y - half, half * 2, half * 2);
    ctx.strokeRect(t.x - half, t.y - half, half * 2, half * 2);
    ctx.fillStyle = COLORS.plain;
    ctx.font = `${Math.round(t.size * 0.62)}px ${FONT_BRUSH}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.glyph.char, t.x, t.y + 2);
    ctx.fillStyle = 'rgba(60,52,44,0.18)';
    ctx.fillRect(t.x - half, t.y + half + 6, half * 2, 5);
    ctx.fillStyle = full ? COLORS.ink : COLORS.plain;
    ctx.fillRect(t.x - half, t.y + half + 6, half * 2 * t.charge, 5);
    ctx.restore();
    if (full) this.drawHint(ctx, t, COLORS.ink, 1);
  },
};
