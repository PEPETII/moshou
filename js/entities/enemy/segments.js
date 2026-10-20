// Enemy：能力、体量与多字分段（工单 07）
//
// 带 abilities 或 segments 的敌人（adv = true）走这里的伤害管线与绘制；尸、鬼、巨仍走旧的单段路径，
// 行为、数值与改动前完全一致。多字敌人每个字单独计血：伤害先打最前面还没碎的字，
// 溢出全额顺延；某个字碎了，挂在这个字上的能力失效；全部碎完才算死亡。

// 体量分档默认值（配置里写了 mass 的优先）
const TIER_MASS = { minor: 1, heavy: 3, elite: 4, greater: 6, boss: Infinity };

// 构造 / 重置时调用：解析 tier、segments、abilities，计算派生字段
Enemy.prototype.initAdvanced = function(config) {
    const segCfg = Array.isArray(config.segments) ? config.segments : null;
    this.tier = config.tier || ((config.weight || 1) > 1 ? 'heavy' : 'minor');
    this.glyphCount = segCfg ? segCfg.length : 1;
    this.mass = config.mass != null ? config.mass : TIER_MASS[this.tier];
    this.isBoss = this.tier === 'boss';
    this.adv = !!(segCfg || config.abilities);
    this.displayName = config.name || config.char;
    this.wetNoSlow = !!config.wetNoSlow;

    // 能力与状态字段（对象池复用时必须全部复位）
    this.abil = [];
    this.ab = {};
    this.abilityTimeScale = 1;
    this.suppressedT = 0;
    this.abSpeedMul = 1;
    this.untargetable = false;
    this.revealT = 0;
    this.invulnT = 0;
    this.lethalHold = false;
    this.windup = 0;
    this.windupLabel = null;
    this.allyBuffT = 0;
    this.wardT = 0;
    this.mistT = 0;
    this.mistClearT = 0;
    this.airborne = false;
    this.summoned = false;
    this.summoner = null;
    this.pulledBy = null;
    this.carryImmuneT = 0;
    this.pullImmuneT = 0;
    this.ccWindowT = 0;
    this.ccCount = 0;
    this.ccImmuneT = 0;
    this.stagger = 0;
    this.staggerT = 0;
    this.staggerLockT = 0;
    this.hpBarT = 0;
    this.hitFlag = null;
    this.webT = 0;
    this.fxShards = [];
    this.pathNo = 0;
    this.healLockT = 0;
    this.rearT = 0;
    this.rearMul = 1;
    this.mistMul = 1;
    this.wardMul = 1;
    this.allyBuffMul = 1;
    this.exposeTimeMul = 1;
    this.slowCapOverride = null;
    this.slowImmuneT = 0;
    this.staggerMul = 1;
    this.ccImmune = false;
    this.knockImmune = false;
    this.immuneWet = false;
    this.knockMulExtra = null;
    this.rubble = false;
    this.dashing = false;
    this.devoured = false;

    this.segs = null;
    this.segIndex = 0;
    this.glyphSize = this.size;
    if (!this.adv) return;

    if (segCfg) {
      this.segs = segCfg.map((s) => ({ char: s.char, hp: s.hp, maxHp: s.hp, broken: false, slot: 0 }));
    } else {
      this.segs = [{ char: config.char, hp: config.hp, maxHp: config.hp, broken: false, slot: 0 }];
    }
    this.segs.forEach((s, i) => { s.slot = i; });
    this.syncHp();
    this.maxHp = this.hp;
    this.char = this.segs[this.segs.length - 1].char;
    if (this.glyphCount > 1) {
      // 包围盒长度：范围技能按它判定，不会因为敌人变长而打不中
      this.size = Math.round(this.glyphSize * (1 + 0.9 * (this.glyphCount - 1)));
    }
    EnemyAbilities.init(this, config);
};

// 总血量 = 各段当前血量之和
Enemy.prototype.syncHp = function() {
    let hp = 0;
    for (const s of this.segs) hp += s.hp;
    this.hp = hp;
};

// 总最大血量 = 各段最大血量之和
Enemy.prototype.syncMaxHp = function() {
    let m = 0;
    for (const s of this.segs) m += s.maxHp;
    this.maxHp = m;
};

// 关卡血量倍率：乘在每一段上
Enemy.prototype.scaleHp = function(mul) {
    if (!(mul > 0) || mul === 1) return;
    if (this.segs) {
        for (const s of this.segs) { s.maxHp = Math.round(s.maxHp * mul); s.hp = s.maxHp; }
        this.syncHp();
        this.syncMaxHp();
    } else {
        this.maxHp = Math.round(this.maxHp * mul);
        this.hp = this.maxHp;
    }
};

// 当前正在受伤的段
Enemy.prototype.curSeg = function() {
    return this.segs ? this.segs[Math.min(this.segIndex, this.segs.length - 1)] : null;
};

// 当前段回血（巫、海量）：不超过该段上限
Enemy.prototype.healCur = function(amount) {
    const seg = this.curSeg();
    if (!seg || seg.broken || amount <= 0) return 0;
    const add = Math.min(amount, seg.maxHp - seg.hp);
    seg.hp += add;
    this.syncHp();
    return add;
};

// 当前段的血量比例（缩壳等用整只敌人的比例）
Enemy.prototype.hpRatio = function() {
    return this.maxHp > 0 ? this.hp / this.maxHp : 0;
};

// 某个字还在？
Enemy.prototype.segAlive = function(i) {
    return !!(this.segs && this.segs[i] && !this.segs[i].broken);
};

// 复原一个被打碎的字（骨字复原、复生）：把 segIndex 退回到最前面的活字
Enemy.prototype.reviveSeg = function(i, hp) {
    const seg = this.segs[i];
    seg.broken = false;
    seg.hp = Math.max(1, Math.min(seg.maxHp, hp));
    seg.slot = this.segs.length - 1;
    this.segIndex = Math.min(this.segIndex, i);
    this.syncHp();
    this.hpBarT = CONFIG.ENEMY_FX.hpBarSeconds;
};

// 多字敌人的伤害管线：能力修正 → 外部增伤 → 扣在当前段，溢出顺延到下一段
Enemy.prototype.applyDamage = function(amount, opts) {
    let dmg = EnemyAbilities.onHit(this, amount, opts);
    if (!(dmg > 0)) return;
    dmg *= this.damageMul(opts);
    this.hpBarT = CONFIG.ENEMY_FX.hpBarSeconds;
    while (dmg > 0 && !this.dead && !this.lethalHold) {
        const idx = this.segIndex;
        const seg = this.segs[idx];
        if (!seg || seg.broken) break;
        const take = Math.min(seg.hp, dmg);
        seg.hp -= take;
        dmg -= take;
        if (seg.hp > 1e-6) break;
        seg.hp = 0;
        this.breakSegment(idx, opts);
        if (this.lethalHold) break;
    }
    this.syncHp();
};

// 打碎一个字：特效、飘字、能力通知；全部碎完则走致命伤判定
Enemy.prototype.breakSegment = function(i, opts) {
    const seg = this.segs[i];
    seg.broken = true;
    this.syncHp();
    const multi = this.glyphCount > 1;
    if (multi) this.segFx(i);
    const last = !this.segs.some((s) => !s.broken);
    EnemyAbilities.onSegmentBreak(this, i, opts || {});
    if (last) {
        if (!EnemyAbilities.onLethal(this, opts || {})) {
            this.dying = true;
            this.die();
        }
        return;
    }
    // 还有活字：segIndex 前进到下一个活字
    let next = i + 1;
    while (next < this.segs.length && this.segs[next].broken) next++;
    if (next < this.segs.length) this.segIndex = next;
};

// 碎字表现：碎墨、飘字；首领另有顿帧与较大的震屏
Enemy.prototype.segFx = function(i) {
    const seg = this.segs[i];
    const pos = this.segPos(i);
    this.fxShards.push({ x: pos.x, y: pos.y, t: 0, char: seg.char });
    if (typeof GlyphFX === 'undefined') return;
    const c = CONFIG.GLYPH_COLORS;
    const fx = CONFIG.ENEMY_FX;
    GlyphFX.emit(this.isBoss ? 22 : 10, pos.x, pos.y, { color: c.ink, speed: [60, 220], life: [0.3, 0.6], size: [1.5, 3.5], grav: 300 });
    if (this.isBoss) {
        GlyphFX.text(pos.x, pos.y - 20 * CONFIG.GLYPH_SCALE, `${seg.char}破`, { color: c.seal || '#b03a2e', size: 34, life: 1.2 });
        GlyphFX.addHitstop(CONFIG.BOSS.breakFx.hitstop);
        GlyphFX.addShake(CONFIG.BOSS.breakFx.shake);
        if (window.InkAudio) window.InkAudio.play('segment_break');
    } else {
        GlyphFX.text(pos.x, pos.y - 14 * CONFIG.GLYPH_SCALE, `${seg.char}碎`, { color: c.inkSoft, size: 20, life: 0.8 });
        GlyphFX.addShake(fx.segmentBreakShake);
    }
};

// 第 i 个字的世界坐标：沿路径从前往后排列，间距 0.9 倍字号
Enemy.prototype.segGap = function() { return this.glyphSize * 0.9; };

Enemy.prototype.segPos = function(i) {
    const track = this.track;
    const seg = this.segs && this.segs[i];
    const slot = seg ? seg.slot : 0;
    if (!track || !this.segs || this.segs.length === 1) return { x: this.x, y: this.y };
    const p = track.pointAt(Math.max(0, this.s - slot * this.segGap()));
    const nx = -Math.sin(p.ang);
    const ny = Math.cos(p.ang);
    return { x: p.x + nx * this.lane, y: p.y + ny * this.lane };
};

// 每帧（所有敌人）：别的敌人施加的光环类状态与锁定计时。尸、鬼、巨没有能力，也会被傀儡加速、被瘴雾保护
Enemy.prototype.tickTimers = function(dt) {
    if (this.revealT > 0) this.revealT -= dt;
    if (this.invulnT > 0) this.invulnT -= dt;
    if (this.suppressedT > 0) this.suppressedT -= dt;
    else this.abilityTimeScale = 1;
    if (this.allyBuffT > 0) this.allyBuffT -= dt;
    if (this.wardT > 0) this.wardT -= dt;
    if (this.mistT > 0) this.mistT -= dt;
    if (this.rearT > 0) this.rearT -= dt;
    if (this.healLockT > 0) this.healLockT -= dt;
};

// 光环类减伤（瘴雾、筑墙）：相乘后不低于 allyReductionFloor
Enemy.prototype.allyReduction = function(opts) {
    let m = 1;
    if (this.mistT > 0) m *= this.mistMul;
    if (this.rearT > 0 && opts && opts.delivery === 'projectile') m *= this.rearMul;
    return m < 1 ? Math.max(CONFIG.CONTROL.allyReductionFloor, m) : 1;
};

// 按最大血量比例回血（巫）：多字敌人只治疗当前段
Enemy.prototype.healRatio = function(ratio) {
    if (this.segs) {
        const seg = this.curSeg();
        return seg ? this.healCur(seg.maxHp * ratio) : 0;
    }
    const add = Math.min(this.maxHp * ratio, this.maxHp - this.hp);
    this.hp += add;
    return add;
};

// 每帧：剩下的字往前合拢，碎墨淡出，分段血条计时
Enemy.prototype.tickSegments = function(dt) {
    if (this.hpBarT > 0) this.hpBarT -= dt;
    if (this.fxShards.length) {
        for (const f of this.fxShards) f.t += dt;
        this.fxShards = this.fxShards.filter((f) => f.t < 0.6);
    }
    if (!this.segs || this.segs.length < 2) return;
    const rate = dt / CONFIG.ENEMY_FX.mergeSeconds;
    let target = 0;
    for (const s of this.segs) {
        if (s.broken) continue;
        if (s.slot > target) s.slot = Math.max(target, s.slot - rate);
        else if (s.slot < target) s.slot = Math.min(target, s.slot + rate);
        target++;
    }
};

// 多字敌人的中心偏移（px）：敌人坐标取各字中点，让范围查询覆盖整只敌人
Enemy.prototype.centerOffset = function() {
    if (!this.segs || this.segs.length < 2) return 0;
    let sum = 0;
    let n = 0;
    for (const s of this.segs) {
        if (s.broken) continue;
        sum += s.slot;
        n++;
    }
    return n ? (sum / n) * this.segGap() : 0;
};

// 弓的「最高血量」排序用：白骨精化形时按尸的血量算
Enemy.prototype.visibleHp = function() {
    const d = this.abil && this.abil.length ? EnemyAbilities.get(this, 'disguise') : null;
    return d ? d.p.asHp : this.hp;
};

// 能不能被单体攻击锁定：隐身（untargetable）且未显形时不能
Enemy.prototype.isTargetable = function() {
    return !this.untargetable || this.revealT > 0;
};

// ---------- 绘制 ----------

// 多字敌人逐字绘制；返回 true 表示已绘制（Enemy.draw 不再画单字）
Enemy.prototype.drawSegments = function(ctx, inkRenderer, color, ex, ey) {
    const size = this.glyphSize;
    const disguised = EnemyAbilities.get(this, 'disguise');
    const jitter = this.windup > 0 ? (Math.random() - 0.5) * 3 * this.windup : 0;
    // 碎墨：碎掉的字原位淡出
    for (const f of this.fxShards) {
        const a = 0.4 * (1 - f.t / 0.6);
        ctx.fillStyle = `rgba(28,26,23,${a})`;
        ctx.beginPath();
        ctx.ellipse(f.x, f.y, size * 0.4, size * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    if (disguised) {
        inkRenderer.drawInkText(disguised.p.asChar, ex + jitter, ey, size, color, true);
        return true;
    }
    for (let i = 0; i < this.segs.length; i++) {
        const seg = this.segs[i];
        if (seg.broken) continue;
        const pos = this.segPos(i);
        const win = this.windup > 0 && i === this.segIndex;
        const c = win ? '#b03a2e' : color;
        // 首领出场：四字依次落笔
        if (this.isBoss && this.fresh != null && this.fresh < 1.6) {
            const a = Math.max(0, Math.min(1, (this.fresh - i * CONFIG.BOSS.glyphDrawGap) / CONFIG.BOSS.glyphDrawGap));
            ctx.globalAlpha = a;
        }
        inkRenderer.drawInkText(seg.char, pos.x + (i === this.segIndex ? jitter : 0) + (this.flash > 0 ? ex - this.x : 0),
            pos.y + (this.flash > 0 ? ey - this.y : 0), size, c, true);
    }
    return true;
};

// 分段血条：每个字下面一小段；血量变化后短暂显示。首领用顶部血条（js/ui/boss-bar.js）
Enemy.prototype.drawSegBars = function(ctx) {
    if (this.isBoss || !(this.hpBarT > 0)) return;
    if (EnemyAbilities.get(this, 'disguise')) return;
    const size = this.glyphSize;
    const w = size * 0.9;
    for (let i = 0; i < this.segs.length; i++) {
        const seg = this.segs[i];
        if (seg.broken) continue;
        const pos = this.segPos(i);
        const by = pos.y + size * 0.58;
        ctx.fillStyle = 'rgba(40,34,28,0.18)';
        ctx.fillRect(pos.x - w / 2, by, w, 3);
        ctx.fillStyle = '#b4473a';
        ctx.fillRect(pos.x - w / 2, by, w * Math.max(0, seg.hp / seg.maxHp), 3);
    }
};
