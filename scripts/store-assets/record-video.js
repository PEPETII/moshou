// 录制实机演示：用真实鼠标拖拽布塔、融合、开波次；CDP screencast 抓帧后用 ffmpeg 转 H.264 MP4
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { serve, launch, OUT } = require('./lib');
const S = require('./scene');

const FFMPEG = process.env.FFMPEG_PATH ||
  path.join(process.env.APPDATA || '', 'Python', 'Python314', 'site-packages', 'imageio_ffmpeg', 'binaries', 'ffmpeg-win-x86_64-v7.1.exe');
const FRAMES = path.join(process.env.FRAMES_DIR || path.join(OUT, '.frames'));
const OUT_FILE = path.join(OUT, '录屏', '墨守成规-实机演示.mp4');
const DSF = 1920 / S.VIEW.width;

(async () => {
  fs.rmSync(FRAMES, { recursive: true, force: true });
  fs.mkdirSync(FRAMES, { recursive: true });
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  const { server, url } = await serve();
  const b = await launch();
  const { ctx, page } = await S.openGame(b, url, { dsf: DSF });
  await S.begin(page, '1-5', 600);

  // 画面里的鼠标指针（水墨色小圆环），便于看清拖拽
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;z-index:99999;width:18px;height:18px;margin:-9px 0 0 -9px;border:2px solid #1c1a17;border-radius:50%;background:rgba(28,26,23,.18);pointer-events:none;left:-50px;top:-50px';
    document.body.appendChild(d);
    document.addEventListener('mousemove', (e) => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; }, true);
    // 保底墨水，演示不因墨水断档
    setInterval(() => { const g = window.gameInstance; if (g.ink < 260) { g.ink = 260; g.updateUI(); } }, 300);
  });

  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    const i = frames.length;
    fs.writeFileSync(path.join(FRAMES, `f${String(i).padStart(6, '0')}.jpg`), Buffer.from(f.data, 'base64'));
    frames.push(f.metadata.timestamp);
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) { /* 页面关闭 */ }
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });

  const mouse = page.mouse;
  const cardPos = (type) => page.evaluate((t) => { const r = document.querySelector(`.tower-select[data-type="${t}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, type);
  const cellPos = (gx, gy) => page.evaluate(([gx, gy]) => { const r = document.getElementById('game-canvas').getBoundingClientRect(); const k = r.width / 960 * 48; return { x: r.left + (gx + 0.5) * k, y: r.top + (gy + 0.5) * k }; }, [gx, gy]);
  const wait = (ms) => page.waitForTimeout(ms);

  async function dragPlace(type, gx, gy) {
    const a = await cardPos(type), c = await cellPos(gx, gy);
    await mouse.move(a.x, a.y, { steps: 8 }); await wait(250);
    await mouse.down(); await wait(120);
    await mouse.move(c.x, c.y, { steps: 26 }); await wait(500);
    await mouse.up(); await wait(450);
  }
  async function dragFuse(from, to) {
    const a = await cellPos(...from), c = await cellPos(...to);
    await mouse.move(a.x, a.y, { steps: 10 }); await wait(250);
    await mouse.down(); await wait(120);
    await mouse.move(c.x, c.y, { steps: 22 }); await wait(400);
    await mouse.up(); await wait(1800);                 // 合字弹窗停留
    const btn = await page.locator('#modal-btn').boundingBox();
    await mouse.move(btn.x + btn.width / 2, btn.y + btn.height / 2, { steps: 12 }); await wait(350);
    await mouse.down(); await mouse.up(); await wait(900);
  }
  async function startWave() {
    const r = await page.locator('#start-wave').boundingBox();
    await mouse.move(r.x + r.width / 2, r.y + r.height / 2, { steps: 14 }); await wait(250);
    await mouse.down(); await mouse.up();
  }
  const waveDone = () => page.waitForFunction(() => !window.gameInstance.waveInProgress, null, { timeout: 90000, polling: 200 });

  // 第 0 秒起即为核心玩法：拖拽布塔 → 开波次
  await dragPlace('fire', 8, 2);
  await dragPlace('thunder', 11, 3);
  await dragPlace('ice', 8, 5);
  await startWave();
  await wait(2500);
  await dragPlace('wind', 11, 6);
  await dragPlace('water', 10, 7);
  await waveDone(); await wait(800);

  // 第二波前：再放一座火塔并融合为「炎」
  await dragPlace('fire', 9, 2);
  await dragFuse([9, 2], [8, 2]);
  await dragPlace('gold', 15, 6);
  await startWave();
  await wait(2500);
  await dragPlace('light', 12, 7);
  await waveDone(); await wait(800);

  // 第三波：融合雷塔，继续推进
  await dragPlace('thunder', 12, 3);
  await dragFuse([12, 3], [11, 3]);
  await startWave();
  await wait(14000);

  await cdp.send('Page.stopScreencast');
  await wait(300);
  await ctx.close(); await b.close(); server.close();

  // 按真实时间戳生成 concat 清单（恒定 30fps 输出）
  const lines = [];
  frames.forEach((ts, i) => {
    const dur = i < frames.length - 1 ? Math.max(0.001, frames[i + 1] - ts) : 1.0;
    lines.push(`file 'f${String(i).padStart(6, '0')}.jpg'`, `duration ${dur.toFixed(4)}`);
  });
  lines.push(`file 'f${String(frames.length - 1).padStart(6, '0')}.jpg'`);
  fs.writeFileSync(path.join(FRAMES, 'list.txt'), lines.join('\n'));
  const total = frames[frames.length - 1] - frames[0];
  console.log(`frames=${frames.length} span=${total.toFixed(1)}s avgfps=${(frames.length / total).toFixed(1)}`);
  execFileSync(FFMPEG, ['-y', '-f', 'concat', '-safe', '0', '-i', path.join(FRAMES, 'list.txt'),
    '-vf', 'fps=30,scale=1920:1080:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
    '-movflags', '+faststart', '-an', OUT_FILE], { stdio: 'inherit' });
  fs.rmSync(FRAMES, { recursive: true, force: true });
  console.log('saved', OUT_FILE, (fs.statSync(OUT_FILE).size / 1048576).toFixed(1) + 'MB');
})();
