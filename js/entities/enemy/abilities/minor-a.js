// 单字敌人能力（一）：骨、狐、蛛、鲛、蛙、龟（工单 08 §4.1～4.6）
// 距离、半径是原型 px（配置里写的值），这里统一乘 GLYPH_SCALE。
(function registerMinorA() {
  const px = (v) => v * CONFIG.GLYPH_SCALE;

  EnemyAbilities.register({
    // 骨 · 复聚：被火、雷系击杀会碎；被别的塔打死则碎骨 delay 秒后以 hpRatio 血量复活，只一次。
    // 第一次「假死」不触发任何击杀类效果（不计连斩、不给奖励）。
    reassemble: {
      init(e, p, st) { st.used = false; st.t = 0; },
      onLethal(e, p, opts, st) {
        if (st.used) return false;
        if (p.breakKinds.indexOf(opts.kind) >= 0) {
          if (typeof GlyphFX !== 'undefined') GlyphFX.text(e.x, e.y - px(16), '碎', { color: CONFIG.GLYPH_COLORS.ink, size: 22, life: 0.7 });
          return false;
        }
        st.used = true;
        st.t = p.delay;
        e.lethalHold = true;
        e.rubble = true;
        return true;
      },
      update(e, p, dt, game, cdt, st) {
        if (!e.rubble) return;
        e.untargetable = true;
        st.t -= dt;
        if (st.t > 0) return;
        e.rubble = false;
        e.lethalHold = false;
        e.reviveSeg(0, e.segs[0].maxHp * p.hpRatio);
      },
    },

    // 狐 · 幻步：周期性沿路瞬移，瞬移后短暂无敌，原地留下残影
    blink: {
      init(e, p, st) { st.after = []; },
      update(e, p, dt, game, cdt, st) {
        for (const a of st.after) a.t += dt;
        if (st.after.length) st.after = st.after.filter((a) => a.t < p.ghost);
        if (!EnemyAbilities.timer(e, p, st, cdt)) return;
        st.after.push({ x: e.x, y: e.y, t: 0 });
        const limit = e.track.loop ? Infinity : e.track.total - px(20);
        e.s = Math.min(e.s + px(p.distance), limit);
        e.invulnT = Math.max(e.invulnT, p.immune);
        e.syncPosition();
      },
      draw(ctx, e, p, st) {
        for (const a of st.after) {
          ctx.globalAlpha = 0.3 * (1 - a.t / p.ghost);
          ctx.fillStyle = CONFIG.COLORS.enemies.fox;
          ctx.font = `${e.glyphSize}px ${CONFIG.FONTS.BRUSH}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(e.char, a.x, a.y);
        }
        ctx.globalAlpha = 1;
      },
    },

    // 蛛 · 缚丝：向射程内最近的塔吐丝，被缚的塔写回变慢；同塔、同时被缚的数量都有上限
    web: {
      init(e, p, st) { st.pending = null; },
      update(e, p, dt, game, cdt, st) {
        if (st.pending) {
          st.pending.t += dt;
          if (st.pending.t >= p.windup) {
            const t = st.pending.tower;
            st.pending = null;
            if (game.towers.indexOf(t) >= 0 && !(t.webT > 0)) {
              t.webT = p.duration;
              t.webMul = p.rewriteMul;
              t.webLockT = p.towerCooldown;
            }
          }
          return;
        }
        if (!EnemyAbilities.timer(e, p, st, cdt)) return;
        const webbed = game.towers.filter((t) => t.webT > 0).length;
        if (webbed >= p.maxWebbed) return;
        let best = null;
        let bestD = px(p.range);
        for (const t of game.towers) {
          if (!t.gl || t.webT > 0 || t.webLockT > 0) continue;
          const d = Math.hypot(t.x - e.x, t.y - e.y);
          if (d < bestD) { bestD = d; best = t; }
        }
        if (best) st.pending = { tower: best, t: 0 };
      },
      draw(ctx, e, p, st) {
        if (!st.pending) return;
        const t = st.pending.tower;
        ctx.strokeStyle = `rgba(190,188,180,${0.4 + 0.5 * st.pending.t / p.windup})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + (t.x - e.x) * Math.min(1, st.pending.t / p.windup), e.y + (t.y - e.y) * Math.min(1, st.pending.t / p.windup));
        ctx.stroke();
      },
    },

    // 鲛 · 潜行：周期性潜入墨中，不能被单体锁定（范围效果照常命中）；始终湿身
    dive: {
      init(e, p, st) { st.t = 0; },
      update(e, p, dt, game, cdt, st) {
        e.makeWet(0.3);
        if (st.t > 0) {
          st.t -= dt;
          e.untargetable = true;
          return;
        }
        if (EnemyAbilities.timer(e, p, st, cdt)) st.t = p.duration;
      },
      draw(ctx, e, p, st) {
        if (!(st.t > 0)) return;
        ctx.strokeStyle = 'rgba(60,110,145,0.5)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.ellipse(e.x, e.y + e.glyphSize * 0.3, e.glyphSize * (0.4 + 0.2 * i), e.glyphSize * (0.12 + 0.05 * i), 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      },
    },

    // 蛙 · 跳跃：爬行一阵，跳一下（空中不吃地面效果、不被潮卷入），落地停顿
    hop: {
      init(e, p, st) { st.phase = 'crawl'; st.t = Math.max(0.1, p.every - p.hopTime - p.pause) * Math.random(); },
      onControlled(e, p, kind, st) {
        if (kind === 'knock') return;
        st.phase = 'crawl';
        st.t = Math.max(0.1, p.every - p.hopTime - p.pause);
      },
      update(e, p, dt, game, cdt, st) {
        // 眩晕、冻结时落回地面
        if (!EnemyAbilities.canAct(e)) { st.phase = 'crawl'; return; }
        st.t -= dt;
        if (st.phase === 'crawl') {
          if (st.t <= 0) { st.phase = 'hop'; st.t = p.hopTime; }
        } else if (st.phase === 'hop') {
          e.airborne = true;
          e.abSpeedMul = (px(p.distance) / p.hopTime) / Math.max(1, e.baseSpeed * CONFIG.CELL_SIZE);
          if (st.t <= 0) { st.phase = 'pause'; st.t = p.pause; }
        } else {
          e.abSpeedMul = 0;
          if (st.t <= 0) { st.phase = 'crawl'; st.t = Math.max(0.1, p.every - p.hopTime - p.pause); }
        }
      },
    },

    // 龟 · 缩壳：血量首次跌破一半时缩壳，停止移动，期间受到的非灼烧伤害按 reduction 折算；破甲时缩短一半
    shell: {
      init(e, p, st) { st.used = false; st.t = 0; },
      update(e, p, dt, game, cdt, st) {
        if (st.t > 0) {
          st.t -= dt;
          e.abSpeedMul = 0;
          return;
        }
        if (!st.used && e.hpRatio() < p.hpRatio) {
          st.used = true;
          st.t = e.exposeTime > 0 ? p.duration / 2 : p.duration;
          if (typeof GlyphFX !== 'undefined') GlyphFX.text(e.x, e.y - px(18), '缩', { color: CONFIG.GLYPH_COLORS.inkSoft, size: 20, life: 0.8 });
        }
      },
      onHit(e, p, amount, opts, st) {
        if (st.t > 0 && !opts.burn) return amount * p.reduction;
        return amount;
      },
      draw(ctx, e, p, st) {
        if (!(st.t > 0)) return;
        ctx.strokeStyle = 'rgba(79,106,63,0.7)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.glyphSize * 0.62, Math.PI, 0);
        ctx.stroke();
      },
    },
  });
})();
