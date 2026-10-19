// 【过时提示】本脚本按字形弹道重构（2026-10-19）之前的玩法编写（多塔种、融合、48px 网格、手动开波次），
// 未随重构更新，当前不保证可运行；需要时请参照 docs/完成报告/2026-10-19-字形弹道玩法引入-总报告.md 的后续工作重写。
// 中低端手机性能粗测：CPU 4 倍降速下，重战斗场景的帧率
const devices = require('./devices');
const { serve, launch, openDevice } = require('./harness');
(async () => {
  const { server, url } = await serve();
  const b = await launch();
  const dev = devices.find(d => d.name === (process.argv[2] || 'iphone-14'));
  const rate = +(process.argv[3] || 4);
  const { ctx, page } = await openDevice(b, url, dev);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await page.evaluate(() => window.gameInstance.startGame('1-10'));
  await page.waitForFunction(() => !window.gameInstance.inkTrailAnimation.active, null, { timeout: 60000 });
  await page.evaluate(() => {
    const g = window.gameInstance; g.ink = 9999;
    const spots = [['fire',7,3],['fire',8,3],['ice',7,6],['ice',8,6],['thunder',12,3],['thunder',12,4],['wind',12,6],['water',11,7],['light',16,3],['gold',16,5],['dark',6,7],['mountain',10,4],['earth',8,7],['wood',3,2],['poison',3,6],['star',4,2]];
    spots.forEach(([t,x,y]) => g.placeTower(t,x,y));
    g.wave = 4; g.startWave();
  });
  const res = await page.evaluate(() => new Promise((resolve) => {
    const frames = []; let last = performance.now(); const start = last;
    const tick = (now) => { frames.push(now - last); last = now; if (now - start < 10000) requestAnimationFrame(tick); else resolve({ n: frames.length, avg: frames.reduce((a, b) => a + b, 0) / frames.length, p95: frames.slice().sort((a, b) => a - b)[Math.floor(frames.length * .95)], over50: frames.filter(f => f > 50).length, enemies: window.gameInstance.enemies.length }); };
    requestAnimationFrame(tick);
  }));
  console.log(dev.name, 'CPU x' + rate, 'fps≈' + (1000 / res.avg).toFixed(1), JSON.stringify(res));
  await b.close(); server.close();
})();
