// 四字首领的能力（工单 10 §4）。召唤（summon）、硬甲（plating）与精英共用，在 elite.js、minor-b.js。
// 每个主动能力触发前 0.8 秒，首领身上相应的字发朱砂光并显示能力名（配置里的 windup、label，绘制见 Enemy.draw）。
(function registerBoss() {
  const px = (v) => v * CONFIG.GLYPH_SCALE;
  const seal = () => CONFIG.GLYPH_COLORS.seal || '#b03a2e';

  EnemyAbilities.register({
    // 鬼 · 鬼浮：周期性浮空，不吃地面效果（单体照常命中）
    levitate: {
      init(e, p, st) { st.t = 0; },
      update(e, p, dt, game, cdt, st) {
        if (st.t > 0) { st.t -= dt; e.airborne = true; return; }
        if (EnemyAbilities.timer(e, p, st, cdt)) st.t = p.duration;
      },
    },

    // 夜 · 夜幕：周期性降下夜幕，全场塔射程缩短、画面压暗（game.nightT 由 BossFlow.tick 递减）
    nightfall: {
      update(e, p, dt, game, cdt, st) {
        if (!EnemyAbilities.timer(e, p, st, cdt)) return;
        game.nightT = p.duration;
        game.nightRangeMul = p.rangeMul;
        game.nightDim = p.dim;
      },
    },

    // 行 · 夜行：被动。只剩最后一个字时移速 × speedMul
    hasten: {
      update(e, p) {
        if (e.segIndex === e.segs.length - 1) e.abSpeedMul *= p.speedMul;
      },
    },

    // 翻 · 掀浪：向前掀起一道浪，把前方的小怪与重敌沿路向核心推进（双字以上不推）
    surgeAllies: {
      update(e, p, dt, game, cdt, st) {
        if (!EnemyAbilities.timer(e, p, st, cdt)) return;
        const front = px(p.front);
        let n = 0;
        for (const o of game.enemies) {
          if (o.dead || o === e || o.track !== e.track || o.carried) continue;
          if (o.tier !== 'minor' && o.tier !== 'heavy') continue;
          const d = o.s - e.s;
          if (d <= 0 || d > front) continue;
          const limit = o.track.loop ? Infinity : o.track.total - px(4);
          o.s = Math.min(o.s + px(p.push), limit);
          o.syncPosition();
          n++;
        }
        if (typeof GlyphFX !== 'undefined') {
          GlyphFX.ring(e.x, e.y, 80, CONFIG.COLORS.enemies.fanjiangdaohai, 0.5, 6);
          if (n) GlyphFX.addShake(2);
        }
      },
    },

    // 江 · 江身：免疫湿身；受到水系伤害 × waterMul（湿身加成对它无效）
    riverBody: {
      update(e) { e.immuneWet = true; e.wet = 0; },
      onHit(e, p, amount, opts) { return opts.kind === 'water' ? amount * p.waterMul : amount; },
    },

    // 倒 · 倒流：周期清除自身全部减益，随后 immuneSlow 秒内免疫减速
    cleanse: {
      update(e, p, dt, game, cdt, st) {
        if (!EnemyAbilities.timer(e, p, st, cdt)) return;
        e.burnTime = 0;
        e.burnStacks = 0;
        e.slowTime = 0;
        e.chillStacks = 0;
        e.chillTime = 0;
        e.exposeTime = 0;
        e.wet = 0;
        e.slowImmuneT = p.immuneSlow;
        if (typeof GlyphFX !== 'undefined') GlyphFX.ring(e.x, e.y, 70, '#6f9bb8', 0.5, 4);
      },
    },

    // 海 · 海量：每秒回复海字最大血量的 ratio；受灼烧时回复速度减半
    regen: {
      update(e, p, dt, game, cdt, st) {
        const seg = e.segs[st.seg];
        if (!seg || seg.broken || seg.hp >= seg.maxHp) return;
        const rate = p.ratio * (e.burnTime > 0 ? p.burnMul : 1);
        seg.hp = Math.min(seg.maxHp, seg.hp + seg.maxHp * rate * dt);
        e.syncHp();
      },
    },

    // 墙 · 筑墙：首领身后 range 内的敌人，受到的弹道类伤害 × projectileMul
    rearGuard: {
      update(e, p) {
        const r = px(p.range);
        for (const o of EnemyAbilities.nearby(e, r + px(30), (x) => x.track === e.track && x.s < e.s && e.s - x.s <= r)) {
          o.rearT = 0.3;
          o.rearMul = p.projectileMul;
        }
      },
      draw(ctx, e, p) {
        ctx.strokeStyle = 'rgba(77,79,82,0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.arc(e.x, e.y, px(p.range), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      },
    },

    // 铁 · 铁骨：破甲持续时间减半；硬甲减免提高（见 plating）
    ironBones: {
      update(e, p) { e.exposeTimeMul = p.exposeTimeMul; },
    },

    // 壁 · 壁垒：周期生成一层护盾，先承受伤害；被破甲命中时损失一部分；不叠加，每次重置
    shield: {
      init(e, p, st) { st.hp = 0; },
      update(e, p, dt, game, cdt, st) {
        if (EnemyAbilities.timer(e, p, st, cdt)) {
          st.hp = p.amount;
          if (typeof GlyphFX !== 'undefined') GlyphFX.ring(e.x, e.y, 60, '#8a8e92', 0.4, 5);
        }
      },
      onHit(e, p, amount, opts, st) {
        if (!(st.hp > 0)) return amount;
        const take = Math.min(st.hp, amount);
        st.hp -= take;
        return amount - take;
      },
      onExpose(e, p, st) {
        if (st.hp > 0) st.hp *= 1 - p.exposeLoss;
      },
      draw(ctx, e, p, st) {
        if (!(st.hp > 0)) return;
        ctx.strokeStyle = `rgba(138,142,146,${0.3 + 0.5 * st.hp / p.amount})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * 0.55, 0, Math.PI * 2);
        ctx.stroke();
      },
    },

    // 万 · 万象：周期从召唤池里轮流召唤 1 只，整场有上限
    summonPool: {
      init(e, p, st) { st.n = 0; st.i = 0; },
      update(e, p, dt, game, cdt, st) {
        if (st.n >= p.max) return;
        if (!EnemyAbilities.timer(e, p, st, cdt)) return;
        const type = p.pool[st.i % p.pool.length];
        st.i++;
        st.n += EnemyAbilities.summon(e, type, 1).length;
      },
    },

    // 劫 · 天劫：周期对周围 1～2 座塔降下天劫，被选中的塔「封笔」一阵（不攻击、不蓄力、笔画不写回）。
    // 前摇时在被选中的塔上画雷纹预警；同塔 repeatLock 秒内不重复，全场同时被封的塔有上限，优先蓄力最高的塔
    sealTowers: {
      init(e, p, st) { st.targets = []; },
      update(e, p, dt, game, cdt, st) {
        const w = p.windup;
        if (st.cd == null) st.cd = p.every * (0.5 + 0.5 * Math.random());
        if (!EnemyAbilities.canAct(e)) { st.cd = Math.max(0, st.cd); return; }
        st.cd -= cdt;
        if (st.cd <= w && st.cd > 0 && !st.targets.length) this.choose(e, p, game, st);
        if (st.cd > w) { st.targets = []; return; }
        if (st.cd > 0) {
          const k = 1 - st.cd / w;
          if (k > e.windup) { e.windup = k; e.windupLabel = p.label; }
          return;
        }
        st.cd = p.every;
        for (const t of st.targets) {
          if (game.towers.indexOf(t) < 0) continue;
          t.sealT = p.duration;
          t.sealLockT = p.repeatLock;
          if (typeof GlyphFX !== 'undefined') { GlyphFX.ring(t.x, t.y, 40, seal(), 0.4, 4); GlyphFX.addShake(2); }
          if (window.InkAudio) window.InkAudio.play('seal');
        }
        st.targets = [];
      },
      choose(e, p, game, st) {
        const r = px(p.radius);
        const sealed = game.towers.filter((t) => t.sealT > 0).length;
        const room = p.maxSealed - sealed;
        if (room <= 0) return;
        const cands = game.towers.filter((t) => t.gl && !(t.sealT > 0) && !(t.sealLockT > 0) && Math.hypot(t.x - e.x, t.y - e.y) <= r);
        cands.sort((a, b) => b.gl.charge - a.gl.charge);
        const n = Math.min(room, p.count[0] + Math.floor(Math.random() * (p.count[1] - p.count[0] + 1)));
        st.targets = cands.slice(0, n);
      },
      draw(ctx, e, p, st) {
        if (!st.targets.length) return;
        ctx.strokeStyle = seal();
        ctx.lineWidth = 1.5;
        for (const t of st.targets) {
          ctx.beginPath();
          ctx.moveTo(t.x - 8, t.y - 40);
          ctx.lineTo(t.x + 3, t.y - 20);
          ctx.lineTo(t.x - 4, t.y - 14);
          ctx.lineTo(t.x + 6, t.y + 2);
          ctx.stroke();
        }
      },
    },

    // 不 · 不动：免疫一切减速，震慑累积速度 × staggerMul
    unshakable: {
      update(e, p) { e.slowCapOverride = 0; e.staggerMul = p.staggerMul; },
    },

    // 复 · 复生：复字第一次血量归零时蓄生 delay 秒（无敌、停止移动），再以复字 hpRatio 血量复活，移速 × speedMul。只一次
    rebirth: {
      init(e, p, st) { st.used = false; st.t = 0; },
      onLethal(e, p, opts, st) {
        if (st.used) return false;
        st.used = true;
        st.t = p.delay;
        e.lethalHold = true;
        return true;
      },
      update(e, p, dt, game, cdt, st) {
        if (!e.lethalHold || !(st.t > 0)) return;
        e.windup = 1;
        e.windupLabel = '蓄生';
        st.t -= dt;
        if (st.t > 0) return;
        e.lethalHold = false;
        e.reviveSeg(st.seg, e.segs[st.seg].maxHp * p.hpRatio);
        e.baseSpeed *= p.speedMul;
        e.speed = e.baseSpeed;
        if (typeof GlyphFX !== 'undefined') GlyphFX.ring(e.x, e.y, 90, seal(), 0.6, 7);
      },
    },
  });
})();
