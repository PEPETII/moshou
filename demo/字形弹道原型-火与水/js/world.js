// 路径、敌人与伤害结算：敌人用路径里程 s 表示位置，击退即减小 s
const World = {
  segs: [], total: 0, enemies: [],
  kills: 0, leaks: 0, spawnAcc: 0, giantTimer: 0, density: 'normal',

  buildPath() {
    this.segs = [];
    let s = 0;
    for (let i = 1; i < PATH_POINTS.length; i++) {
      const [ax, ay] = PATH_POINTS[i - 1], [bx, by] = PATH_POINTS[i];
      const len = Math.hypot(bx - ax, by - ay);
      this.segs.push({ ax, ay, bx, by, len, s0: s, ang: Math.atan2(by - ay, bx - ax) });
      s += len;
    }
    this.total = s;
  },

  pointAt(s) {
    const c = Math.max(0, Math.min(this.total, s));
    for (const g of this.segs) {
      if (c <= g.s0 + g.len) {
        const k = (c - g.s0) / g.len;
        return { x: g.ax + (g.bx - g.ax) * k, y: g.ay + (g.by - g.ay) * k, ang: g.ang };
      }
    }
    const g = this.segs[this.segs.length - 1];
    return { x: g.bx, y: g.by, ang: g.ang };
  },

  nearestS(x, y) {
    let best = 0, bestD = Infinity;
    for (const g of this.segs) {
      const dx = g.bx - g.ax, dy = g.by - g.ay;
      const k = Math.max(0, Math.min(1, ((x - g.ax) * dx + (y - g.ay) * dy) / (g.len * g.len)));
      const d = Math.hypot(g.ax + dx * k - x, g.ay + dy * k - y);
      if (d < bestD) { bestD = d; best = g.s0 + g.len * k; }
    }
    return best;
  },

  reset() {
    this.enemies = [];
    this.kills = 0; this.leaks = 0; this.spawnAcc = 0; this.giantTimer = 4;
  },

  spawn(type) {
    if (this.enemies.length >= ENEMY_CAP) return;
    const t = ENEMY_TYPES[type];
    const p = this.pointAt(0);
    this.enemies.push({
      type, char: t.char, hp: t.hp, max: t.hp, speed: t.speed * rnd(0.92, 1.08), size: t.size,
      float: !!t.float, weight: t.weight, s: rnd(0, 20), x: p.x, y: p.y, lane: rnd(-9, 9),
      wet: 0, burnStacks: 0, burnTime: 0, burnAcc: 0, burnShow: 0, stun: 0, flash: 0,
      carried: null, pushVx: 0, bob: rnd(0, 6), dead: false,
    });
  },

  damage(e, amount, o) {
    if (e.dead) return;
    o = o || {};
    e.hp -= amount;
    e.flash = 0.12;
    if (!o.silent) FX.number(e.x, e.y - e.size * 0.4, amount, { crit: o.crit, color: o.color, size: o.size });
    if (e.hp <= 0) this.die(e, o.kind);
  },

  die(e, kind) {
    e.dead = true;
    this.kills++;
    FX.kill();
    const tint = kind === 'fire' ? '#5a2a1c' : kind === 'water' ? '#22445c' : COLORS.ink;
    FX.shatter(e, tint);
    FX.stain(e.x, e.y + 4, e.size * 0.42, tint, 0.32);
    FX.emit(e.weight > 1 ? 26 : 10, e.x, e.y, { color: tint, speed: [60, 220], life: [0.3, 0.6], size: [1.5, 3.5], grav: 300 });
    if (e.weight > 1) { FX.addShake(7); FX.addHitstop(0.06); FX.ring(e.x, e.y, 70, tint, 0.4, 5); }
  },

  burn(e, stacks, duration) {
    const max = TOWER_CFG.fire.burnMaxStacks;
    e.burnStacks = Math.min(max, e.burnStacks + stacks);
    e.burnTime = Math.max(e.burnTime, duration);
  },

  inRange(x, y, r) {
    return this.enemies.filter((e) => !e.dead && Math.hypot(e.x - x, e.y - y) <= r);
  },

  update(dt) {
    const cfg = DENSITY[this.density];
    this.spawnAcc += dt * cfg.rate;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      this.spawn(Math.random() < 0.7 ? 'corpse' : 'ghost');
    }
    this.giantTimer -= dt;
    if (this.giantTimer <= 0) { this.giantTimer = cfg.giantEvery; this.spawn('giant'); }

    const slow = TOWER_CFG.water.wetSlow;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (!e.carried) {
        if (e.stun > 0) e.stun -= dt;
        else e.s += e.speed * (e.wet > 0 ? 1 - slow : 1) * dt;
      }
      e.s = Math.max(0, e.s);
      e.pushVx *= 1 - Math.min(1, dt * 6);
      if (e.wet > 0) {
        e.wet -= dt;
        if (Math.random() < dt * 5) FX.emit(1, e.x, e.y + 6, { color: COLORS.waterLight, speed: [5, 20], life: [0.3, 0.5], size: [1.2, 2], grav: 260, angle: Math.PI / 2, spread: 0.3, kind: 'drop' });
      }
      if (e.burnTime > 0) {
        e.burnTime -= dt;
        const d = TOWER_CFG.fire.burnDps * e.burnStacks * dt;
        e.burnAcc += d;
        e.burnShow += dt;
        if (Math.random() < dt * 6 * e.burnStacks) FX.emit(1, e.x + rnd(-8, 8), e.y - 4, { color: COLORS.fireHot, speed: [20, 50], life: [0.3, 0.6], size: [1.5, 3], angle: -Math.PI / 2, spread: 0.5, grav: -40, kind: 'ember' });
        if (e.burnShow >= 0.45) {
          this.damage(e, e.burnAcc, { color: COLORS.fire, size: 15, kind: 'fire' });
          e.burnAcc = 0; e.burnShow = 0;
        }
        if (e.burnTime <= 0) e.burnStacks = 0;
      }
      if (e.flash > 0) e.flash -= dt;
      const p = this.pointAt(e.s);
      const nx = -Math.sin(p.ang), ny = Math.cos(p.ang);
      e.x = p.x + nx * e.lane;
      e.y = p.y + ny * e.lane + (e.float ? Math.sin(performance.now() / 260 + e.bob) * 4 - 6 : 0);
      if (e.s >= this.total - 2) { e.dead = true; this.leaks++; }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
  },

  drawPath(ctx) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const trace = () => {
      ctx.beginPath();
      PATH_POINTS.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    };
    trace(); ctx.strokeStyle = 'rgba(120,110,96,0.10)'; ctx.lineWidth = 64; ctx.stroke();
    trace(); ctx.strokeStyle = COLORS.path; ctx.lineWidth = 46; ctx.stroke();
    ctx.setLineDash([2, 14]);
    trace(); ctx.strokeStyle = 'rgba(90,82,70,0.35)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  },

  drawEnemies(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const e of this.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.fillStyle = 'rgba(40,34,28,0.12)';
      ctx.beginPath();
      ctx.ellipse(0, e.size * 0.45 + (e.float ? 8 : 0), e.size * 0.42, e.size * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      if (e.wet > 0) {
        ctx.fillStyle = COLORS.waterWash;
        ctx.beginPath(); ctx.arc(0, 0, e.size * 0.62, 0, Math.PI * 2); ctx.fill();
      }
      if (e.burnTime > 0) {
        ctx.fillStyle = 'rgba(220,100,40,0.16)';
        ctx.beginPath(); ctx.arc(0, -2, e.size * 0.6, 0, Math.PI * 2); ctx.fill();
      }
      if (e.flash > 0) ctx.translate(rnd(-2, 2), rnd(-2, 2));
      ctx.font = `${e.size}px ${FONT_BRUSH}`;
      ctx.fillStyle = e.flash > 0 ? COLORS.seal : e.wet > 0 ? '#1f3446' : COLORS.ink;
      ctx.globalAlpha = e.float ? 0.85 : 1;
      ctx.fillText(e.char, 0, 0);
      ctx.globalAlpha = 1;
      if (e.hp < e.max) {
        const w = e.size * 0.9;
        ctx.fillStyle = 'rgba(40,34,28,0.18)';
        ctx.fillRect(-w / 2, e.size * 0.58, w, 3);
        ctx.fillStyle = COLORS.seal;
        ctx.fillRect(-w / 2, e.size * 0.58, w * Math.max(0, e.hp / e.max), 3);
      }
      if (e.stun > 0 && !e.carried) {
        ctx.strokeStyle = COLORS.waterLight;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, -e.size * 0.62, e.size * 0.35, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  },
};
