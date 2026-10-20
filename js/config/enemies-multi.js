// 双字、三字精英（工单 09）：由多个字组成，每个字单独计血，伤害先打最前面还没碎的字。
//
// segments 的顺序就是受伤的顺序；挂在某个字上的能力，这个字碎掉就失效。hp 由各段相加（glyph-battle.js 推导）。
// abilities 里的距离、半径是原型 px，运行时乘 GLYPH_SCALE；size 是每个字的字号。
// 加载顺序同 enemies-single.js。
Object.assign(CONFIG.ENEMIES, {
  // 夜叉：夜字隐身（靠近塔或被范围伤害命中才显形），叉字周期冲刺
  yaksha: {
    name: '夜叉', tier: 'elite', speedPx: 52, size: 32, weight: 3, damage: 3, reward: 30, mass: 4,
    segments: [
      { char: '夜', hp: 120, abilities: [{ id: 'stealth', revealRadius: 110 }] },
      { char: '叉', hp: 160, abilities: [{ id: 'dash', every: 5, distance: 80, time: 0.3, windup: 0.3 }] },
    ],
  },
  // 傀儡：傀字牵线（儡免疫硬控与击退，周围小怪加速），傀碎后儡变慢、可控
  puppet: {
    name: '傀儡', tier: 'elite', speedPx: 30, size: 36, weight: 4, damage: 4, reward: 45, mass: 4,
    segments: [
      { char: '傀', hp: 150, abilities: [{ id: 'puppeteer', radius: 120, allySpeedMul: 1.2, brokenSpeedMul: 0.75 }] },
      { char: '儡', hp: 380, abilities: [] },
    ],
  },
  // 白骨精：白字化形成尸，骨字碎后可复原一次，精字唤骨
  baigujing: {
    name: '白骨精', tier: 'greater', speedPx: 40, size: 32, weight: 4, damage: 5, reward: 70, mass: 6,
    segments: [
      { char: '白', hp: 160, abilities: [{ id: 'disguise', asChar: '尸', asHp: 40 }] },
      { char: '骨', hp: 220, abilities: [{ id: 'segmentRegrow', delay: 4, hpRatio: 0.5, breakKinds: ['fire', 'thunder', 'yan', 'fen'] }] },
      { char: '精', hp: 260, abilities: [{ id: 'summon', type: 'bone', every: 6, count: 2, max: 12 }] },
    ],
  },
  // 镇墓兽：镇字光环削减小怪受到的控制，墓字碎时开墓召唤，兽字单独存活时狂暴
  zhenmushou: {
    name: '镇墓兽', tier: 'greater', speedPx: 26, size: 38, weight: 5, damage: 6, reward: 90, mass: 6,
    segments: [
      { char: '镇', hp: 300, abilities: [{ id: 'ward', radius: 160, ccMul: 0.5 }] },
      { char: '墓', hp: 300, abilities: [{ id: 'onBreakSummon', list: [{ type: 'corpse', n: 4 }, { type: 'giant', n: 1 }] }] },
      { char: '兽', hp: 500, abilities: [{ id: 'enrage', speedMul: 1.5 }] },
    ],
  },
});
