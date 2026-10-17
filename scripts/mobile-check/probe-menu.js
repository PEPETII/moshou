const path = require('path');
const devices = require('./devices');
const { serve, launch, openDevice } = require('./harness');
const out = process.argv[2];
(async () => {
  const { server, url } = await serve();
  const b = await launch();
  for (const dev of devices) {
    const { ctx, page, log } = await openDevice(b, url, dev);
    const m = await page.evaluate(() => ({ iw: innerWidth, ih: innerHeight, sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, touch: DeviceProfile.isTouch, rot: getComputedStyle(document.querySelector('.rotate-tip')).display }));
    console.log(dev.name, JSON.stringify(m), JSON.stringify(log));
    await page.screenshot({ path: path.join(out, `menu-${dev.name}.png`) });
    await ctx.close();
  }
  await b.close(); server.close();
})();
