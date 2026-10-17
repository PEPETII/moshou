const devices = require('./devices');
const { serve, launch, openDevice } = require('./harness');
(async () => {
  const { server, url } = await serve();
  const b = await launch();
  const dev = devices.find(d => d.name === process.argv[2]);
  const { ctx, page } = await openDevice(b, url, dev);
  await page.evaluate(() => window.gameInstance.startGame('1-1'));
  await page.waitForFunction(() => !window.gameInstance.inkTrailAnimation.active, null, { timeout: 30000 });
  await page.waitForTimeout(800);
  console.log(JSON.stringify(await page.evaluate(() => {
    const h = (s) => { const e = document.querySelector(s); return e ? [e.offsetWidth, e.offsetHeight] : null; };
    return { scale: getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'), gc: h('#game-container'), top: h('#top-bar'), area: h('#game-area'), bottom: h('#bottom-bar'), sc: h('#scale-container'), card: h('.tower-select'), cs: getComputedStyle(document.querySelector('#top-bar')).padding, bar: getComputedStyle(document.querySelector('#bottom-bar')).padding };
  })));
  await b.close(); server.close();
})();
