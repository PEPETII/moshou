// 调参：打印战场模拟的击杀位置分布（占路径总长的比例）
const { serve, launch } = require('../store-assets/lib');
(async () => {
  const { server, url } = await serve(); const b = await launch();
  const page = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await page.goto(url + 'scripts/promo-video/stage.html'); await page.evaluate(() => window.promoReady);
  console.log(JSON.stringify(await page.evaluate(() => window.simStats())));
  await b.close(); server.close();
})();
