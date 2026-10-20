// 四字首领（工单 10）：每个大关卡的关底各一个，四个字对应四种能力，逐字破阵。
//
// hp 按潮档计，实际血量乘 CONFIG.BOSS.hpMulByDensity（见 boss-battle.js），且不吃关卡 hpMul。
// 控制按 CONFIG.CONTROL.tiers.boss：不卷入、不吸入、免疫击退与硬控（改为累积震慑）。
// 加载顺序同 enemies-single.js。
Object.assign(CONFIG.ENEMIES, {
  // 百鬼夜行（初墨·1-5）：召唤、浮空、夜幕、只剩行字时加速
  baiguiyexing: {
    name: '百鬼夜行', tier: 'boss', speedPx: 24, size: 44, weight: 6, damage: 5, reward: 200,
    segments: [
      { char: '百', hp: 900, abilities: [{ id: 'summon', type: 'ghost', every: 8, count: 4, max: 40, windup: 0.8, label: '百鬼' }] },
      { char: '鬼', hp: 900, abilities: [{ id: 'levitate', every: 10, duration: 2.5, windup: 0.8, label: '鬼浮' }] },
      { char: '夜', hp: 900, abilities: [{ id: 'nightfall', every: 20, duration: 6, rangeMul: 0.85, dim: 0.15, windup: 0.8, label: '夜幕' }] },
      { char: '行', hp: 1300, abilities: [{ id: 'hasten', speedMul: 1.4, label: '夜行' }] },
    ],
  },
  // 翻江倒海（墨泽·2-5）：掀浪推小怪、水系减半且不湿身、清除减益、回血
  fanjiangdaohai: {
    name: '翻江倒海', tier: 'boss', speedPx: 22, size: 46, weight: 6, damage: 5, reward: 300,
    segments: [
      { char: '翻', hp: 1400, abilities: [{ id: 'surgeAllies', every: 12, front: 150, push: 80, windup: 0.8, label: '掀浪' }] },
      { char: '江', hp: 1400, abilities: [{ id: 'riverBody', waterMul: 0.5, label: '江身' }] },
      { char: '倒', hp: 1400, abilities: [{ id: 'cleanse', every: 15, immuneSlow: 2, windup: 0.8, label: '倒流' }] },
      { char: '海', hp: 2300, abilities: [{ id: 'regen', ratio: 0.015, burnMul: 0.5, label: '海量' }] },
    ],
  },
  // 铜墙铁壁（铁砚·3-5）：硬甲、身后弹道减半、破甲时长减半且硬甲更厚、周期护盾
  tongqiangtiebi: {
    name: '铜墙铁壁', tier: 'boss', speedPx: 18, size: 48, weight: 6, damage: 6, reward: 400,
    segments: [
      { char: '铜', hp: 2000, abilities: [{ id: 'plating', flat: 6, dotFlat: 3, label: '铜皮' }] },
      { char: '墙', hp: 2200, abilities: [{ id: 'rearGuard', range: 150, projectileMul: 0.5, label: '筑墙' }] },
      { char: '铁', hp: 2000, abilities: [{ id: 'ironBones', exposeTimeMul: 0.5, flat: 8, label: '铁骨' }] },
      { char: '壁', hp: 3300, abilities: [{ id: 'shield', every: 10, amount: 400, exposeLoss: 0.5, windup: 0.8, label: '壁垒' }] },
    ],
  },
  // 万劫不复（焚卷·4-5）：召唤轮换、天劫封笔、不动、复生
  wanjiebufu: {
    name: '万劫不复', tier: 'boss', speedPx: 20, size: 50, weight: 6, damage: 6, reward: 600,
    segments: [
      { char: '万', hp: 3000, abilities: [{ id: 'summonPool', pool: ['bone', 'fox', 'rider', 'shaman', 'glutton'], every: 10, max: 15, label: '万象' }] },
      { char: '劫', hp: 3000, abilities: [{ id: 'sealTowers', every: 14, radius: 260, count: [1, 2], duration: 2.5, windup: 0.8, repeatLock: 12, maxSealed: 2, label: '天劫' }] },
      { char: '不', hp: 3000, abilities: [{ id: 'unshakable', staggerMul: 0.5, label: '不动' }] },
      { char: '复', hp: 5000, abilities: [{ id: 'rebirth', delay: 3, hpRatio: 0.35, speedMul: 1.2, label: '复生' }] },
    ],
  },
});
