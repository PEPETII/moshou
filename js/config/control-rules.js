// 控制与卷入限制规则的集中配置（工单 12）
//
// 控制要有效但有上限：小怪潮好清场；精英、首领按字数逐级衰减；多座控场塔叠加也锁不死任何敌人。
// 运行时判定见 js/glyph/control-rules.js（ControlRules）。时间单位一律为秒，距离为像素量的倍率。
//
// 加载顺序：glyph-battle.js 之后即可（本文件不依赖其它配置）。
Object.assign(CONFIG, {
  CONTROL: {
    // 分档表：以敌人 tier 为 key；每一列的含义
    //   carry / carryCost / carryDistMul  水·潮能否卷入、占用预算、倒卷距离折扣
    //   pull / pullMul                    风·旋能否吸入、吸力折扣
    //   knockMul                          击退距离折扣（0 = 免疫）
    //   ccMul                             硬控（眩晕、冻结、定身）时长折扣（0 = 免疫，首领改累积震慑）
    //   freezeToSlow                      冻结改为这个比例的减速（false = 正常冻结）
    //   slowCap                           总减速上限
    //   diminish                          硬控是否按窗口递减（小怪不递减，保证清场爽快）
    tiers: {
      minor:   { carry: true,  carryCost: 1, carryDistMul: 1,    pull: true,  pullMul: 1,   knockMul: 1,   ccMul: 1,   freezeToSlow: false, slowCap: 0.8, diminish: false },
      heavy:   { carry: true,  carryCost: 3, carryDistMul: 0.5,  pull: true,  pullMul: 0.3, knockMul: 0.3, ccMul: 0.7, freezeToSlow: false, slowCap: 0.7, diminish: true },
      elite:   { carry: true,  carryCost: 4, carryDistMul: 0.35, pull: true,  pullMul: 0.2, knockMul: 0.2, ccMul: 0.5, freezeToSlow: false, slowCap: 0.6, diminish: true },
      greater: { carry: false, carryCost: 6, carryDistMul: 0,    pull: false, pullMul: 0,   knockMul: 0.1, ccMul: 0.3, freezeToSlow: 0.5,   slowCap: 0.5, diminish: true },
      boss:    { carry: false, carryCost: 99, carryDistMul: 0,   pull: false, pullMul: 0,   knockMul: 0,   ccMul: 0,   freezeToSlow: false, slowCap: 0.3, diminish: false },
    },

    // 卷入 / 吸入预算（体量点数）：每道浪、每个旋风各自一份；新增卷入类大招必须在此登记
    carryBudget: { water: 14, wind: 10 },

    // 抗性窗口
    carryImmune: 3.0,        // 被潮放下后这么久内不能再被卷入
    pullImmune: 2.0,         // 离开旋风后这么久内吸力打折
    pullImmuneMul: 0.3,
    diminishWindow: 6,       // 硬控递减窗口
    diminishSteps: [1, 0.5, 0.25],   // 窗口内第 1、2、3 次硬控的时长比例
    diminishImmune: 2,       // 第 4 次免疫的秒数，之后重置
    ccMaxSingle: 2.5,        // 单次眩晕 / 冻结 / 定身时长上限

    // 首领「震慑」：硬控命中首领不产生控制，改为累积
    staggerPerSec: 30,       // 每秒控制时长折算的震慑点
    staggerMax: 100,
    staggerDuration: 1.2,    // 踉跄时长：移速 × staggerSpeedMul，能力冷却暂停
    staggerSpeedMul: 0.4,
    staggerLock: 8,          // 踉跄结束后这么久内不再累积

    // 外部增伤（破甲、湿身对雷的加成等）相乘后的倍率上限；塔自身倍率（暴击、重敌加成）不计入
    ampCap: 1.8,

    // 光环类减伤（瘴雾、筑墙）相乘后的下限
    allyReductionFloor: 0.5,

    // 山「镇」对能力冷却流速的下限（多座山取最小值，不低于它）
    suppressFloor: 0.6,
  },
});
