// 关卡刷怪编排的纯函数（工单 01）：普通刷怪池抽取、重敌间隔、精英与首领的时间点、加压时段。
// BattleDirector（spawner.js）调用；本文件不碰游戏状态，方便测试。
//
// 关卡数据字段（均可缺省；缺 roster 时 BattleDirector 回退旧逻辑）：
//   roster: [{ type, weight, from?, to? }]    权重越大越常出；from / to 限定开战后第几秒起、止出现
//   heavy:  [{ type, every, first? }]         重敌按固定间隔出；every 可给数字或 { sparse, normal, flood }
//   elites: [{ type, at, path? }]             精英按时间点出场，与敌潮档位无关
//   boss:   { type, at, path? }               首领（只有关底有）
//   surges: [{ at, dur, rateMul }]            某段时间刷怪更密
const SpawnSchedule = {
  // 当前时刻可出的 roster 条目
  activeRoster(level, elapsed) {
    return (level.roster || []).filter((r) => (r.from == null || elapsed >= r.from) && (r.to == null || elapsed < r.to));
  },

  // 按权重抽取一种怪的类型；rnd 缺省用 Math.random，可传入可设种子的随机函数
  pickRosterType(level, elapsed, rnd) {
    const list = this.activeRoster(level, elapsed);
    let total = 0;
    for (const r of list) total += r.weight;
    if (!(total > 0)) return null;
    let x = (rnd || Math.random)() * total;
    for (const r of list) {
      x -= r.weight;
      if (x < 0) return r.type;
    }
    return list[list.length - 1].type;
  },

  // 重敌间隔（秒）：数字三档相同，对象按档位取
  heavyEvery(h, densityKey) {
    return typeof h.every === 'number' ? h.every : h.every[densityKey];
  },

  // 加压时段的刷怪速率倍率
  surgeMul(level, elapsed) {
    let m = 1;
    for (const s of level.surges || []) {
      if (elapsed >= s.at && elapsed < s.at + s.dur) m *= s.rateMul;
    }
    return m;
  },

  // 到点还没出的精英下标（按 game.spawnedElites 去重）
  dueElites(level, elapsed, done) {
    const out = [];
    (level.elites || []).forEach((el, i) => {
      if (!done.has(i) && elapsed >= el.at) out.push(i);
    });
    return out;
  },

  hasBoss(level) { return !!(level && level.boss); },
};

if (typeof window !== 'undefined') window.SpawnSchedule = SpawnSchedule;
