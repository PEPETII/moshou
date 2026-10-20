// 宣传片（约 27 秒，1920×1080 H.264 + AAC）：与实机录屏刻意区分——
//   开场：游戏笔刷逐笔写出「火」，两点化作火星飞出（美术动画，取自游戏真实笔画数据）
//   中段：四个主题的关底首领战，实机画面裁为 16:9 电影画幅，镜头跟随首领
//   收尾：宣传主视觉缓缓拉远，标题落定
//   配乐：游戏自带 BGM 引擎按段落实时生成（备战 → 交战渐强 → 结算），无人声无字幕
// 用法: node scripts/store-kit/trailer.js [--skip-clips]
const fs = require('fs');
const path = require('path');
const { OUT, serve, launch, newContext, ffmpeg, mkdir } = require('./lib');
const G = require('./game');
const { BOSS } = require('./scenes');

const WORK = mkdir(path.join(OUT, '.work', 'trailer'));
const OUT_FILE = path.join(mkdir(path.join(OUT, '宣传片')), '墨守成规-宣传片.mp4');
const FPS = 30, CLIP = 5.2, XF = 0.5, END = 5.5;
const CLIPS = ['yexing', 'fanjiang', 'tongqiang', 'wanjie'];
const ENC = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS)];

// 开场动画：逐帧调 art.html 的 renderFrame
async function renderOpener(b, url) {
  const dir = mkdir(path.join(WORK, 'opener'));
  const ctx = await newContext(b, url, { width: 1200, height: 800 });
  const page = await ctx.newPage();
  await page.goto(`${url}scripts/store-kit/art/art.html?scene=opener`);
  await page.waitForFunction(() => document.title === 'ready', null, { timeout: 60000 });
  const dur = await page.evaluate(() => window.ART.duration);
  const n = Math.round(dur * FPS);
  for (let i = 0; i < n; i++) {
    const data = await page.evaluate((t) => window.renderFrame(t), i / FPS);
    fs.writeFileSync(path.join(dir, `o${String(i).padStart(4, '0')}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
  }
  await ctx.close();
  ffmpeg(['-framerate', String(FPS), '-i', path.join(dir, 'o%04d.jpg'), ...ENC, path.join(WORK, 'opener.mp4')]);
  console.log(`  opener ${n} frames`);
  return dur;
}

// 一段实机：布置场景 → 镜头平滑跟随首领 → screencast 抓帧 → 裁成 16:9
async function recordClip(b, url, name) {
  const dir = mkdir(path.join(WORK, name));
  fs.readdirSync(dir).forEach((f) => fs.unlinkSync(path.join(dir, f)));
  const { ctx, page } = await G.openGameHD(b, url);
  await BOSS[name](page);
  await G.focusAction(page, 0.45);
  await page.evaluate(() => {
    window.__follow = setInterval(() => {
      const g = window.gameInstance, boss = g.enemies.find((e) => !e.dead && e.isBoss);
      if (boss) g.camera.scrollBy((boss.x - (g.camera.viewW || 960) * 0.45 - g.camera.targetX) * 0.5);
    }, 200);
  });
  await page.waitForTimeout(600);
  const cdp = await ctx.newCDPSession(page), stamps = [];
  cdp.on('Page.screencastFrame', async (f) => {
    fs.writeFileSync(path.join(dir, `f${String(stamps.length).padStart(5, '0')}.jpg`), Buffer.from(f.data, 'base64'));
    stamps.push(f.metadata.timestamp);
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) { /* 已关闭 */ }
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 94, maxWidth: 2096, maxHeight: 944 });
  await page.waitForTimeout((CLIP + 0.6) * 1000);
  await cdp.send('Page.stopScreencast');
  await ctx.close();
  const lines = [];
  stamps.forEach((ts, i) => {
    lines.push(`file 'f${String(i).padStart(5, '0')}.jpg'`, `duration ${(i < stamps.length - 1 ? Math.max(0.001, stamps[i + 1] - ts) : 0.05).toFixed(4)}`);
  });
  fs.writeFileSync(path.join(dir, 'list.txt'), lines.join('\n'));
  // 帧为 2096×944（高清模式，含视口边距），先裁出游戏内容区 1920×864，再放大到高 1080 居中裁 16:9（去掉两侧塔卡与 HUD）
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'), '-t', String(CLIP),
    '-vf', `fps=${FPS},crop=1920:864:88:40,scale=2400:1080:flags=lanczos,crop=1920:1080:240:0,setsar=1`, ...ENC, path.join(WORK, `${name}.mp4`)]);
  console.log(`  clip ${name} ${stamps.length} frames`);
}

// 收尾：宣传图从 1.08 倍缓缓拉远到原尺寸
function endCard() {
  const src = path.join(OUT, '宣传图', '墨守成规-宣传图-1920x1080.jpg');
  const n = Math.round(END * FPS);
  ffmpeg(['-loop', '1', '-i', src, '-vf',
    `scale=3840:2160:flags=lanczos,zoompan=z='1.08-0.08*on/${n}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=${n}:s=1920x1080:fps=${FPS},setsar=1`,
    '-frames:v', String(n), ...ENC, path.join(WORK, 'end.mp4')]);
}

// 配乐：游戏 BGM 引擎按段落实时生成
async function recordMusic(b, url, total, cuts) {
  const ctx = await newContext(b, url, { width: 400, height: 300 });
  const page = await ctx.newPage();
  await page.goto(`${url}scripts/store-kit/art/audio.html`);
  for (const f of ['js/audio.js', 'js/audio-cues.js', 'js/audio-bgm.js']) await page.addScriptTag({ url: url + f });
  const b64 = await page.evaluate(async ({ total, cuts }) => {
    const a = window.InkAudio;
    a.unlock(); await a.resume();
    a.bgmVolume = 1; a.sfxVolume = 0.8; a.applyGains(true);
    const dest = a.context.createMediaStreamDestination(); a.master.connect(dest);
    const chunks = [], rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 192000 });
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.start(250);
    const t0 = performance.now(), at = (t, fn) => setTimeout(fn, Math.max(0, t * 1000 - (performance.now() - t0)));
    a.bgm.sync && a.bgm.sync();
    a.bgm.setScene('prep', 1);
    at(0.2, () => a.play('place'));
    at(cuts[0], () => { a.bgm.setScene('battle', 1); a.bgm.setIntensity(0.45); a.play('wave'); });
    cuts.slice(1, 4).forEach((t, i) => at(t, () => { a.bgm.setScene('battle', i + 2); a.bgm.setIntensity(0.6 + i * 0.15); a.play('place'); }));
    at(cuts[4], () => { a.bgm.setScene('result', 4); a.play('seal'); });
    await new Promise((r) => setTimeout(r, total * 1000 + 600));
    await new Promise((r) => { rec.onstop = r; rec.stop(); });
    const u8 = new Uint8Array(await new Blob(chunks).arrayBuffer());
    let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  }, { total, cuts });
  fs.writeFileSync(path.join(WORK, 'music.webm'), Buffer.from(b64, 'base64'));
  await ctx.close();
}

(async () => {
  const skipClips = process.argv.includes('--skip-clips');
  const { server, url } = await serve();
  const b = await launch();
  let opener;
  try {
    opener = await renderOpener(b, url);
    if (!skipClips) for (const name of CLIPS) await recordClip(b, url, name);
    endCard();
    // 各段起点（叠化后）：开场 → 四段实机 → 收尾
    const cuts = [opener - XF];
    for (let i = 1; i <= CLIPS.length; i++) cuts.push(cuts[i - 1] + CLIP - XF);
    const total = cuts[CLIPS.length] + END;
    await recordMusic(b, url, total, cuts);
    // 叠化拼接：开场与收尾用淡入淡出，实机之间用水墨感的溶解
    const inputs = ['opener', ...CLIPS, 'end'].flatMap((n) => ['-i', path.join(WORK, `${n}.mp4`)]);
    const durs = [opener, ...CLIPS.map(() => CLIP), END];
    let chain = '', last = '[0:v]', off = 0;
    for (let i = 1; i < durs.length; i++) {
      off += durs[i - 1] - XF;
      const tr = i === 1 || i === durs.length - 1 ? 'fade' : 'dissolve';
      chain += `${last}[${i}:v]xfade=transition=${tr}:duration=${XF}:offset=${off.toFixed(3)}[v${i}];`;
      last = `[v${i}]`;
    }
    chain += `${last}fade=t=in:st=0:d=0.6,fade=t=out:st=${(total - 0.8).toFixed(2)}:d=0.8,format=yuv420p[vout];`;
    chain += `[${durs.length}:a]loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:d=0.4,afade=t=out:st=${(total - 1.6).toFixed(2)}:d=1.6[aout]`;
    ffmpeg([...inputs, '-i', path.join(WORK, 'music.webm'), '-filter_complex', chain, '-map', '[vout]', '-map', '[aout]',
      '-t', total.toFixed(2), '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high', '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', OUT_FILE]);
    console.log(`saved ${OUT_FILE} ${total.toFixed(1)}s ${(fs.statSync(OUT_FILE).size / 1048576).toFixed(1)}MB`);
  } finally { await b.close(); server.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
