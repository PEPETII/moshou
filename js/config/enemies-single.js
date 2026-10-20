// 十二种单字敌人（工单 08；2026-10-21 四大关卡与敌人扩充）
//
// 加载顺序：在 domain-03.js 之后、glyph-battle.js 之前（glyph-battle.js 负责把 speedPx 换算成 speed）。
// 字段（格式见工单 07）：
//   tier       minor 小怪 / heavy 重敌；决定控制分档（CONFIG.CONTROL.tiers）与体量
//   speedPx    原型 px/s；size 原型字号 px；weight 敌群评分权重（重敌 > 1）
//   abilities  [{ id, ...参数 }]；能力实现见 js/entities/enemy/abilities/；参数里的距离、半径是原型 px，运行时乘 GLYPH_SCALE
// 所有数值都是初值，最终以 docs/工单计划/2026-10-21-四大关卡与敌人扩充/11-数值平衡总纲.md 的护栏为准。
Object.assign(CONFIG.ENEMIES, {
  // 骨：被火、雷系击杀会碎，被别的塔打死会在 1.5 秒后以 40% 血量复聚一次
  bone: {
    char: '骨', tier: 'minor', hp: 45, speedPx: 44, size: 30, weight: 1, damage: 1, reward: 5,
    abilities: [{ id: 'reassemble', delay: 1.5, hpRatio: 0.4, breakKinds: ['fire', 'thunder', 'yan', 'fen'] }],
  },
  // 狐：每隔一阵沿路瞬移，瞬移后短暂无敌
  fox: {
    char: '狐', tier: 'minor', hp: 30, speedPx: 72, size: 28, weight: 1, damage: 1, reward: 5,
    abilities: [{ id: 'blink', every: 3.5, distance: 60, immune: 0.2, ghost: 0.4, windup: 0.3 }],
  },
  // 蛛：向最近的塔吐丝，被缚的塔写回变慢
  spider: {
    char: '蛛', tier: 'minor', hp: 55, speedPx: 38, size: 30, weight: 1, damage: 1, reward: 7,
    abilities: [{ id: 'web', every: 5, range: 150, windup: 0.4, duration: 2.5, rewriteMul: 1.6, towerCooldown: 4, maxWebbed: 3 }],
  },
  // 鲛：时沉时浮，潜行时只能被范围效果命中；天生湿身（雷伤 ×1.5，但不被湿身减速）
  jiao: {
    char: '鲛', tier: 'minor', hp: 50, speedPx: 50, size: 30, weight: 1, damage: 1, reward: 6,
    wetNoSlow: true,
    abilities: [{ id: 'dive', every: 4, duration: 1.5, windup: 0.3 }],
  },
  // 蛙：跳跃前进，空中不吃地面效果、不被潮卷入
  frog: {
    char: '蛙', tier: 'minor', hp: 42, speedPx: 36, size: 28, weight: 1, damage: 1, reward: 5,
    abilities: [{ id: 'hop', every: 1.6, hopTime: 0.4, distance: 72, pause: 0.3 }],
  },
  // 龟：血量首次跌破一半时缩壳，3 秒内减伤 75%，灼烧不受影响
  turtle: {
    char: '龟', tier: 'heavy', hp: 160, speedPx: 26, size: 40, weight: 3, damage: 2, reward: 12,
    abilities: [{ id: 'shell', hpRatio: 0.5, duration: 3, reduction: 0.25 }],
  },
  // 铠：硬甲，每次受击先减去定额；破甲时失效
  kai: {
    char: '铠', tier: 'heavy', hp: 120, speedPx: 34, size: 38, weight: 3, damage: 2, reward: 11,
    abilities: [{ id: 'plating', flat: 4, dotFlat: 2 }],
  },
  // 骑：周期性冲锋，被击退、眩晕、冻结或重度减速会打断
  rider: {
    char: '骑', tier: 'minor', hp: 70, speedPx: 44, size: 32, weight: 1, damage: 2, reward: 8,
    abilities: [{ id: 'charge', every: 6, duration: 2, speedMul: 2.2, breakSlow: 0.4, windup: 0.3 }],
  },
  // 巫：治疗周围其它敌人的最大血量一定比例
  shaman: {
    char: '巫', tier: 'minor', hp: 60, speedPx: 40, size: 30, weight: 1, damage: 1, reward: 9,
    abilities: [{ id: 'heal', every: 2.5, radius: 100, ratio: 0.08, windup: 0.3 }],
  },
  // 魇：常驻光环压低范围内塔的蓄力速度
  nightmare: {
    char: '魇', tier: 'minor', hp: 65, speedPx: 42, size: 30, weight: 1, damage: 1, reward: 9,
    abilities: [{ id: 'dread', radius: 130, chargeMul: 0.5 }],
  },
  // 瘴：周身瘴雾让雾里其它敌人受伤打折；风刃命中吹散一阵，旋风覆盖则全程消散
  miasma: {
    char: '瘴', tier: 'minor', hp: 55, speedPx: 40, size: 30, weight: 1, damage: 1, reward: 8,
    abilities: [{ id: 'miasma', radius: 80, reduction: 0.75, clearTime: 3 }],
  },
  // 饕：吞掉身前的尸、鬼，长血长身
  glutton: {
    char: '饕', tier: 'heavy', hp: 110, speedPx: 30, size: 40, weight: 3, damage: 2, reward: 12,
    abilities: [{ id: 'devour', every: 3, radius: 50, gainRatio: 0.6, grow: 0.06, maxMul: 3, rewardPer: 2, windup: 0.3 }],
  },
});

// 新敌人配色（绘制时按 type 取色，缺省浓墨）
Object.assign(CONFIG.COLORS, {
  enemies: {
    bone: '#8a857a', fox: '#8c5a34', spider: '#3a3835', jiao: '#2d4a73', frog: '#3f6b4e', turtle: '#4f6a3f',
    kai: '#55595e', rider: '#7a2e2a', shaman: '#2e4a38', nightmare: '#4b3466', miasma: '#8a7a3a', glutton: '#5e3a22',
    yaksha: '#2b2f3a', puppet: '#6a4a2a', baigujing: '#9a958a', zhenmushou: '#3a4636',
    baiguiyexing: '#2a2438', fanjiangdaohai: '#1f4d6b', tongqiangtiebi: '#4d4f52', wanjiebufu: '#7a2a1c',
  },
});
