// 手机横屏全流程巡检：触摸操作 + 每屏体检（可点区域、溢出、字号）
// 用法: node scripts/mobile-check/run-flow.js <截图输出目录> [设备名]
const path = require('path');
const devices = require('./devices');
const { serve, launch, openDevice, touchDrag } = require('./harness');

const OUT = process.argv[2];
const ONLY = process.argv[3];

// 当前画面体检
async function audit(page, label, findings, dev) {
  const r = await page.evaluate(() => {
    const iw = innerWidth, ih = innerHeight;
    const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-scale')) || 1;
    const vis = (el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ps = getComputedStyle(p);
        if (ps.display === 'none' || ps.visibility === 'hidden') return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const desc = (el) => (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '') + ' "' + (el.textContent || '').trim().slice(0, 8) + '"';
    const small = [], offscreen = [], tiny = [];
    document.querySelectorAll('button, .tower-select, input[type=range], [role=button]').forEach((el) => {
      if (!vis(el)) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > ih || r.right < 0 || r.left > iw) return;   // 滚动区域之外的不算
      if (Math.min(r.width, r.height) < 38) small.push(desc(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      if (r.left < -1 || r.top < -1 || r.right > iw + 1 || r.bottom > ih + 1) offscreen.push(desc(el) + ' [' + Math.round(r.left) + ',' + Math.round(r.top) + ',' + Math.round(r.right) + ',' + Math.round(r.bottom) + ']');
    });
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    for (let n; (n = w.nextNode());) {
      const t = n.textContent.trim(); const el = n.parentElement;
      if (!t || !el || seen.has(el) || !vis(el) || ['SCRIPT', 'STYLE'].includes(el.tagName)) continue;
      seen.add(el);
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > ih || r.right < 0 || r.left > iw) continue;
      const inScaled = !!el.closest('#scale-container');
      const eff = parseFloat(getComputedStyle(el).fontSize) * (inScaled ? scale : 1);
      if (eff < 9.5) tiny.push(desc(el) + ' ' + eff.toFixed(1) + 'px');
    }
    return { scale, iw, ih, hscroll: document.documentElement.scrollWidth - iw, vscroll: document.documentElement.scrollHeight - ih, small, offscreen, tiny };
  });
  const add = (k, v) => { if (v && (!Array.isArray(v) || v.length)) findings.push(`[${dev.name}] ${label}: ${k} ${Array.isArray(v) ? v.slice(0, +(process.env.MAXN || 8)).join(' | ') + (v.length > +(process.env.MAXN || 8) ? ' …+' + (v.length - +(process.env.MAXN || 8)) : '') : v}`); };
  add('可点区域<38px', r.small);
  add('超出视口', r.offscreen);
  add('字号<9.5px', r.tiny);
  if (r.hscroll > 1) add('横向可滚动溢出', r.hscroll + 'px');
  if (r.vscroll > 1) add('纵向可滚动溢出', r.vscroll + 'px');
  return r;
}

async function tapSel(page, sel) {
  const loc = page.locator(sel).first();
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  const b = await loc.boundingBox();
  if (!b) throw new Error('找不到可见元素 ' + sel);
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(500);
}

const cellPos = (page, id, cols, gx, gy) => page.evaluate(([id, cols, gx, gy]) => {
  const r = document.getElementById(id).getBoundingClientRect(); const k = r.width / cols;
  return { x: r.left + (gx + 0.5) * k, y: r.top + (gy + 0.5) * k };
}, [id, cols, gx, gy]);
const cardPos = (page, t) => page.evaluate((t) => { const r = document.querySelector(`.tower-select[data-type="${t}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, t);

(async () => {
  const { server, url } = await serve();
  const b = await launch();
  const findings = [];
  for (const dev of devices.filter((d) => !ONLY || d.name === ONLY)) {
    const shot = (page, n) => page.screenshot({ path: path.join(OUT, `${dev.name}-${n}.png`) });
    const { ctx, page, log } = await openDevice(b, url, dev, { blockFonts: process.env.NOFONT === '1' });
    try {
      await audit(page, '主菜单', findings, dev);
      await tapSel(page, '#btn-levels'); await page.waitForTimeout(800);
      await shot(page, '2-themes'); await audit(page, '主题选择', findings, dev);
      await tapSel(page, '#td-theme-shelf .scroll-theme'); await page.waitForTimeout(900);
      await shot(page, '3-levels'); await audit(page, '关卡列表', findings, dev);
      await tapSel(page, '#enter-level');
      await tapSel(page, '#density-picker-ok', 600);   // 字形弹道：开局前的敌潮选择，默认「潮」
      await page.waitForFunction(() => { const g = window.gameInstance; return g && g.gameStarted && g.inkTrailAnimation && !g.inkTrailAnimation.active; }, null, { timeout: 30000 });
      await page.waitForTimeout(800);
      await shot(page, '4-battle'); const a = await audit(page, '战斗(开局)', findings, dev);
      const cv = await page.evaluate(() => { const r = document.getElementById('game-canvas').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); });
      console.log(`${dev.name} scale=${a.scale.toFixed(3)} canvas=${cv.join(',')} viewport=${a.iw}x${a.ih} 格子≈${((cv[2] - cv[0]) / (960 / 72)).toFixed(1)}px`);

      // 触摸拖拽放置炮塔：火 → (5,3)、水 → (7,3)
      await page.evaluate(() => { window.gameInstance.ink = 900; window.gameInstance.updateUI(); });
      for (const [t, gx, gy] of [['fire', 5, 3], ['fire', 6, 3], ['water', 8, 3]]) {
        await touchDrag(page, await cardPos(page, t), await cellPos(page, 'game-canvas', 960 / 72, gx, gy));
        await page.waitForTimeout(300);
      }
      const placed = await page.evaluate(() => window.gameInstance.towers.length);
      if (placed !== 3) findings.push(`[${dev.name}] 触摸拖拽放塔：期望 3 座，实际 ${placed}`);
      await shot(page, '5-placed');

      // 点选炮塔看信息面板
      const tp = await cellPos(page, 'game-canvas', 960 / 72, 8, 3);
      await page.touchscreen.tap(tp.x, tp.y); await page.waitForTimeout(500);
      await shot(page, '6-towerinfo'); await audit(page, '炮塔信息面板', findings, dev);
      await page.touchscreen.tap(tp.x, 5); await page.waitForTimeout(300);

      // 触摸拖拽到另一座塔上：应被拒绝（不弹任何确认框，塔留在原位）
      await touchDrag(page, await cellPos(page, 'game-canvas', 960 / 72, 5, 3), await cellPos(page, 'game-canvas', 960 / 72, 6, 3));
      await page.waitForTimeout(900);
      const modalOpen = await page.evaluate(() => !document.getElementById('modal').classList.contains('hidden'));
      if (modalOpen) findings.push(`[${dev.name}] 触摸拖塔叠放不应弹出弹窗`);
      await shot(page, '7-drag-reject');

      // 连续刷怪：开局后应有敌人在路上、坚守倒计时在走（旧的「开始波次」按钮已删除）
      await page.waitForTimeout(7000);
      await shot(page, '8-wave'); await audit(page, '战斗(连续刷怪中)', findings, dev);
      const active = await page.evaluate(() => { const g = window.gameInstance; return g.battleActive && g.enemies.length > 0 && g.holdLeft < g.holdTotal; });
      if (!active) findings.push(`[${dev.name}] 开局后未见连续刷怪或坚守计时`);
    } catch (e) {
      findings.push(`[${dev.name}] 流程中断: ${e.message.split('\n')[0]}`);
      await shot(page, 'zz-error').catch(() => {});
    }
    if (log.errors.length || log.failed.length) findings.push(`[${dev.name}] 控制台/请求: ${JSON.stringify(log)}`);
    await ctx.close();
  }
  console.log('\n===== 发现 =====\n' + (findings.join('\n') || '无'));
  await b.close(); server.close();
})();
