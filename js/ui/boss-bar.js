// 首领与精英的战场界面（工单 01 §3.4、09 §4、10 §5、14 §2）
//
// 世界层（随镜头）：首领出场前的墨晕预兆、精英出场的朱砂小印。
// HUD 层（不随镜头）：夜幕压暗、顶部首领血条（四字各带血条，碎字划线变灰，细震慑条）、首领横幅、屏外首领的朱砂箭头。
// 状态都在 game 上（BossFlow 维护）：boss、bossBanner、bossOmen、entrySeals、nightT / nightDim。
const BossBar = {
  _boundCanvas: null,
  _arrow: null,

  reduced() {
    return !!(window.InkUI && typeof InkUI.motionReduced === 'function' && InkUI.motionReduced());
  },

  // ---------- 世界层 ----------
  drawWorld(ctx, game) {
    const S = CONFIG.GLYPH_SCALE;
    const seal = (CONFIG.GLYPH_COLORS && CONFIG.GLYPH_COLORS.seal) || '#b03a2e';
    // 首领出场前的墨晕：入口处一团越来越大的浓墨
    const omen = game.bossOmen;
    if (omen) {
      const k = Math.min(1, omen.t / CONFIG.BOSS.omenSeconds);
      const r = (30 + 90 * k) * (this.reduced() ? 1 : 1 + 0.06 * Math.sin(omen.t * 8)) * S;
      const g = ctx.createRadialGradient(omen.x, omen.y, r * 0.1, omen.x, omen.y, r);
      g.addColorStop(0, `rgba(28,26,23,${0.35 * k})`);
      g.addColorStop(1, 'rgba(28,26,23,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(omen.x, omen.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // 精英出场的朱砂小印（入口处，持续 1.2 秒）
    for (const s of game.entrySeals || []) {
      const a = Math.min(1, s.t / 0.2, (s.max - s.t) / 0.3);
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      ctx.translate(s.x + 24, s.y - 36);
      ctx.rotate(-0.06);
      ctx.fillStyle = seal;
      ctx.fillRect(-4, -14, s.text.length * 14 + 8, 22);
      ctx.fillStyle = '#f2ecdf';
      ctx.font = `14px ${CONFIG.FONTS.BRUSH}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.text, 0, -2);
      ctx.restore();
    }
  },

  // ---------- HUD 层 ----------
  drawHud(ctx, game) {
    const W = CONFIG.VIEW_W;
    const H = CONFIG.VIEW_H;
    // 夜幕：全场压暗
    if (game.nightT > 0) {
      const fade = Math.min(1, game.nightT / 0.6, (6 - game.nightT) / 0.4 + 0.2);
      ctx.fillStyle = `rgba(18,16,40,${(game.nightDim || 0.15) * Math.max(0, Math.min(1, fade))})`;
      ctx.fillRect(0, 0, W, H);
    }
    const boss = game.boss;
    if (boss && !boss.dead) {
      this.drawBar(ctx, game, boss, W);
      this.drawArrow(ctx, game, boss, W, H);
    } else {
      this._arrow = null;
    }
    this.drawBanner(ctx, game, W, H);
  },

  drawBar(ctx, game, boss, W) {
    const segs = boss.segs;
    const n = segs.length;
    const slotW = 104;
    const total = slotW * n;
    const x0 = (W - total) / 2;
    const y0 = 8;
    const seal = (CONFIG.GLYPH_COLORS && CONFIG.GLYPH_COLORS.seal) || '#b03a2e';
    ctx.save();
    ctx.fillStyle = 'rgba(242,236,223,0.78)';
    ctx.fillRect(x0 - 10, y0 - 4, total + 20, 54);
    ctx.strokeStyle = seal;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x0 - 10, y0 - 4, total + 20, 54);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const seg = segs[i];
      const cx = x0 + slotW * i + slotW / 2;
      ctx.font = `24px ${CONFIG.FONTS.BRUSH}`;
      ctx.fillStyle = seg.broken ? 'rgba(120,114,104,0.55)' : '#1d1b18';
      ctx.fillText(seg.char, cx, y0 + 13);
      const bw = slotW - 18;
      const by = y0 + 31;
      ctx.fillStyle = 'rgba(40,34,28,0.18)';
      ctx.fillRect(cx - bw / 2, by, bw, 5);
      if (!seg.broken) {
        ctx.fillStyle = i === boss.segIndex ? '#b4473a' : '#7a2e2a';
        ctx.fillRect(cx - bw / 2, by, bw * Math.max(0, seg.hp / seg.maxHp), 5);
      } else {
        // 碎掉的字：朱砂斜线划掉
        ctx.strokeStyle = seal;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 14, y0 + 24);
        ctx.lineTo(cx + 14, y0 + 2);
        ctx.stroke();
      }
    }
    // 震慑条：细细一条朱砂，满了踉跄
    const sw = total - 8;
    ctx.fillStyle = 'rgba(40,34,28,0.12)';
    ctx.fillRect(x0 + 4, y0 + 40, sw, 2);
    ctx.fillStyle = seal;
    const k = boss.staggerT > 0 ? 1 : Math.min(1, boss.stagger / CONFIG.CONTROL.staggerMax);
    ctx.fillRect(x0 + 4, y0 + 40, sw * k, 2);
    ctx.restore();
  },

  // 首领在视口之外：边缘一枚朱砂箭头，点击后镜头移过去
  drawArrow(ctx, game, boss, W, H) {
    const cam = game.camera;
    this._arrow = null;
    if (!cam) return;
    const sx = cam.worldToScreen(boss.x);
    const inset = cam.insetLeft || 0;
    const left = inset + 14;
    const right = W - 14;
    if (sx >= left && sx <= right) return;
    const dir = sx < left ? -1 : 1;
    const ax = dir < 0 ? left : right;
    const ay = H / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(176,58,46,0.9)';
    ctx.beginPath();
    ctx.moveTo(ax + dir * 12, ay);
    ctx.lineTo(ax - dir * 6, ay - 14);
    ctx.lineTo(ax - dir * 6, ay + 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2ecdf';
    ctx.font = `13px ${CONFIG.FONTS.BRUSH}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('首', ax - dir * 1, ay);
    ctx.restore();
    this._arrow = { x: ax - 22, y: ay - 22, w: 44, h: 44 };
    this.bind(game);
  },

  // 一次性绑定画布点击：点中箭头，镜头移到首领位置
  bind(game) {
    const canvas = game.canvas;
    if (!canvas || this._boundCanvas === canvas) return;
    this._boundCanvas = canvas;
    canvas.addEventListener('click', (ev) => {
      const a = this._arrow;
      const g = this._game;
      if (!a || !g || !g.boss || g.boss.dead || !g.camera) return;
      const rect = canvas.getBoundingClientRect();
      const x = (ev.clientX - rect.left) * (CONFIG.VIEW_W / rect.width);
      const y = (ev.clientY - rect.top) * (CONFIG.VIEW_H / rect.height);
      if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) this.focusBoss(g);
    });
    this._game = game;
  },

  focusBoss(game) {
    const cam = game.camera;
    if (!cam || !game.boss) return;
    cam.scrollBy(game.boss.x - cam.x - CONFIG.VIEW_W / 2);
  },

  drawBanner(ctx, game, W, H) {
    const b = game.bossBanner;
    if (!b) return;
    const k = b.life / b.max;
    const reduced = this.reduced();
    const a = reduced ? 1 : Math.min(1, k * 3, (1 - k) * 6 + 0.2);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `38px ${CONFIG.FONTS.BRUSH}`;
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(242,236,223,0.9)';
    const y = H * 0.3 + (reduced ? 0 : (1 - Math.min(1, (1 - k) * 4)) * -8);
    ctx.strokeText(b.text, W / 2, y);
    ctx.fillStyle = (CONFIG.GLYPH_COLORS && CONFIG.GLYPH_COLORS.seal) || '#b03a2e';
    ctx.fillText(b.text, W / 2, y);
    ctx.restore();
  },

  // 每帧调用（在 Game.draw 的 HUD 部分）：记录 game 供点击使用
  attach(game) { this._game = game; },
};

if (typeof window !== 'undefined') window.BossBar = BossBar;
