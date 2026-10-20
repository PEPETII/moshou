// 单字敌人能力（二）：铠、骑、巫、魇、瘴、饕（工单 08 §4.7～4.12）；硬甲同时被铜墙铁壁的「铜」字使用
(function registerMinorB() {
  const px = (v) => v * CONFIG.GLYPH_SCALE;

  EnemyAbilities.register({
    // 铠 / 铜 · 硬甲：每次受击先减去定额（至少剩 1 点），持续伤害每跳只减 dotFlat；破甲时失效。
    // 铁骨（首领）在场时，定额取两者较大值，不相加。
    plating: {
      onHit(e, p, amount, opts) {
        if (e.exposeTime > 0) return amount;
        let flat = opts.dot ? p.dotFlat : p.flat;
        const iron = EnemyAbilities.get(e, 'ironBones');
        if (iron) flat = Math.max(flat, opts.dot ? iron.p.flat / 2 : iron.p.flat);
        return Math.min(amount, Math.max(1, amount - flat));
      },
    },

    // 骑 · 冲锋：周期性提速；被击退、眩晕、冻结或减速比例达到 breakSlow 会打断，并重新计冷却
    charge: {
      init(e, p, st) { st.t = 0; },
      onControlled(e, p, kind, st) {
        if (st.t > 0) { st.t = 0; st.cd = p.every; }
      },
      update(e, p, dt, game, cdt, st) {
        if (st.t > 0) {
          if (!EnemyAbilities.canAct(e) || 1 - e.glyphSpeedMul() >= p.breakSlow) { st.t = 0; st.cd = p.every; return; }
          st.t -= dt;
          e.abSpeedMul *= p.speedMul;
          if (typeof GlyphFX !== 'undefined' && Math.random() < dt * 30) GlyphFX.stain(e.x - px(8), e.y + px(6), 5, '#3a2a22', 0.2);
          return;
        }
        if (EnemyAbilities.timer(e, p, st, cdt)) st.t = p.duration;
      },
    },

    // 巫 · 治疗：周期治疗周围其它敌人（不含自己与首领），同一目标 every 秒内只治一次，多只巫不叠加
    heal: {
      update(e, p, dt, game, cdt, st) {
        if (!EnemyAbilities.timer(e, p, st, cdt)) return;
        let n = 0;
        for (const o of EnemyAbilities.nearby(e, px(p.radius), (x) => !x.isBoss && !(x.healLockT > 0))) {
          if (!(o.hp < o.maxHp)) continue;
          o.healLockT = p.every;
          if (o.healRatio(p.ratio) > 0) {
            n++;
            if (typeof GlyphFX !== 'undefined') GlyphFX.emit(3, o.x, o.y, { color: '#6fa07a', speed: [20, 70], life: [0.4, 0.8], size: [1.5, 2.5], angle: -Math.PI / 2, spread: 0.8 });
          }
        }
        if (n && typeof GlyphFX !== 'undefined') GlyphFX.ring(e.x, e.y, p.radius * 0.6, '#6fa07a', 0.4, 2);
      },
    },

    // 魇 · 梦魇：常驻光环，范围内的塔蓄力速度减半（多只不叠加）；每 0.2 秒刷新一次
    dread: {
      update(e, p, dt, game, cdt, st) {
        st.acc = (st.acc || 0) - dt;
        if (st.acc > 0) return;
        st.acc = 0.2;
        const r = px(p.radius);
        for (const t of game.towers) {
          if (!t.gl) continue;
          if (Math.hypot(t.x - e.x, t.y - e.y) <= r) { t.dreadT = 0.35; t.dreadMul = p.chargeMul; }
        }
      },
      draw(ctx, e, p) {
        ctx.strokeStyle = 'rgba(75,52,102,0.18)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 6]);
        ctx.beginPath();
        ctx.arc(e.x, e.y, px(p.radius), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      },
    },

    // 瘴 · 瘴雾：周身雾里其它敌人受伤打折；风刃命中吹散 clearTime 秒，旋风覆盖则全程消散
    miasma: {
      init(e, p, st) { st.clearT = 0; st.vortexT = 0; },
      onHit(e, p, amount, opts, st) {
        if (opts.kind === 'wind' && opts.delivery === 'instant') st.clearT = p.clearTime;
        return amount;
      },
      update(e, p, dt, game, cdt, st) {
        if (st.clearT > 0) st.clearT -= dt;
        if (st.vortexT > 0) st.vortexT -= dt;
        if (st.clearT > 0 || st.vortexT > 0) return;
        for (const o of EnemyAbilities.nearby(e, px(p.radius))) {
          o.mistT = 0.3;
          o.mistMul = p.reduction;
        }
      },
      draw(ctx, e, p, st) {
        if (st.clearT > 0 || st.vortexT > 0) return;
        GlyphKit.drawPool(ctx, e.x, e.y, px(p.radius), '138,122,58', 0.16);
      },
    },

    // 饕 · 吞噬：吞掉身前的尸、鬼，增长最大血量与体型，击杀奖励 +rewardPer；最大血量有上限
    devour: {
      init(e, p, st) { st.base = e.segs[0].maxHp; st.size0 = e.glyphSize; st.eaten = 0; },
      update(e, p, dt, game, cdt, st) {
        if (!EnemyAbilities.timer(e, p, st, cdt)) return;
        const seg = e.segs[0];
        if (seg.maxHp >= st.base * p.maxMul) return;
        let prey = null;
        let bestD = Infinity;
        for (const o of EnemyAbilities.nearby(e, px(p.radius), (x) => (x.type === 'corpse' || x.type === 'ghost') && x.track === e.track && x.s >= e.s - px(6))) {
          const d = Math.hypot(o.x - e.x, o.y - e.y);
          if (d < bestD) { bestD = d; prey = o; }
        }
        if (!prey) return;
        // 被吞的敌人直接消失：不给奖励、不计击杀
        prey.dead = true;
        prey.devoured = true;
        const gain = Math.min(prey.maxHp * p.gainRatio, st.base * p.maxMul - seg.maxHp);
        seg.maxHp += gain;
        seg.hp += gain;
        e.syncHp();
        e.syncMaxHp();
        e.reward += p.rewardPer;
        st.eaten++;
        e.glyphSize = Math.min(st.size0 * 1.5, e.glyphSize * (1 + p.grow));
        e.size = e.glyphSize;
        if (typeof GlyphFX !== 'undefined') GlyphFX.emit(8, prey.x, prey.y, { color: '#5e3a22', speed: [30, 120], life: [0.2, 0.5], size: [1.5, 3], angle: Math.atan2(e.y - prey.y, e.x - prey.x), spread: 0.5 });
      },
    },
  });
})();
