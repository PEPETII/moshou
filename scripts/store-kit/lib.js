// 上架素材流水线（store-kit）共用工具：静态服务、Playwright 浏览器、ffmpeg、实机对局操控
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, '上架素材');
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };

// 以项目根为站点根的静态服务（美术合成页在 /scripts/store-kit/art/ 下，可直接引用 /js/ 的游戏模块）
function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); return res.end('not found');
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
  });
}

// 复用本机已装的 Chromium（与 playwright 包版本解耦），可用 CHROME_PATH 覆盖
const CHROME = process.env.CHROME_PATH ||
  path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1187', 'chrome-win', 'chrome.exe');

function launch() {
  return chromium.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu-vsync'] });
}

// 无头浏览器不走系统代理，Google Fonts 会卡住加载。改由本地缓存（fonts/，OFL 授权）应答，产出可复现。
const FONT_FILES = { 'Ma Shan Zheng': 'MaShanZheng.ttf', 'ZCOOL XiaoWei': 'ZCOOLXiaoWei.ttf' };
async function routeFonts(ctx, baseUrl) {
  const css = Object.entries(FONT_FILES).map(([fam, f]) =>
    `@font-face{font-family:'${fam}';font-style:normal;font-weight:400;font-display:block;src:url(${baseUrl}scripts/store-kit/fonts/${f}) format('truetype');}`).join('\n');
  await ctx.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: css }));
  await ctx.route(/fonts\.gstatic\.com/, (r) => r.abort());
}

// 新建上下文：固定视口与像素比，字体走本地
async function newContext(browser, baseUrl, viewport, dsf = 1) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dsf });
  await routeFonts(ctx, baseUrl);
  return ctx;
}

function ffmpeg(args) { execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' }); }

function probe(file) {
  const out = execFileSync(FFPROBE, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]);
  return JSON.parse(String(out));
}

const mkdir = (d) => { fs.mkdirSync(d, { recursive: true }); return d; };
const kb = (f) => (fs.statSync(f).size / 1024).toFixed(0) + 'KB';

module.exports = { ROOT, OUT, serve, launch, newContext, routeFonts, ffmpeg, probe, mkdir, kb };
