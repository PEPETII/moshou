// 渲染上架美术图：宣传图、壁纸、横竖封面、Logo、宣传片标题卡
// 用法: node scripts/store-kit/render-art.js [scene...]   不带参数则渲染全部
const fs = require('fs');
const path = require('path');
const { OUT, serve, launch, newContext, mkdir, kb } = require('./lib');

// scene → 输出文件（相对 上架素材/）与格式
const TARGETS = {
  promo: ['宣传图/墨守成规-宣传图-1920x1080.jpg', 'jpg'],
  wallpaper: ['游戏库壁纸/墨守成规-壁纸-3840x1240.jpg', 'jpg'],
  coverH: ['封面图/墨守成规-横版封面-920x430.jpg', 'jpg'],
  coverV: ['封面图/墨守成规-竖版封面-1200x1800.jpg', 'jpg'],
  logo: ['Logo/墨守成规-Logo-浅色.png', 'png'],
  logoDark: ['Logo/墨守成规-Logo-深色.png', 'png'],
  trailerOpen: ['.work/trailer-open.png', 'png'],
  trailerEnd: ['.work/trailer-end.png', 'png'],
};

(async () => {
  const only = process.argv.slice(2);
  const names = only.length ? only : Object.keys(TARGETS);
  const { server, url } = await serve();
  const b = await launch();
  try {
    for (const name of names) {
      const [rel, fmt] = TARGETS[name] || [`.work/${name}.png`, 'png'];
      const ctx = await newContext(b, url, { width: 1200, height: 800 });
      const page = await ctx.newPage();
      page.on('console', (m) => m.type() === 'error' && console.log('  console:', m.text()));
      page.on('pageerror', (e) => console.log('  pageerror:', e.message));
      const t0 = Date.now();
      await page.goto(`${url}scripts/store-kit/art/art.html?scene=${name}&fmt=${fmt}`);
      await page.waitForFunction(() => document.title !== 'store-kit art', null, { timeout: 120000 });
      const title = await page.title();
      if (title !== 'ready') throw new Error(`${name}: ${title}`);
      const art = await page.evaluate(() => window.ART);
      const file = path.join(OUT, rel);
      mkdir(path.dirname(file));
      fs.writeFileSync(file, Buffer.from(art.dataUrl.split(',')[1], 'base64'));
      console.log(`  ${name} → ${rel}  ${art.w}x${art.h}  ${kb(file)}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      await ctx.close();
    }
  } finally {
    await b.close(); server.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
