// 双字、三字精英的能力（工单 09 §3）：夜叉、傀儡、白骨精、镇墓兽
(function registerElite() {
  const px = (v) => v * CONFIG.GLYPH_SCALE;

  EnemyAbilities.register({
    // 夜 · 夜行：隐身，只有进入任意一座塔 revealRadius 范围内，或被范围伤害命中（显形 1.5 秒）才能被锁定。夜字碎后永久显形
    stealth: {
      update(e, p, dt, game) {
        const r = px(p.revealRadius);
        for (const t of game.towers) {
          if (t.gl && Math.hypot(t.x - e.x, t.y - e.y) <= r) return;
        }
        e.untargetable = true;
      },
    },

    // 叉 · 叉击：周期性向前冲刺（冲刺途中不能被卷入）
    dash: {
      init(e, p, st) { st.t = 0; },
      update(e, p, dt, game, cdt, st) {
        if (st.t > 0) {
          if (!EnemyAbilities.canAct(e)) { st.t = 0; e.dashing = false; return; }
          const step = Math.min(st.t, dt);
          st.t -= step;
          e.dashing = true;
          const limit = e.track.loop ? Infinity : e.track.total - px(20);
          e.s = Math.min(e.s + px(p.distance) * step / p.time, limit);
          e.syncPosition();
          if (st.t <= 0) e.dashing = false;
          return;
        }
        e.dashing = false;
        if (EnemyAbilities.timer(e, p, st, cdt)) st.t = p.time;
      },
    },

    // 傀 · 牵线：傀字还在时，儡身免疫一切硬控与击退，周围小怪移速 × allySpeedMul（不叠加）。傀字碎后儡永久变慢
    puppeteer: {
      update(e, p, dt, game) {
        e.ccImmune = true;
        e.knockImmune = true;
        for (const o of EnemyAbilities.nearby(e, px(p.radius), (x) => x.tier === 'minor')) {
          o.allyBuffT = 0.3;
          o.allyBuffMul = p.allySpeedMul;
        }
      },
      onSegmentBreak(e, p) {
        e.baseSpeed *= p.brokenSpeedMul;
        e.speed = e.baseSpeed;
      },
      draw(ctx, e, p) {
        ctx.strokeStyle = 'rgba(106,74,42,0.22)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 5]);
        ctx.beginPath();
        ctx.arc(e.x, e.y, px(p.radius), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      },
    },

    // 白 · 化形：白字还在时外观是一只尸，没有精英血条，弓的「最高血量」按尸的血量排序（见 Enemy.sortHp）
    disguise: {
      onSegmentBreak(e) {
        if (typeof GlyphFX !== 'undefined') GlyphFX.ring(e.x, e.y, 60, CONFIG.GLYPH_COLORS.ink, 0.4, 4);
      },
    },

    // 骨 · 复聚：骨字被打碎后，若最后一个字还在，delay 秒后以 hpRatio 血量复原一次；被火、雷打碎的不复原
    segmentRegrow: {
      always: true,
      init(e, p, st) { st.used = false; st.t = 0; st.idx = -1; },
      onSegmentBreak(e, p, index, st, opts) {
        if (st.used) return;
        if (p.breakKinds.indexOf(opts.kind) >= 0) return;
        st.idx = index;
        st.t = p.delay;
      },
      update(e, p, dt, game, cdt, st) {
        if (st.idx < 0) return;
        const last = e.segs.length - 1;
        // 精字（最后一个字）碎了就无法复原
        if (!e.segAlive(last) || e.segAlive(st.idx)) { st.idx = -1; return; }
        st.t -= dt;
        if (st.t > 0) return;
        e.reviveSeg(st.idx, e.segs[st.idx].maxHp * p.hpRatio);
        st.used = true;
        st.idx = -1;
        if (typeof GlyphFX !== 'undefined') GlyphFX.text(e.x, e.y - px(20), '复', { color: CONFIG.GLYPH_COLORS.inkSoft, size: 22, life: 0.8 });
      },
    },

    // 精 / 百 · 唤骨、百鬼：周期召唤，整场有总数上限。召唤物奖励固定 1 墨（见 Game.spawnGlyphEnemy）
    summon: {
      init(e, p, st) { st.n = 0; },
      update(e, p, dt, game, cdt, st) {
        if (st.n >= p.max) return;
        if (!EnemyAbilities.timer(e, p, st, cdt)) return;
        const got = EnemyAbilities.summon(e, p.type, Math.min(p.count, p.max - st.n));
        st.n += got.length;
      },
    },

    // 镇 · 镇压：常驻光环，范围内小怪受到的硬控时长 × ccMul（在硬控递减之前乘）
    ward: {
      update(e, p) {
        for (const o of EnemyAbilities.nearby(e, px(p.radius), (x) => x.tier === 'minor')) {
          o.wardT = 0.3;
          o.wardMul = p.ccMul;
        }
      },
      draw(ctx, e, p) {
        ctx.strokeStyle = 'rgba(58,70,54,0.2)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 6]);
        ctx.beginPath();
        ctx.arc(e.x, e.y, px(p.radius), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      },
    },

    // 墓 · 开墓：墓字被打碎的瞬间召唤一批尸与巨（都算召唤物）
    onBreakSummon: {
      onSegmentBreak(e, p) {
        for (const it of p.list) EnemyAbilities.summon(e, it.type, it.n);
        if (typeof GlyphFX !== 'undefined') GlyphFX.ring(e.x, e.y, 90, CONFIG.GLYPH_COLORS.ink, 0.5, 6);
      },
    },

    // 兽 · 狂暴：只剩最后一个字时移速 × speedMul，并且不被击退
    enrage: {
      update(e, p) {
        if (e.segIndex !== e.segs.length - 1) return;
        e.abSpeedMul *= p.speedMul;
        e.knockImmune = true;
      },
    },
  });
})();
