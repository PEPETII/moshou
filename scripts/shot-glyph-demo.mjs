/**
 * 字形弹道原型 · 无头截图校验
 * 用法：node scripts/shot-glyph-demo.mjs [输出目录]
 *
 * 留档说明：本脚本对应 2026-10-18 前的单文件原型 glyph-trajectory-demo.html，
 * 该原型已重构为 demo/字形弹道原型-火与水/（自检脚本见其 tools/smoke-test.js）。
 * 此处仅保留当时的截图流程作为记录，路径与按钮 id 不再随新原型维护。
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.argv[2] || path.join(root, 'demo', '_shots');
fs.mkdirSync(outDir, { recursive: true });

const url = 'file:///' + path.join(root, 'demo', 'glyph-trajectory-demo.html').replace(/\\/g, '/');

// 复用本机 Playwright 浏览器缓存：路径随用户名变化，从 LOCALAPPDATA 推导，
// 也可用 CHROME_PATH 直接覆盖；都不成立时交回 Playwright 自行解析。
const localChromium = path.join(
  process.env.LOCALAPPDATA || '',
  'ms-playwright', 'chromium-1187', 'chrome-win', 'chrome.exe'
);
const executablePath = process.env.CHROME_PATH
  || (fs.existsSync(localChromium) ? localChromium : undefined);

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });

const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push('[' + m.type() + '] ' + m.text());
});

await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(outDir, '01-full.png') });

const stage = page.locator('#stage');
await page.waitForTimeout(2600);
await stage.screenshot({ path: path.join(outDir, '02-stage.png') });

// 齐射，抓笔顺动画与弹道
await page.click('#btnVolley');
await page.waitForTimeout(180);
await stage.screenshot({ path: path.join(outDir, '03-volley.png') });
await page.waitForTimeout(220);
await stage.screenshot({ path: path.join(outDir, '04-volley2.png') });

// 切到山，看字形解剖 + 抛投
await page.keyboard.press('3');
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(outDir, '05-shan.png') });

await page.keyboard.press('4');
await page.waitForTimeout(1400);
await page.screenshot({ path: path.join(outDir, '06-gong.png') });

console.log(errors.length ? 'CONSOLE ISSUES:\n' + errors.join('\n') : 'no console errors');
console.log('shots ->', outDir);
await browser.close();
