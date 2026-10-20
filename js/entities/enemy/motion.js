// Enemy：里程制移动与字形状态（工单 04）
//
// 敌人的位置由路径里程 s 决定；击退即减小 s，被「潮」卷入时 s 由招式接管（carried）。
// 时间单位：本文件内的状态计时一律为「秒」（与旧版毫秒制的 frozen/stunned 等字段分开）。

// 由 s 与 lane 推出坐标与 pathIndex
Enemy.prototype.syncPosition = function() {
    const track = this.track;
    if (!track) return;
    const p = track.pointAt(this.s);
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
      } else {
        this.s += this.speed * CONFIG.CELL_SIZE * this.glyphSpeedMul() * dt;
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
        this.hit(dmg, { kind: 'fire' });
      }
      if (this.burnTime <= 0) this.burnStacks = 0;
    }
};

// 字形招式的统一伤害入口：记录击中类型、触发闪光，再走正式的 takeDamage（击杀奖励、音效、统计照常）
// 注意不传 elementType，避免旧的「火水蒸发」交互把每次灼烧都算成蒸发。
Enemy.prototype.hit = function(amount, opts = {}) {
    if (this.dead) return;
    this.flash = 0.12;
    this.lastHitKind = opts.kind || null;
    // 字形招式自带打击反馈，不触发旧的受击抖动
    this._glyphHit = true;
    this.takeDamage(amount * this.damageMul());
    this._glyphHit = false;
    if (this.dead && typeof GlyphFX !== 'undefined') GlyphFX.kill(this, this.lastHitKind);
    if (this.dead && typeof GlyphSystem !== 'undefined' && this.game) GlyphSystem.onKill(this.game, this);
};

// 受伤倍率：金钟「破甲」期间受到的所有伤害加深
Enemy.prototype.damageMul = function() {
    return this.exposeTime > 0 ? 1 + this.exposeRatio : 1;
};

// 移速倍率：湿身、减速、寒三者相乘，总减速不超过 slowCap
Enemy.prototype.glyphSpeedMul = function() {
    const cfg = CONFIG.GLYPH_STATUS;
    let mul = this.wet > 0 ? 1 - cfg.wetSlow : 1;
    if (this.slowTime > 0) mul *= 1 - this.slowRatio;
    if (this.chillStacks > 0) mul *= 1 - cfg.chillSlowPerStack * this.chillStacks;
    return Math.max(1 - cfg.slowCap, mul);
};

// 叠灼烧（05 的火招调用）
Enemy.prototype.ignite = function(stacks, duration) {
    const max = CONFIG.GLYPH_STATUS.burnMaxStacks;
    this.burnStacks = Math.min(max, this.burnStacks + stacks);
    this.burnTime = Math.max(this.burnTime, duration);
};

// 打湿（05 的水招调用）
Enemy.prototype.makeWet = function(duration) {
    this.wet = Math.max(this.wet, duration);
};

// 击退：沿路径后退 distance 像素；重敌打折，免疫击退者不动
Enemy.prototype.knockback = function(distance) {
    if (this.immuneKnockback || this.immuneControl) return;
    const k = this.weight > 1 ? CONFIG.GLYPH_STATUS.giantKnockMul : 1;
    this.s = Math.max(0, this.s - distance * k);
    this.syncPosition();
};

// 眩晕（秒）：取更长者
Enemy.prototype.glyphStun = function(duration) {
    if (this.immuneControl) return;
    this.stun = Math.max(this.stun, duration);
};

// 减速（土泥泞、木苗、藤蔓等）：比例取更强者，时长取更长者
Enemy.prototype.glyphSlow = function(ratio, duration) {
    if (this.immuneControl) return;
    this.slowRatio = this.slowTime > 0 ? Math.max(this.slowRatio, ratio) : ratio;
    this.slowTime = Math.max(this.slowTime, duration);
};

// 寒（冰塔）：叠层减速，叠满即冻结并清空层数
Enemy.prototype.chill = function(stacks, duration, freezeTime) {
    if (this.immuneControl) return;
    this.chillStacks += stacks;
    this.chillTime = Math.max(this.chillTime, duration);
    if (this.chillStacks >= CONFIG.GLYPH_STATUS.chillMaxStacks) {
      this.chillStacks = 0;
      this.freeze(freezeTime);
    }
};

// 冻结：眩晕的一种，另记 iceTime 供绘制冰壳（旧的 frozen 布尔字段属旧冻结链，不复用）
Enemy.prototype.freeze = function(duration) {
    if (this.immuneControl) return;
    this.glyphStun(duration);
    this.iceTime = Math.max(this.iceTime, duration);
};

// 破甲（金塔）：一段时间内受伤加深
Enemy.prototype.expose = function(ratio, duration) {
    this.exposeRatio = this.exposeTime > 0 ? Math.max(this.exposeRatio, ratio) : ratio;
    this.exposeTime = Math.max(this.exposeTime, duration);
};
