// 实机录屏（约 32 秒）：真实鼠标拖卡布塔、点选合字、镜头巡场、首领入场。
// 画面：CDP screencast 抓帧（高清模式，裁出 1920×864 游戏内容区）；声音：游戏自带 WebAudio 引擎（BGM + 音效）同步录制，无人声无字幕。
// 第 0 秒起就是布塔交战，满足「前 5 秒展示核心玩法、持续 ≥10 秒」。
// 用法: node scripts/store-kit/record.js
const fs = require('fs');
const path = require('path');
const { OUT, serve, launch, ffmpeg, mkdir } = require('./lib');
const G = require('./game');

const WORK = mkdir(path.join(OUT, '.work', 'record'));
const OUT_FILE = path.join(mkdir(path.join(OUT, '录屏')), '墨守成规-实机录屏-30s.mp4');

(async () => {
  fs.rmSync(WORK, { recursive: true, force: true }); mkdir(WORK);
  const { server, url } = await serve();
  const b = await launch();
  const { ctx, page } = await G.openGameHD(b, url);
  await G.enterLevel(page, '1-5');
  await G.keepAlive(page, 520);
  await page.evaluate(() => { const g = window.gameInstance; g.ink = 900; });
  await G.place(page, [['fire', 4, 3], ['water', 6, 4], ['thunder', 9, 4]]);
  await G.skipTo(page, 74);               // 首领在第 100 秒出场 → 录制开始后约 20 秒入场
  await page.mouse.click(1400, 240);       // 一次真实点击：解锁音频
  await page.waitForTimeout(5500);        // 让妖潮先涌进画面

  // 画面里的鼠标指针（墨色小圆环），看得清拖拽与点选
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;z-index:99999;width:30px;height:30px;margin:-15px 0 0 -15px;border:3px solid #1c1a17;border-radius:50%;background:rgba(28,26,23,.2);pointer-events:none;left:-50px;top:-50px;transition:transform .08s';
    document.body.appendChild(d);
    document.addEventListener('mousemove', (e) => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; }, true);
    document.addEventListener('mousedown', () => { d.style.transform = 'scale(.7)'; }, true);
    document.addEventListener('mouseup', () => { d.style.transform = ''; }, true);
  });

  // 游戏音频：主总线接到 MediaRecorder
  await page.evaluate(async () => {
    const a = window.InkAudio;
    a.unlock(); await a.resume();
    const dest = a.context.createMediaStreamDestination();
    a.master.connect(dest);
    window.__chunks = [];
    window.__rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 192000 });
    window.__rec.ondataavailable = (e) => { if (e.data.size) window.__chunks.push(e.data); };
  });

  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    fs.writeFileSync(path.join(WORK, `f${String(frames.length).padStart(6, '0')}.jpg`), Buffer.from(f.data, 'base64'));
    frames.push(f.metadata.timestamp);
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) { /* 页面关闭 */ }
  });
  await page.evaluate(() => window.__rec.start(250));
  const tAudio = Date.now() / 1000;
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 94, maxWidth: 2096, maxHeight: 944, everyNthFrame: 1 });

  const m = page.mouse, wait = (ms) => page.waitForTimeout(ms);
  const cardPos = (t) => page.evaluate((t) => { const r = document.querySelector(`.tower-select[data-type="${t}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, t);
  const cellPos = (gx, gy) => page.evaluate(([gx, gy]) => {
    const g = window.gameInstance, r = document.getElementById('game-canvas').getBoundingClientRect(), k = r.width / 960, S = CONFIG.CELL_SIZE;
    return { x: r.left + ((gx + 0.5) * S - g.camera.x) * k, y: r.top + (gy + 0.5) * S * k };
  }, [gx, gy]);
  async function drag(type, gx, gy) {
    const a = await cardPos(type);
    await m.move(a.x, a.y, { steps: 10 }); await wait(160);
    await m.down(); await wait(90);
    const c = await cellPos(gx, gy);
    await m.move(c.x, c.y, { steps: 22 }); await wait(260);
    await m.up(); await wait(380);
  }
  async function click(p) { await m.move(p.x, p.y, { steps: 14 }); await wait(180); await m.down(); await wait(70); await m.up(); }
  const pan = async (dx, ms) => { const n = Math.round(ms / 50); for (let i = 0; i < n; i++) { await page.evaluate((d) => window.gameInstance.camera.scrollBy(d), dx / n); await wait(50); } };

  // 0–8s：拖卡布塔，与妖潮交火
  await drag('wood', 3, 3);
  await drag('gold', 4, 1);
  await drag('fire', 4, 4);
  // 8–12s：点选火塔 → 信息面板「合」→ 火+火 成 炎
  await click(await cellPos(4, 4)); await wait(900);
  const btn = await page.locator('.fusion-btn[data-result="yan"]').boundingBox();
  if (btn) { await click({ x: btn.x + btn.width / 2, y: btn.y + btn.height / 2 }); }
  await wait(1400);
  await m.click(1640, 660, { button: 'right' }); await wait(300);
  // 12–19s：继续补塔，镜头沿路巡场
  await drag('wind', 6, 3);
  await drag('cannon', 7, 4);
  await pan(420, 2200); await wait(600);
  await drag('earth', 11, 4);
  await pan(-420, 1600);
  // 19–32s：首领「百鬼夜行」入场，众塔齐射
  await G.skipTo(page, 100);
  await wait(4500);
  await drag('water', 9, 3);
  await wait(7500);

  await cdp.send('Page.stopScreencast');
  const audioB64 = await page.evaluate(() => new Promise((res) => {
    window.__rec.onstop = async () => {
      const buf = await new Blob(window.__chunks, { type: 'audio/webm' }).arrayBuffer();
      let s = ''; const u8 = new Uint8Array(buf);
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      res(btoa(s));
    };
    window.__rec.stop();
  }));
  fs.writeFileSync(path.join(WORK, 'audio.webm'), Buffer.from(audioB64, 'base64'));
  await ctx.close(); await b.close(); server.close();

  // 按真实时间戳生成恒定 30fps 的画面，再与录到的游戏声音对齐合成
  const lines = [];
  frames.forEach((ts, i) => {
    const dur = i < frames.length - 1 ? Math.max(0.001, frames[i + 1] - ts) : 0.1;
    lines.push(`file 'f${String(i).padStart(6, '0')}.jpg'`, `duration ${dur.toFixed(4)}`);
  });
  lines.push(`file 'f${String(frames.length - 1).padStart(6, '0')}.jpg'`);
  fs.writeFileSync(path.join(WORK, 'list.txt'), lines.join('\n'));
  const span = frames[frames.length - 1] - frames[0];
  const offset = Math.max(0, frames[0] - tAudio);   // 声音比第一帧早开始的秒数
  console.log(`frames=${frames.length} span=${span.toFixed(1)}s avgfps=${(frames.length / span).toFixed(1)} audioOffset=${offset.toFixed(2)}s`);
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', path.join(WORK, 'list.txt'), '-ss', offset.toFixed(3), '-i', path.join(WORK, 'audio.webm'),
    '-vf', 'fps=30,crop=1920:864:88:40,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high',
    '-c:a', 'aac', '-b:a', '192k', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=out:st=' + (span - 1.2).toFixed(2) + ':d=1.2',
    '-shortest', '-movflags', '+faststart', OUT_FILE]);
  console.log('saved', OUT_FILE, (fs.statSync(OUT_FILE).size / 1048576).toFixed(1) + 'MB');
})().catch((e) => { console.error(e); process.exit(1); });
