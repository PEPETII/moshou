const devices = require('./devices');
const { serve, launch, openDevice } = require('./harness');
(async () => {
  const { server, url } = await serve();
  const b = await launch();
  const dev = devices.find(d => d.name === process.argv[2]);
  const { ctx, page } = await openDevice(b, url, dev);
  await page.evaluate(() => { document.getElementById('btn-encyclopedia').click(); });
  await page.waitForTimeout(500);
  await page.evaluate(() => { document.getElementById('btn-tower-encyclopedia').click(); });
  await page.waitForTimeout(900);
  console.log(JSON.stringify(await page.evaluate(() => {
    const out = {};
    for (const s of ['#main-menu', '#tower-encyclopedia-container', '#tower-encyclopedia-container .encyclopedia-header', '#tower-encyclopedia-container .encyclopedia-title', '#tower-encyclopedia-container .filter-tabs', '#tower-encyclopedia-grid', '#tower-encyclopedia-grid > *', '#back-to-encyclopedia-from-towers', '#main-menu h1']) {
      const e = document.querySelector(s); if (!e) { out[s] = null; continue; }
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      out[s] = [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height), cs.display, cs.position, cs.maxHeight, cs.overflowY, cs.fontSize];
    }
    return out;
  }), null, 1));
  await b.close(); server.close();
})();
