const devices = require('./devices');
const { serve, launch, openDevice, touchDrag } = require('./harness');
(async () => {
  const { server, url } = await serve();
  const b = await launch();
  const dev = devices.find(d => d.name === process.argv[2]);
  const { ctx, page } = await openDevice(b, url, dev);
  await page.evaluate(() => window.gameInstance.startGame('1-1'));
  await page.waitForFunction(() => !window.gameInstance.inkTrailAnimation.active, null, { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.gameInstance.ink = 900; window.gameInstance.updateUI(); });
  const info = await page.evaluate(() => {
    const out = [];
    for (const t of ['fire', 'water', 'mountain']) {
      const el = document.querySelector(`.tower-select[data-type="${t}"]`); const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2; const top = document.elementFromPoint(x, y);
      out.push({ t, rect: [r.left, r.top, r.right, r.bottom].map(Math.round), top: top && (top.className || top.id || top.tagName), same: el.contains(top) });
    }
    return out;
  });
  console.log(JSON.stringify(info));
  await page.evaluate(() => { window.__ev = []; for (const t of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture']) document.addEventListener(t, e => window.__ev.push(t + ':' + Math.round(e.clientX) + ',' + Math.round(e.clientY)), true); });
  const from = await page.evaluate(() => { const r = document.querySelector('.tower-select[data-type="water"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await touchDrag(page, from, { x: 408, y: 173 });
  console.log((await page.evaluate(() => window.__ev)).join(' ').slice(0, 800));
  console.log('drag state', await page.evaluate(() => JSON.stringify(window.gameInstance.ui.placementDrag)));
  await b.close(); server.close();
})();
