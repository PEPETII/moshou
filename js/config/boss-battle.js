// 首领战与新敌人通用规则的集中配置（工单 01、07、10）
//
// 时间一律为秒。首领的血量倍率按敌潮档位取；首领不吃关卡 hpMul。
Object.assign(CONFIG, {
  BOSS: {
    entryCalmSeconds: 10,     // 首领出场后这么久内普通刷怪降速
    entryCalmRateMul: 0.5,
    killEarlyHoldMul: 0.5,    // 计时结束前斩首：剩余坚守时间立即乘这个系数
    coreHitRatio: 0.5,        // 首领第一次到达核心：扣除核心上限的这个比例（向上取整）
    maxCoreHits: 1,           // 首领到达核心的次数超过这个值就直接判负
    duelSpawnStop: true,      // 进入决战（计时结束而首领未死）后停止普通刷怪
    hpMulByDensity: { sparse: 0.75, normal: 0.9, flood: 1.0 },
    returnInvuln: 2,          // 卷土重来：回到入口后这么久内免疫伤害
    omenSeconds: 3,           // 出场前的预兆（墨晕扩散）
    glyphDrawGap: 0.15,       // 出场时四字依次落笔的间隔
    bannerSeconds: 1.6,
    breakFx: { hitstop: 0.08, shake: 9 },   // 碎字：顿帧、震屏
    killHeavyMul: 2,          // 首领击杀的重击反馈倍率
  },

  // 召唤物击杀奖励固定值（不受关卡 hpMul 与敌潮奖励倍率影响）
  SUMMON_REWARD: 1,

  // 隐身敌人被范围伤害命中后的显形时长
  REVEAL_ON_AOE: 1.5,

  // 敌人通用字段
  ENEMY_FX: {
    segmentBreakShake: 3,     // 多字敌人碎一个字的轻微震屏
    mergeSeconds: 0.3,        // 碎字后剩余字往前合拢的动画
    hpBarSeconds: 2,          // 分段血条在血量变化后显示的时长
    windupSeconds: 0.3,       // 能力触发前摇（字身抖动）
    ghostAlpha: 0.35,         // 不可选中时的虚影透明度
  },
});
