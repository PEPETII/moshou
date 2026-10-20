// 控制判定的运行时接口（工单 12）
//
// 所有塔的控制效果（击退、眩晕、冻结、定身、卷入、吸入）都经过这里：按敌人的字数分档衰减，
// 加上卷入预算、抗性窗口、硬控递减与首领「震慑」，防止多座控场塔把任何敌人永久锁死。
// 数值全部在 CONFIG.CONTROL（js/config/control-rules.js）。js/glyph/ 下除本文件外，
// 不再直接调用 Enemy 的 knockback / glyphStun / freeze（Enemy 上的这几个方法是不带规则的底层原语）。
const ControlRules = {
  tier(e) {
    const tiers = CONFIG.CONTROL.tiers;
    return tiers[e.tier] || tiers.minor;
  },

  // 一只敌人当前能不能被某种卷入类大招拖走（source: 'water' | 'wind'）
  canCarry(e, source) {
    const t = this.tier(e);
    if (source === 'wind') {
      if (!t.pull || e.pulledBy || e.carried) return false;
    } else {
      if (!t.carry || e.carried || e.pulledBy || e.carryImmuneT > 0) return false;
    }
    if (e.airborne || e.dashing || e.lethalHold || e.immuneControl || e.immuneKnockback) return false;
    return true;
  },

  carryCost(e) { return this.tier(e).carryCost; },

  // 击退：沿路径后退 dist 像素；按档位折扣，免疫者不动。src 供将来按来源区分
  knock(e, dist, src) {
    if (e.immuneKnockback || e.immuneControl || e.knockImmune) return;
    const mul = this.tier(e).knockMul * (e.knockMulExtra == null ? 1 : e.knockMulExtra);
    if (!(mul > 0)) return;
    e.knockbackRaw(dist * mul);
    if (e.onControlled) e.onControlled('knock');
  },

  // 硬控（眩晕、冻结、定身）统一入口：返回实际生效的秒数（0 = 没有生效）
  hardControl(e, dur, src, kind) {
    const C = CONFIG.CONTROL;
    if (e.immuneControl || e.ccImmune || e.dead) return 0;
    // 空中的敌人（蛙跳起、鬼浮）不吃地面效果的控制
    if (e.airborne && src === 'ground') return 0;
    const t = this.tier(e);
    if (kind === 'freeze' && t.freezeToSlow) {
      // 三字敌人冻结改为减速
      e.glyphSlowRaw(t.freezeToSlow, dur);
      return 0;
    }
    if (!(t.ccMul > 0)) {
      this.addStagger(e, dur);
      return 0;
    }
    dur *= t.ccMul;
    if (e.wardT > 0 && !t.diminish) dur *= e.wardMul || 0.5;
    if (t.diminish) {
      if (e.ccImmuneT > 0) return 0;
      if (e.ccWindowT <= 0) { e.ccCount = 0; e.ccWindowT = C.diminishWindow; }
      const step = C.diminishSteps[e.ccCount];
      if (step == null) {
        e.ccImmuneT = C.diminishImmune;
        e.ccCount = 0;
        e.ccWindowT = 0;
        return 0;
      }
      e.ccCount++;
      dur *= step;
    }
    dur = Math.min(dur, C.ccMaxSingle);
    if (!(dur > 0)) return 0;
    e.stunRaw(dur);
    if (kind === 'freeze') e.iceTime = Math.max(e.iceTime, dur);
    if (e.onControlled) e.onControlled(kind || 'stun');
    return dur;
  },

  stun(e, dur, src) { return this.hardControl(e, dur, src, 'stun'); },
  freeze(e, dur, src) { return this.hardControl(e, dur, src, 'freeze'); },
  root(e, dur, src) { return this.hardControl(e, dur, src, 'root'); },

  // 首领震慑：硬控折算成震慑点，满了踉跄一阵
  addStagger(e, dur) {
    const C = CONFIG.CONTROL;
    if (e.staggerT > 0 || e.staggerLockT > 0) return;
    e.stagger += dur * C.staggerPerSec * (e.staggerMul == null ? 1 : e.staggerMul);
    if (e.stagger >= C.staggerMax) {
      e.stagger = 0;
      e.staggerT = C.staggerDuration;
      e.staggerLockT = C.staggerDuration + C.staggerLock;
      if (typeof GlyphFX !== 'undefined') GlyphFX.text(e.x, e.y - 24 * CONFIG.GLYPH_SCALE, '踉跄', { color: CONFIG.GLYPH_COLORS.seal || '#b03a2e', size: 22, life: 0.9 });
    }
  },

  // 减速的总上限（最大减速比例）
  slowCapOf(e) {
    const cap = this.tier(e).slowCap;
    return e.slowCapOverride == null ? cap : Math.min(cap, e.slowCapOverride);
  },

  // 减速（泥泞、藤蔓、湿身…）：免疫减速期内无效
  slow(e, ratio, dur, src) {
    if (e.slowImmuneT > 0 || (e.airborne && src === 'ground')) return;
    e.glyphSlowRaw(ratio, dur);
  },

  // 外部增伤叠乘：factors 是 ≥ 1 的倍率数组，乘积不超过 ampCap；塔自身的倍率不计入
  amp(e, factors) {
    let m = 1;
    for (const f of factors) m *= f;
    return Math.min(CONFIG.CONTROL.ampCap, m);
  },

  // 每帧推进抗性窗口、震慑计时（Enemy.tickGlyphStatus 调用）
  tick(e, dt) {
    if (e.carryImmuneT > 0) e.carryImmuneT -= dt;
    if (e.pullImmuneT > 0) e.pullImmuneT -= dt;
    if (e.slowImmuneT > 0) e.slowImmuneT -= dt;
    if (e.ccWindowT > 0) {
      e.ccWindowT -= dt;
      if (e.ccWindowT <= 0) e.ccCount = 0;
    }
    if (e.ccImmuneT > 0) e.ccImmuneT -= dt;
    if (e.staggerT > 0) e.staggerT -= dt;
    if (e.staggerLockT > 0) e.staggerLockT -= dt;
  },
};

if (typeof window !== 'undefined') window.ControlRules = ControlRules;
