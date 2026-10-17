const devices = require('./devices');
const { serve, launch, openDevice, touchDrag } = require('./harness');
(async () => {
  const { server, url } = await serve();
  const b = await launch();
  const dev = devices.find(d => d.name === process.argv[2]);
  for (let round = 0; round < 3; round++) {
    const { ctx, page } = await openDevice(b, url, dev);
    await page.evaluate(() => window.gameInstance.startGame('1-1'));
    await page.waitForFunction(() => !window.gameInstance.inkTrailAnimation.active, null, { timeout: 30000 });
    await page.waitForTimeout(800);
    await page.evaluate(() => { window.gameInstance.ink = 900; window.gameInstance.updateUI(); });
    for (const [t, gx, gy] of [['fire', 5, 3], ['fire', 6, 3], ['water', 8, 3]]) {
      const from = await page.evaluate((t) => { const r = document.querySelector(`.tower-select[data-type="${t}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, t);
      const to = await page.evaluate(([gx, gy]) => { const r = document.getElementById('game-canvas').getBoundingClientRect(); const k = r.width / 20; return { x: r.left + (gx + .5) * k, y: r.top + (gy + .5) * k }; }, [gx, gy]);
      await touchDrag(page, from, to);
      await page.waitForTimeout(300);
      console.log(round, t, JSON.stringify(from), JSON.stringify(to), 'towers', await page.evaluate(() => window.gameInstance.towers.length), await page.evaluate(() => (document.querySelector('.toast, #toast, .ink-toast') || {}).textContent));
    }
    await ctx.close();
  }
  await b.close(); server.close();
})();
