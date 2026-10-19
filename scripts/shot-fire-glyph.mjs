/**
 * 「火」字修正前后对比图
 * 用法：node scripts/shot-fire-glyph.mjs
 * 产出：docs/火字修正前后对比.png
 *
 * 留档说明：依赖 2026-10-18 前单文件原型暴露的 window.GLYPH_DEMO_DATA / __demo，
 * 新原型（demo/字形弹道原型-火与水/）已改为模块化实现，本脚本仅作生成记录保留。
 */
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = 'file:///' + path.join(root, 'demo', 'glyph-trajectory-demo.html').replace(/\\/g, '/');
const out = path.join(root, 'docs', '火字修正前后对比.png');

const OLD_STROKES = [
  { name: '左点', act: '聚火', pts: [[34, 25], [29, 31], [25, 38]], w: [7, 11, 3] },
  { name: '长撇', act: '左扫', pts: [[52, 13], [45, 32], [34, 54], [22, 74], [15, 86]], w: [7, 9, 2] },
  { name: '右撇', act: '右扫', pts: [[56, 17], [63, 36], [70, 53], [76, 66]], w: [6, 8, 2] },
  { name: '右点', act: '迸溅', pts: [[79, 71], [84, 77], [88, 83]], w: [7, 10, 3] }
];

// 复用本机 Playwright 浏览器缓存；路径随用户名变化，故从 LOCALAPPDATA 推导，
// 也可用 CHROME_PATH 覆盖，缺失时回退给 Playwright 自行解析。
const localChromium = path.join(
  process.env.LOCALAPPDATA || '',
  'ms-playwright', 'chromium-1187', 'chrome-win', 'chrome.exe'
);
const executablePath = process.env.CHROME_PATH
  || (fs.existsSync(localChromium) ? localChromium : undefined);

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));

await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(2200);

const afterAna = await page.locator('#ana').screenshot();
const afterStage = await page.locator('#stage').screenshot();

// 换回旧数据，重绘
await page.evaluate((old) => {
  window.GLYPH_DEMO_DATA.GLYPHS['火'].strokes = old;
  window.__demo.drawAnatomy();
}, OLD_STROKES);
await page.waitForTimeout(500);

const beforeAna = await page.locator('#ana').screenshot();
const beforeStage = await page.locator('#stage').screenshot();

const b64 = (buf) => 'data:image/png;base64,' + buf.toString('base64');

const sheet = await browser.newPage({ viewport: { width: 1240, height: 760 }, deviceScaleFactor: 1 });
await sheet.setContent(`
<div style="background:#0f0d0b;padding:26px;font-family:'PingFang SC','Microsoft YaHei',sans-serif">
  <div style="color:#e9e1d2;font-family:'Songti SC',serif;font-size:20px;letter-spacing:.16em;margin-bottom:4px">「火」字修正前后</div>
  <div style="color:#8e8578;font-size:12px;letter-spacing:.1em;margin-bottom:20px">按 100×100 墨迹框实测字体骨架后重写四笔；弹道逻辑未改，出锋方向仍由笔画推导</div>
  <div style="display:grid;grid-template-columns:300px 300px 1fr;gap:20px;align-items:start">
    <div>
      <div style="color:#c0553f;font-size:12px;letter-spacing:.14em;margin-bottom:8px">修正前</div>
      <img src="${b64(beforeAna)}" style="width:300px;display:block;border:1px solid #2c261f">
      <div style="color:#6f6759;font-size:11px;line-height:1.9;margin-top:10px">
        撇头过重（10），顶点顶成「∧」<br>
        四笔全部尖收，点被写成撇<br>
        右撇朝右下、与右点同向 → 合成一条腿
      </div>
    </div>
    <div>
      <div style="color:#9fb37a;font-size:12px;letter-spacing:.14em;margin-bottom:8px">修正后</div>
      <img src="${b64(afterAna)}" style="width:300px;display:block;border:1px solid #2c261f">
      <div style="color:#6f6759;font-size:11px;line-height:1.9;margin-top:10px">
        点：细起饱收，钝头且不飞白<br>
        长撇上部近竖、下部左扫<br>
        右撇改从右上收到「膝点」，右点再铺捺脚
      </div>
    </div>
    <div>
      <div style="color:#8e8578;font-size:12px;letter-spacing:.14em;margin-bottom:8px">塔身实景（50px）</div>
      <div style="position:relative;width:100%">
        <img src="${b64(beforeStage)}" style="width:100%;display:block;border:1px solid #2c261f">
        <div style="position:absolute;left:6px;top:6px;background:rgba(192,85,63,.92);color:#fff;font-size:10px;padding:2px 7px;letter-spacing:.1em">修正前</div>
      </div>
      <img src="${b64(afterStage)}" style="width:100%;display:block;border:1px solid #2c261f;margin-top:8px">
      <div style="color:#6f6759;font-size:11px;line-height:1.9;margin-top:8px">修正后：50px 下两点仍是钝点，不再退化成「人」</div>
    </div>
  </div>
</div>`);
await sheet.waitForTimeout(300);
await sheet.screenshot({ path: out, fullPage: true });

console.log(errs.length ? 'ERR ' + errs.join(';') : 'no page errors');
console.log('saved ->', out);
await browser.close();
