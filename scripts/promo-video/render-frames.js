// 逐帧渲染宣传片画面。
//   整片:   node render-frames.js <帧目录>
//   抽帧:   node render-frames.js <输出目录> --stills 3,8,14.5   （输出 PNG，用于检查画面）
const fs = require('fs');
const path = require('path');
const { serve, launch } = require('../store-assets/lib');
const T = require('./timeline');

const outDir = process.argv[2];
const stillsArg = process.argv.indexOf('--stills');
const stills = stillsArg > 0 ? process.argv[stillsArg + 1].split(',').map(Number) : null;
if (!outDir) { console.error('用法: node render-frames.js <目录> [--stills t1,t2]'); process.exit(1); }

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const { server, url } = await serve();
  const b = await launch();
  const page = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  page.on('pageerror', (e) => console.log('PAGEERR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  await page.goto(url + 'scripts/promo-video/stage.html');
  await page.evaluate(() => window.promoReady);

  const format = stills ? 'image/png' : 'image/jpeg';
  const grab = (t) => page.evaluate(([t, fmt]) => { window.renderAt(t); return document.getElementById('stage').toDataURL(fmt, 0.95).split(',')[1]; }, [t, format]);

  if (stills) {
    for (const t of stills) {
      fs.writeFileSync(path.join(outDir, `still-${String(t).replace('.', '_')}.png`), Buffer.from(await grab(t), 'base64'));
    }
    console.log('stills ->', outDir);
  } else {
    const total = Math.round(T.duration * T.fps);
    for (let i = 0; i < total; i++) {
      fs.writeFileSync(path.join(outDir, `f${String(i).padStart(5, '0')}.jpg`), Buffer.from(await grab(i / T.fps), 'base64'));
      if (i % 120 === 0) console.log(`frame ${i}/${total}`);
    }
    console.log('frames ->', outDir);
  }
  await b.close(); server.close();
})();
