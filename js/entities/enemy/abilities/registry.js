// 敌人能力框架（工单 07）：能力是挂在敌人（或敌人某个字）上的独立小模块。
//
// 敌人配置声明 abilities: [{ id, ...参数 }]，Enemy 构造时由 init 实例化，状态放在 e.ab[id]。
// 每种能力实现下面的钩子（都可省略）：
//   init(e, p, st)                    st 是本能力的状态对象
//   update(e, p, dt, game, cdt, st)   每帧；cdt = dt × abilityTimeScale（山的「镇」、首领踉跄会让它变小）
//   onHit(e, p, amount, opts, st)     返回修正后的伤害（硬甲、缩壳之类）
//   onLethal(e, p, opts, st)          致命伤时调用；返回 true 表示拦下这次死亡（复聚、复生）
//   onSegmentBreak(e, p, index, st, opts)  本能力所属的字（或整只敌人）有字被打碎
//   draw(ctx, e, p, st)               额外绘制（光环、虚影等）
// 能力实现按组放在同目录的 minor-a / minor-b / elite / boss 文件里，用 EnemyAbilities.register 登记。
//
// 调度规则：
//   - 碎字失效：挂在第 i 个字上的能力只在 segIndex ≤ i 时生效；整只敌人的能力（seg = -1）始终生效；
//   - 能力冻结：被潮卷着、眩晕、冻结时不触发主动效果（冷却到 0 后等着，恢复就触发）；
//   - 计时一律用游戏时间 dt（秒），暂停与顿帧时一起停（总览 B5）。
const EnemyAbilities = {
  IMPLS: {},

  register(map) { Object.assign(this.IMPLS, map); },

  // 像素量乘 GLYPH_SCALE
  px(v) { return v * CONFIG.GLYPH_SCALE; },

  // Enemy.initAdvanced 之后调用：把配置里的能力实例化
  init(e, config) {
    e.abil = [];
    e.ab = {};
    const add = (list, seg) => {
      for (const p of list || []) {
        const impl = this.IMPLS[p.id];
        if (!impl) continue;
        const st = { seg };
        e.ab[p.id] = st;
        e.abil.push({ id: p.id, p, seg, impl, st });
      }
    };
    add(config.abilities, -1);
    if (Array.isArray(config.segments)) config.segments.forEach((s, i) => add(s.abilities, i));
    for (const a of e.abil) if (a.impl.init) a.impl.init(e, a.p, a.st);
  },

  // 这个字是否还在（整只敌人的能力始终有效）
  active(e, a) { return a.seg < 0 || a.seg >= e.segIndex; },

  // 能不能触发主动效果：被卷着、眩晕冻结、假死时不能
  canAct(e) { return !(e.carried || e.stun > 0 || e.lethalHold || e.dead); },

  // 每帧：复位本帧要重新计算的字段，再依次调用有效能力的 update
  update(e, dt, game) {
    // 每帧由能力重新设置的字段先复位（能力失效后效果立刻消失）
    e.abSpeedMul = 1;
    e.untargetable = false;
    e.windup = 0;
    e.windupLabel = null;
    e.airborne = false;
    e.ccImmune = false;
    e.knockImmune = false;
    e.immuneWet = false;
    e.exposeTimeMul = 1;
    e.slowCapOverride = null;
    e.staggerMul = 1;
    const cdt = dt * (e.staggerT > 0 ? 0 : e.abilityTimeScale);
    const list = e.abil;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.impl.update && (a.impl.always || this.active(e, a))) a.impl.update(e, a.p, dt, game, cdt, a.st);
    }
  },

  // 周期触发计时：冷却走 cdt；返回 true 表示这一帧该触发。前摇期间设 e.windup（0..1）供绘制
  timer(e, p, st, cdt) {
    if (st.cd == null) st.cd = (p.first != null ? p.first : p.every * (0.5 + 0.5 * Math.random()));
    st.cd -= cdt;
    const w = p.windup || 0;
    if (w > 0 && st.cd <= w && st.cd > 0 && this.canAct(e)) {
      const k = 1 - st.cd / w;
      if (k > e.windup) { e.windup = k; e.windupLabel = p.label || null; }
    }
    if (st.cd > 0) return false;
    if (!this.canAct(e)) { st.cd = 0; return false; }
    st.cd = p.every;
    return true;
  },

  // 伤害修正链：每个有效能力的 onHit 依次处理，返回 ≤ 0 即被完全吸收
  onHit(e, amount, opts) {
    const list = e.abil;
    for (let i = 0; i < list.length && amount > 0; i++) {
      const a = list[i];
      if (a.impl.onHit && this.active(e, a)) amount = a.impl.onHit(e, a.p, amount, opts, a.st);
    }
    return amount;
  },

  // 致命伤：任意一个返回 true 就不死
  onLethal(e, opts) {
    for (const a of e.abil) {
      if (a.impl.onLethal && this.active(e, a) && a.impl.onLethal(e, a.p, opts, a.st)) return true;
    }
    return false;
  },

  // 第 index 个字碎了：通知属于这个字、以及整只敌人的能力（不检查有效性：碎字时要能触发「开墓」「复原」）
  onSegmentBreak(e, index, opts) {
    for (const a of e.abil) {
      if (a.impl.onSegmentBreak && (a.seg === index || a.seg < 0)) a.impl.onSegmentBreak(e, a.p, index, a.st, opts);
    }
  },

  // 被击退、眩晕、冻结时通知（骑的冲锋被打断）
  onControlled(e, kind) {
    for (const a of e.abil) {
      if (a.impl.onControlled && this.active(e, a)) a.impl.onControlled(e, a.p, kind, a.st);
    }
  },

  // 被破甲命中（壁垒护盾损失一半）
  onExpose(e) {
    for (const a of e.abil) {
      if (a.impl.onExpose && this.active(e, a)) a.impl.onExpose(e, a.p, a.st);
    }
  },

  draw(ctx, e) {
    for (const a of e.abil) {
      if (a.impl.draw && this.active(e, a)) a.impl.draw(ctx, e, a.p, a.st);
    }
  },

  // 取某能力的状态与参数（未挂载或已失效返回 null）
  get(e, id) {
    if (!e.abil) return null;
    for (const a of e.abil) if (a.id === id && this.active(e, a)) return a;
    return null;
  },

  // 召唤：在召唤者当前里程后方 10～40px 处出生，走同一条路径；受 ENEMY_CAP 限制。返回实际召出的敌人
  summon(e, type, count, extra) {
    const game = e.game;
    const out = [];
    if (!game || !game.spawnGlyphEnemy) return out;
    const S = CONFIG.GLYPH_SCALE;
    for (let i = 0; i < count; i++) {
      if (game.aliveEnemyCount() >= CONFIG.ENEMY_CAP) break;
      const back = (10 + Math.random() * 30) * S;
      const s = Math.max(0, e.s - back);
      const child = game.spawnGlyphEnemy(type, Object.assign({ pathIndex: e.pathNo, s, summoned: true, summoner: e }, extra));
      if (child) out.push(child);
    }
    if (out.length && game.runtimeIndexes) game.runtimeIndexes.rebuildEnemies();
    return out;
  },

  // 范围内（像素）其它存活敌人
  nearby(e, radius, filter) {
    const game = e.game;
    const list = typeof GlyphWorld !== 'undefined' ? GlyphWorld.enemiesInRange(game, e.x, e.y, radius) : [];
    const out = [];
    for (const o of list) if (o !== e && !o.dead && (!filter || filter(o))) out.push(o);
    return out;
  },
};

if (typeof window !== 'undefined') window.EnemyAbilities = EnemyAbilities;
