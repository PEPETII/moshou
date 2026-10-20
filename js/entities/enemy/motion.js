// Enemy：里程制移动与字形状态（工单 04）
//
// 敌人的位置由路径里程 s 决定；击退即减小 s，被「潮」卷入时 s 由招式接管（carried）。
// 时间单位：本文件内的状态计时一律为「秒」（与旧版毫秒制的 frozen/stunned 等字段分开）。

// 由 s 与 lane 推出坐标与 pathIndex
Enemy.prototype.syncPosition = function() {
    const track = this.track;
    if (!track) return;
    // 多字敌人的坐标取各字中点（范围查询覆盖整只敌人）；单字偏移为 0
    const off = this.segs && this.segs.length > 1 ? this.centerOffset() : 0;
    const p = track.pointAt(off > 0 ? Math.max(0, this.s - off) : this.s);
    const nx = -Math.sin(p.ang);
    const ny = Math.cos(p.ang);
    this.x = p.x + nx * this.lane;
    this.y = p.y + ny * this.lane;
    if (this.float) {
      const t = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.y += Math.sin(t / 260 + this.bob) * 4 - 6;
    }
    this.pathIndex = track.cellIndexAt(this.s);
};

// 沿路径前进。到达终点：塔防扣核心血量；征服（环形回路）归零继续绕圈
Enemy.prototype.advance = function(deltaTime) {
    const dt = deltaTime / 1000;
    if (!this.carried) {
      if (this.stun > 0) {
        this.stun -= dt;
      } else if (!this.lethalHold) {
        const stagger = this.staggerT > 0 ? CONFIG.CONTROL.staggerSpeedMul : 1;
        this.s += this.speed * CONFIG.CELL_SIZE * this.glyphSpeedMul() * this.abSpeedMul * stagger * dt;
      }
    }
    if (this.s < 0) this.s = 0;

    const track = this.track;
    if (track.loop) {
      if (this.s >= track.total) this.s -= track.total;
    } else if (this.s >= track.total - 2) {
      this.s = track.total;
      this.syncPosition();
      this.reachCore();
      return;
    }
    this.syncPosition();
};

// 字形状态：击中闪光、湿身、灼烧（伤害合并成一个数字，统一走 hit → takeDamage）
Enemy.prototype.tickGlyphStatus = function(dt) {
    if (this.flash > 0) this.flash -= dt;
    ControlRules.tick(this, dt);
    this.tickTimers(dt);
    if (this.segs) this.tickSegments(dt);
    this.pushVx *= 1 - Math.min(1, dt * 6);
    if (this.wet > 0) this.wet -= dt;
    if (this.slowTime > 0) this.slowTime -= dt;
    if (this.exposeTime > 0) this.exposeTime -= dt;
    if (this.iceTime > 0) this.iceTime -= dt;
    if (this.chillTime > 0) {
      this.chillTime -= dt;
      if (this.chillTime <= 0) this.chillStacks = 0;
    }
    if (this.burnTime > 0) {
      const cfg = CONFIG.GLYPH_STATUS;
      this.burnTime -= dt;
      this.burnAcc += cfg.burnDps * this.burnStacks * dt;
      this.burnShow += dt;
      if (this.burnShow >= cfg.burnShowInterval) {
        const dmg = this.burnAcc;
        this.burnAcc = 0;
        this.burnShow = 0;
        // 灼烧每 burnShowInterval 秒合并成一个数字
        if (typeof GlyphFX !== 'undefined') GlyphFX.number(this, dmg * this.damageMul(), { color: CONFIG.GLYPH_COLORS.fire, size: 15 });
        this.hit(dmg, { kind: 'fire', dot: true, burn: true, delivery: 'ground' });
      }
      if (this.burnTime <= 0) this.burnStacks = 0;
    }
};

// 字形招式的统一伤害入口：记录击中类型、触发闪光，再走正式的伤害结算（击杀奖励、音效、统计照常）
// 注意不传 elementType，避免旧的「火水蒸发」交互把每次灼烧都算成蒸发。
// opts：kind 塔类型；delivery 投送方式（projectile 弹道 / ground 地面 / instant 瞬发）；
//   aoe 范围效果（命中会让隐身敌人显形）；dot 持续伤害的每一跳；wetBonus 对湿身敌人的外部增伤倍率（雷）。
// 单段敌人（尸、鬼、巨）走旧的 takeDamage；带能力或多字的敌人走分段管线（segments.js）。
Enemy.prototype.hit = function(amount, opts = {}) {
    if (this.dead) return;
    if (this.invulnT > 0 || this.lethalHold) return;
    // 空中的敌人（蛙、鬼浮）不吃地面效果，单体与瞬发照常命中
    if (this.airborne && opts.delivery === 'ground') return;
    this.flash = 0.12;
    this.lastHitKind = opts.kind || null;
    this.lastHitOpts = opts;
    if (opts.aoe && this.untargetable) this.revealT = CONFIG.REVEAL_ON_AOE;
    // 字形招式自带打击反馈，不触发旧的受击抖动
    this._glyphHit = true;
    amount *= this.allyReduction(opts);
    if (this.adv) this.applyDamage(amount, opts);
    else this.takeDamage(amount * this.damageMul(opts));
    this._glyphHit = false;
    if (this.dead && typeof GlyphFX !== 'undefined') GlyphFX.kill(this, this.lastHitKind);
    if (this.dead && typeof GlyphSystem !== 'undefined' && this.game) GlyphSystem.onKill(this.game, this);
};

// 外部增伤倍率：金的破甲、湿身对雷的加成相乘，不超过 CONTROL.ampCap；塔自身的倍率（暴击、重敌加成）不计入
Enemy.prototype.damageMul = function(opts) {
    const f = [];
    if (this.exposeTime > 0) f.push(1 + this.exposeRatio);
    if (opts && opts.wetBonus && this.wet > 0) f.push(opts.wetBonus);
    return f.length ? ControlRules.amp(this, f) : 1;
};

// 移速倍率：湿身、减速、寒三者相乘，总减速不超过 slowCap
Enemy.prototype.glyphSpeedMul = function() {
    const cfg = CONFIG.GLYPH_STATUS;
    let mul = this.wet > 0 && !this.wetNoSlow ? 1 - cfg.wetSlow : 1;
    if (this.slowTime > 0) mul *= 1 - this.slowRatio;
    if (this.chillStacks > 0) mul *= 1 - cfg.chillSlowPerStack * this.chillStacks;
    if (this.slowImmuneT > 0) return 1;
    return Math.max(1 - Math.min(cfg.slowCap, ControlRules.slowCapOf(this)), mul);
};

// 叠灼烧（05 的火招调用）
Enemy.prototype.ignite = function(stacks, duration) {
    const max = CONFIG.GLYPH_STATUS.burnMaxStacks;
    this.burnStacks = Math.min(max, this.burnStacks + stacks);
    this.burnTime = Math.max(this.burnTime, duration);
};

// 打湿（05 的水招调用）；免疫湿身的敌人（江身）直接返回
Enemy.prototype.makeWet = function(duration) {
    if (this.immuneWet) return;
    this.wet = Math.max(this.wet, duration);
};

// 击退的底层原语：沿路径后退 distance 像素（不带任何规则；塔的招式一律走 ControlRules.knock）
Enemy.prototype.knockbackRaw = function(distance) {
    this.s = Math.max(0, this.s - distance);
    this.syncPosition();
};

// 被击退、眩晕、冻结时通知能力（骑的冲锋被打断）
Enemy.prototype.onControlled = function(kind) {
    if (this.adv && this.abil.length) EnemyAbilities.onControlled(this, kind);
};

// 眩晕的底层原语（秒）：取更长者（塔的招式一律走 ControlRules.stun）
Enemy.prototype.stunRaw = function(duration) {
    this.stun = Math.max(this.stun, duration);
};

// 减速的底层原语：比例取更强者，时长取更长者（塔的招式一律走 ControlRules.slow）
Enemy.prototype.glyphSlowRaw = function(ratio, duration) {
    if (this.immuneControl) return;
    this.slowRatio = this.slowTime > 0 ? Math.max(this.slowRatio, ratio) : ratio;
    this.slowTime = Math.max(this.slowTime, duration);
};

// 带规则的便捷入口（测试与旧代码用）：一律经 ControlRules 分档、递减、限幅。js/glyph/ 下的招式直接调用 ControlRules。
Enemy.prototype.knockback = function(distance) { ControlRules.knock(this, distance, 'api'); };
Enemy.prototype.glyphStun = function(duration) { ControlRules.stun(this, duration, 'api'); };
Enemy.prototype.freeze = function(duration) { ControlRules.freeze(this, duration, 'api'); };
Enemy.prototype.glyphSlow = function(ratio, duration) { ControlRules.slow(this, ratio, duration); };

// 寒（冰塔）：叠层减速，叠满即冻结并清空层数
Enemy.prototype.chill = function(stacks, duration, freezeTime) {
    if (this.immuneControl || this.slowImmuneT > 0) return;
    this.chillStacks += stacks;
    this.chillTime = Math.max(this.chillTime, duration);
    if (this.chillStacks >= CONFIG.GLYPH_STATUS.chillMaxStacks) {
        this.chillStacks = 0;
        ControlRules.freeze(this, freezeTime, 'ice');
    }
};

// 破甲（金塔）：一段时间内受伤加深
Enemy.prototype.expose = function(ratio, duration) {
    duration *= this.exposeTimeMul;
    if (this.abil && this.abil.length) EnemyAbilities.onExpose(this);
    this.exposeRatio = this.exposeTime > 0 ? Math.max(this.exposeRatio, ratio) : ratio;
    this.exposeTime = Math.max(this.exposeTime, duration);
};
