// 手机横屏：其余界面巡检（设置、图鉴、征服、自定义、结算弹窗、竖屏提示、离线字体）
// 用法: node scripts/mobile-check/run-screens.js <截图目录> <设备名>   (NOFONT=1 模拟外链字体失败)
const path = require('path');
const devices = require('./devices');
const { serve, launch, openDevice } = require('./harness');

const OUT = process.argv[2];
const dev = devices.find((d) => d.name === process.argv[3]);

async function tapSel(page, sel, wait = 600) {
  const loc = page.locator(sel).first();
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  const b = await loc.boundingBox();
  if (!b) throw new Error('找不到可见元素 ' + sel);
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(wait);
}

// 体检：当前可见内容是否被裁切（元素超出视口且不可滚动到达）
async function overflowReport(page) {
  return page.evaluate(() => {
    const iw = innerWidth, ih = innerHeight; const bad = [];
    const roots = ['#main-menu > div:not(.hidden)', '#modal:not(.hidden) > *', '#tower-info:not(.hidden)', '#conquest-tower-info:not(.hidden)'];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (!el.matches('button, [id$="-container"], .detail-content, .modal-content, #modal > *, .toast, .ink-toast')) continue;
      let hidden = false;
      for (let p = el; p; p = p.parentElement) { if (getComputedStyle(p).display === 'none') { hidden = true; break; } }
      if (hidden) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.right > iw + 2 || r.bottom > ih + 2 || r.left < -2 || r.top < -2) {
        // 在可滚动祖先内则不算
        let scrollable = false;
        for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p); if (/(auto|scroll)/.test(o.overflowX + o.overflowY) && p !== document.body && p !== document.documentElement) { scrollable = true; break; } }
        if (!scrollable) bad.push((el.id ? '#' + el.id : el.className || el.tagName) + ' [' + [r.left, r.top, r.right, r.bottom].map(Math.round) + ']');
      }
    }
    return bad.slice(0, 10);
  });
}

(async () => {
  const { server, url } = await serve();
  const b = await launch();
  const findings = [];
  const { ctx, page, log } = await openDevice(b, url, dev, { blockFonts: process.env.NOFONT === '1' });
  const shot = (n) => page.screenshot({ path: path.join(OUT, `${dev.name}-s-${n}.png`) });
  const step = async (label, fn) => {
    try { await fn(); const o = await overflowReport(page); if (o.length) findings.push(`[${label}] 被裁切: ${o.join(' | ')}`); }
    catch (e) { findings.push(`[${label}] 失败: ${e.message.split('\n')[0]}`); }
  };

  await step('主菜单', () => shot('01-menu'));
  await step('设置', async () => { await tapSel(page, '#btn-settings'); await shot('02-settings'); await tapSel(page, '#back-to-menu-from-settings'); });
  await step('图鉴', async () => {
    await tapSel(page, '#btn-encyclopedia'); await shot('03-dex');
    await tapSel(page, '#btn-tower-encyclopedia', 900); await shot('04-dex-towers');
    await tapSel(page, '#tower-encyclopedia-grid > *', 700); await shot('05-dex-tower-detail');
    await tapSel(page, '#close-tower-detail'); await tapSel(page, '#back-to-encyclopedia-from-towers');
    await tapSel(page, '#btn-enemy-encyclopedia', 900); await shot('06-dex-enemies');
    await tapSel(page, '#enemy-encyclopedia-grid > *', 700); await shot('07-dex-enemy-detail');
    await tapSel(page, '#close-enemy-detail'); await tapSel(page, '#back-to-encyclopedia-from-enemies');
    await tapSel(page, '#btn-fusion-encyclopedia', 900); await shot('08-dex-fusion');
    await tapSel(page, '#fusion-encyclopedia-grid > *', 700); await shot('09-dex-fusion-detail');
    await tapSel(page, '#fusion-detail-panel button'); await tapSel(page, '#back-to-encyclopedia-from-fusion');
    await tapSel(page, '#back-to-menu-from-encyclopedia');
  });
  await step('自定义', async () => { await tapSel(page, '#btn-custom', 900); await shot('10-custom'); await tapSel(page, '#back-to-menu-from-custom'); });
  await step('征服选主题', async () => { await tapSel(page, '#btn-conquest', 900); await shot('11-conquest-theme'); });
  await step('征服选关', async () => { await tapSel(page, '.conquest-theme-card', 900); await shot('12-conquest-levels'); });
  await step('征服战斗', async () => {
    await tapSel(page, '.conquest-level-item', 900);
    await page.waitForTimeout(800);
    await page.evaluate(() => { const g = window.conquestGame; g.ink = 900; g.updateUI(); });
    for (let i = 0; i < 3; i++) await tapSel(page, '#conquest-summon-btn', 350);
    await shot('13-conquest-battle');
    await tapSel(page, '#conquest-wave-btn', 600);
    await page.waitForTimeout(6000);
    await shot('14-conquest-wave');
    const m = await page.evaluate(() => { const r = document.getElementById('conquest-canvas').getBoundingClientRect(); const c = document.getElementById('conquest-side-panel').getBoundingClientRect(); return { scale: getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'), canvas: [r.left, r.top, r.right, r.bottom].map(Math.round), side: [c.left, c.top, c.right, c.bottom].map(Math.round) }; });
    console.log('征服布局', JSON.stringify(m));
    // 点选炮塔
    const tp = await page.evaluate(() => { const g = window.conquestGame; const t = g.towers[0]; const r = document.getElementById('conquest-canvas').getBoundingClientRect(); const k = r.width / g.canvas.width; return { x: r.left + (t.gx + .5) * g.CELL_SIZE * k, y: r.top + (t.gy + .5) * g.CELL_SIZE * k }; });
    await page.touchscreen.tap(tp.x, tp.y); await page.waitForTimeout(600); await shot('15-conquest-towerinfo');
  });
  await step('塔防结算弹窗', async () => {
    await page.evaluate(() => { window.gameInstance.returnToMenu && 0; location.reload(); });
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.gameInstance.startGame('1-1'));
    await page.waitForFunction(() => !window.gameInstance.inkTrailAnimation.active, null, { timeout: 30000 });
    await page.evaluate(() => window.gameInstance.gameOver(true));
    await page.waitForTimeout(1200); await shot('16-victory');
  });
  await step('竖屏提示', async () => {
    await page.setViewportSize({ width: dev.h, height: dev.w }); await page.waitForTimeout(800);
    const tip = await page.evaluate(() => getComputedStyle(document.querySelector('.rotate-tip')).display);
    if (tip === 'none') findings.push('[竖屏提示] 竖屏未显示旋转提示');
    await shot('17-portrait');
    await page.setViewportSize({ width: dev.w, height: dev.h }); await page.waitForTimeout(800);
    await shot('18-back-to-landscape');
  });
  if (log.errors.length || log.failed.length) findings.push(`控制台/请求: ${JSON.stringify(log)}`);
  console.log(`\n===== ${dev.name} 发现 =====\n` + (findings.join('\n') || '无'));
  await ctx.close(); await b.close(); server.close();
})();
