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
        const wetSlow = this.wet > 0 ? 1 - CONFIG.GLYPH_STATUS.wetSlow : 1;
        this.s += this.speed * CONFIG.CELL_SIZE * wetSlow * dt;
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
        if (typeof GlyphFX !== 'undefined') GlyphFX.number(this, dmg, { color: CONFIG.GLYPH_COLORS.fire, size: 15 });
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
    this.takeDamage(amount);
    this._glyphHit = false;
    if (this.dead && typeof GlyphFX !== 'undefined') GlyphFX.kill(this, this.lastHitKind);
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
