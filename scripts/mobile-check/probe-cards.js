// 塔卡手势：横滑滚动底栏 / 斜向拖拽放置 / 轻点 / 墨水不足提示；以及战斗中旋转缩放
const devices = require('./devices');
const { serve, launch, openDevice, touchDrag } = require('./harness');
let fail = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : ' FAIL ') + m); if (!c) fail++; };
(async () => {
  const { server, url } = await serve();
  const b = await launch();
  for (const name of ['iphone-se', 'pixel-7']) {
    const dev = devices.find(d => d.name === name);
    const { ctx, page } = await openDevice(b, url, dev);
    console.log('==', name);
    await page.evaluate(() => window.gameInstance.startGame('1-1'));
    await page.waitForFunction(() => !window.gameInstance.inkTrailAnimation.active, null, { timeout: 30000 });
    await page.waitForTimeout(600);
    const card = (t) => page.evaluate((t) => { const r = document.querySelector(`.tower-select[data-type="${t}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, t);
    const cell = (gx, gy) => page.evaluate(([gx, gy]) => { const r = document.getElementById('game-canvas').getBoundingClientRect(); const k = r.width / 20; return { x: r.left + (gx + .5) * k, y: r.top + (gy + .5) * k }; }, [gx, gy]);

    // 1. 横滑底栏
    const s0 = await page.evaluate(() => document.getElementById('bottom-bar').scrollLeft);
    const c = await card('fire');
    await touchDrag(page, c, { x: c.x + 200, y: c.y + 4 }, 10);   // 向右拖 → 内容向右 → scrollLeft 不变(已在 0)
    await touchDrag(page, { x: c.x + 220, y: c.y }, { x: c.x, y: c.y + 3 }, 10); // 向左拖 → scrollLeft 增大
    await page.waitForTimeout(700);
    const s1 = await page.evaluate(() => document.getElementById('bottom-bar').scrollLeft);
    ok(s1 > s0 + 50, `向左横滑后底栏滚动 ${Math.round(s0)} → ${Math.round(s1)}`);
    ok(await page.evaluate(() => window.gameInstance.towers.length) === 0, '横滑没有误放置炮塔');
    await page.evaluate(() => { document.getElementById('bottom-bar').scrollLeft = 0; });

    // 2. 斜向 45° 向右上拖拽放置（旧版会 pointercancel）
    await page.evaluate(() => { window.gameInstance.ink = 900; window.gameInstance.updateUI(); });
    const w = await card('water'); const target = await cell(8, 3);
    await touchDrag(page, w, target);
    await page.waitForTimeout(300);
    ok(await page.evaluate(() => window.gameInstance.towers.length) === 1, '斜向拖拽放置成功');

    // 3. 轻点塔卡不放置、墨水不足时提示
    await page.evaluate(() => { window.gameInstance.ink = 10; window.gameInstance.updateUI(); });
    const cf = await card('fire');
    await page.touchscreen.tap(cf.x, cf.y); await page.waitForTimeout(400);
    ok(await page.evaluate(() => window.gameInstance.towers.length) === 1, '轻点塔卡不放置');
    const toast = await page.evaluate(() => [...document.querySelectorAll('body *')].some(e => /墨水不足/.test(e.textContent) && e.children.length === 0 && getComputedStyle(e).display !== 'none'));
    ok(toast, '墨水不足时出现提示');

    // 4. 战斗中改变视口（旋转/地址栏变化）后缩放仍然合适
    const before = await page.evaluate(() => { const r = document.getElementById('game-canvas').getBoundingClientRect(); return r.width; });
    await page.setViewportSize({ width: dev.w - 80, height: dev.h - 30 }); await page.waitForTimeout(900);
    const after = await page.evaluate(() => { const r = document.getElementById('game-canvas').getBoundingClientRect(); return { w: r.width, right: r.right, bottom: r.bottom, iw: innerWidth, ih: innerHeight }; });
    ok(after.w < before && after.right <= after.iw && after.bottom <= after.ih, `视口缩小后重新缩放 ${Math.round(before)} → ${Math.round(after.w)}px 且完整可见`);
    await ctx.close();
  }
  console.log(fail ? `\n${fail} 项失败` : '\n全部通过');
  await b.close(); server.close(); process.exit(fail ? 1 : 0);
})();
