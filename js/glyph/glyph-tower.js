// 字形塔组件：挂在单座 Tower 实例（tower.gl）上（工单 05）
//
// 每座塔各自持有 strokes[]（笔画消耗与按笔顺写回）、charge（圆相蓄力）、timer、
// nextDot、recoil、readyPulse。写回过程就是冷却；蓄满后自动释放大招，没有手动入口。
const GlyphTower = {
  // 招式实现查 GlyphSystem.IMPLS 注册表（system.js）；未注册的类型退回水塔，保持旧行为
  impl(type) {
    return (GlyphSystem.IMPLS && GlyphSystem.IMPLS[type]) || GlyphWater;
  },

  has(type) { return !!(CONFIG.GLYPHS && CONFIG.GLYPHS[type]); },

  // Tower.reset 里调用：按类型初始化，并让整字按笔顺写出
  init(t) {
    const type = t.type;
    const base = CONFIG.GLYPH_TOWER;
    const glyph = CONFIG.GLYPHS[type];
    t.gl = {
      type,
      glyph,
      cfg: CONFIG.TOWERS[type].glyph,
      size: CONFIG.TOWERS[type].size,
      charge: base.startCharge,
      timer: base.startTimer,
      nextDot: 0,
      readyPulse: 0,
      recoil: 0,
      strokes: glyph.strokes.map((_, i) => ({
        prog: 0, delay: i * base.introDelayStep, rate: 1 / base.introDuration,
      })),
    };
  },

  // 用掉一笔：笔画消失，delay 秒后按 dur 秒重新写出
  consume(t, i, delay, dur) {
    const s = t.gl.strokes[i];
    s.prog = 0;
    s.delay = delay;
    s.rate = 1 / dur;
  },

  ready(t, i) { return t.gl.strokes[i].prog >= 1; },

  // 第 i 笔上 k 处（0..1）的世界坐标
  strokeWorld(t, i, k) {
    const gl = t.gl;
    const p = Brush.pointAt(gl.glyph.strokes[i], k);
    return Brush.toWorld(p, { x: t.x, y: t.y - gl.recoil, size: gl.size });
  },

  // 射程内「里程 s 最大」的敌人（塔防即最靠近终点；征服环形路径同样按 s）
  frontTarget(pool) {
    let best = null;
    for (const e of pool) if (!best || e.s > best.s) best = e;
    return best;
  },

  addCharge(t, v) { t.gl.charge = Math.min(1, t.gl.charge + v); },

  // 每帧推进：笔画写回、蓄力、自动大招、普攻。dt 单位为秒
  update(t, dt) {
    const gl = t.gl;
    const game = t.game;
    for (const s of gl.strokes) {
      if (s.prog >= 1) continue;
      if (s.delay > 0) s.delay -= dt;
      else s.prog = Math.min(1, s.prog + s.rate * dt);
    }
    gl.recoil = Math.max(0, gl.recoil - dt * 30 * CONFIG.GLYPH_SCALE);

    const pool = GlyphWorld.enemiesInRange(game, t.x, t.y, gl.cfg.range);
    const engaged = pool.length > 0;
    const impl = this.impl(gl.type);
    if (engaged) gl.charge = Math.min(1, gl.charge + gl.cfg.chargePerSec * dt);
    if (gl.charge >= 1) {
      gl.readyPulse += dt;
      // 自动释放：射程内有敌人 + 全局间隔已过；cast 返回 false（没有合适落点）就等下一帧
      if (engaged && GlyphSystem.canCast(game) && impl.cast(t, pool)) {
        gl.charge = 0;
        gl.readyPulse = 0;
        GlyphSystem.noteCast(game);
      }
    } else {
      gl.readyPulse = 0;
    }
    impl.update(t, dt, pool);
  },

  // 射程虚线圈：只在选中塔或放置预览时显示
  drawRange(ctx, x, y, rangePx, alpha) {
    ctx.save();
    ctx.setLineDash([3, 9]);
    ctx.strokeStyle = `rgba(60,52,44,${alpha == null ? 0.38 : alpha})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x, y, rangePx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },

  draw(ctx, t) {
    const gl = t.gl;
    const colors = CONFIG.GLYPH_COLORS;
    // 元素色按类型取：每座字形塔在 GLYPH_COLORS 里有主色与光晕，缺省退回浓墨
    const color = colors[gl.type] || colors.ink;
    const glow = colors[gl.type + 'Glow'] || null;
    const full = gl.charge >= 1;
    const pulse = full ? 0.5 + 0.5 * Math.sin(gl.readyPulse * 7) : 0;
    const size = gl.size;
    const y = t.y - gl.recoil;

    if (t.selected) {
      this.drawRange(ctx, t.x, t.y, gl.cfg.range);
      ctx.save();
      ctx.fillStyle = 'rgba(176, 58, 46, 0.06)';
      ctx.beginPath();
      ctx.arc(t.x, t.y, gl.cfg.range, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 墨托
    const g = ctx.createRadialGradient(t.x, t.y + 5, 3, t.x, t.y + 5, size * 0.7);
    g.addColorStop(0, 'rgba(60,50,40,0.16)');
    g.addColorStop(1, 'rgba(60,50,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(t.x, t.y + 5, size * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // 圆相蓄力环
    const ringW = CONFIG.GLYPH_TOWER.ringWidth;
    Brush.drawRing(ctx, t.x, t.y, size * CONFIG.GLYPH_TOWER.ringRadius, gl.charge,
      full ? color : 'rgba(60,52,44,0.42)', full ? ringW * 1.5 + pulse * 3 : ringW, gl.type === 'fire' ? 1 : 4);

    // 塔身：写回中的笔画用元素色，满蓄时整字元素色并发光
    Brush.drawGlyph(ctx, gl.glyph, { x: t.x, y, size }, (i) => {
      const s = gl.strokes[i];
      return {
        progress: s.prog,
        color: s.prog < 1 || full ? color : colors.ink,
        glow: full ? glow : null,
        glowBlur: 10 + pulse * 10,
      };
    });

    // 路径塔（山）：受过伤才显示生命条
    if (t.maxHp > 0 && t.hp < t.maxHp) {
      const w = size * 0.8;
      const by = t.y + size * 0.5;
      ctx.fillStyle = 'rgba(40,34,28,0.2)';
      ctx.fillRect(t.x - w / 2, by, w, 4);
      ctx.fillStyle = colors[gl.type] || colors.ink;
      ctx.fillRect(t.x - w / 2, by, w * Math.max(0, t.hp / t.maxHp), 4);
    }
  },

  // 放置预览 / 拖拽中的半透明字
  drawGhost(ctx, type, x, y, alpha, tint) {
    const glyph = CONFIG.GLYPHS[type];
    const size = CONFIG.TOWERS[type].size;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 0.6 : alpha;
    Brush.drawGlyph(ctx, glyph, { x, y, size, color: tint || CONFIG.GLYPH_COLORS.ink, dry: false });
    ctx.restore();
  },
};
