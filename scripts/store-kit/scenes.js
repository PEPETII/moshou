// 实机场景布置：截图（capture.js）与宣传片剪辑（trailer.js）共用。
// 每个场景只负责「进关 → 布塔 → 快进到首领入场」，之后截图还是录像由调用方决定。
const G = require('./game');

// 首领战：布塔后快进到首领出场前 20 秒，再等首领入场
function bossBattle(level, bossAt, towers, cols, opts = {}) {
  return async (page) => {
    await G.enterLevel(page, level);
    await G.keepAlive(page);
    const placed = await G.autoPlace(page, towers, cols[0], cols[1], { spacing: opts.spacing || 2, rows: opts.rows });
    console.log('    placed', placed.length, placed.join(' '));
    await G.skipTo(page, bossAt - 20);
    await page.waitForTimeout(20000 + (opts.after || 3000));
  };
}

// 焚卷关底：成对放素材（两格相邻），走游戏自己的融合结算得到 炎、林、焚
async function fusionFinale(page) {
  await G.enterLevel(page, '4-5');
  await G.keepAlive(page);
  console.log('    fused', await page.evaluate(() => {
    const g = window.gameInstance, out = [];
    g.ink = 99999;
    const free = (x, y) => g.canPlaceTower('fire', x, y);
    const pair = (t1, t2, c0, c1) => {
      for (let x = c0; x <= c1; x++) for (const y of [2, 3, 1, 4]) {
        if (!free(x, y)) continue;
        for (const [dx, dy] of [[0, 1], [1, 0], [1, 1], [-1, 1]]) {
          if (!free(x + dx, y + dy)) continue;
          g.placeTower(t1, x, y); g.placeTower(t2, x + dx, y + dy);
          return [g.getTowerAt(x, y), g.getTowerAt(x + dx, y + dy)];
        }
      }
      return null;
    };
    const fuse = (tower, result) => {
      g.fusionCd = 0; g.ink = 99999;
      const r = Fusion.perform(g, tower, Fusion.recipeOf(result));
      out.push(r.ok ? `${result}@${tower.gx},${tower.gy}` : `${result}:${r.reason}`);
      return r.tower;
    };
    let p = pair('fire', 'fire', 5, 9); if (p) fuse(p[0], 'yan');
    p = pair('wood', 'wood', 10, 14); if (p) fuse(p[0], 'lin');
    p = pair('wood', 'wood', 15, 19);
    if (p) {
      const lin = fuse(p[0], 'lin'), x = lin.gx, y = lin.gy;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        if (free(x + dx, y + dy)) { g.placeTower('fire', x + dx, y + dy); fuse(lin, 'fen'); break; }
      }
    }
    p = pair('fire', 'fire', 19, 23); if (p) fuse(p[0], 'yan');
    return out.join(' ');
  }));
  console.log('    placed', (await G.autoPlace(page, ['thunder', 'ice', 'sword', 'water', 'bow'], 4, 22, { spacing: 2, rows: [2, 3] })).join(' '));
  await G.skipTo(page, 100);
  await page.waitForTimeout(23000);
}

const BOSS = {
  yexing: bossBattle('1-5', 100,
    ['fire', 'water', 'thunder', 'ice', 'wood', 'bow', 'sword', 'fire', 'gold', 'wind'], [5, 22]),
  fanjiang: bossBattle('2-5', 110,
    ['ice', 'water', 'wind', 'thunder', 'ice', 'water', 'bow', 'thunder', 'wind', 'fire'], [4, 22], { rows: [2, 3] }),
  tongqiang: bossBattle('3-5', 115,
    ['cannon', 'mountain', 'sword', 'gold', 'earth', 'cannon', 'sword', 'thunder', 'fire', 'mountain'], [5, 22]),
  wanjie: fusionFinale,
};

module.exports = { bossBattle, fusionFinale, BOSS };
