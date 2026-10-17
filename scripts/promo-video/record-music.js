// 用游戏自带的音频引擎（古筝/竹笛/波鼓 BGM + 短音效）按时间表实时录制宣传片配乐。
// 输出 webm(opus)，之后由 build-video.js 转 AAC 并与画面合成。
// 用法: node scripts/promo-video/record-music.js <输出webm路径>
const fs = require('fs');
const path = require('path');
const { serve, launch, ROOT } = require('../store-assets/lib');
const T = require('./timeline');

const OUT = process.argv[2];
if (!OUT) { console.error('用法: node record-music.js <输出webm路径>'); process.exit(1); }

(async () => {
  const { server, url } = await serve();
  const b = await launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await b.newContext()).newPage();
  page.on('pageerror', (e) => console.log('PAGEERR', e.message));
  await page.goto(url + 'scripts/promo-video/audio.html');
  for (const f of ['js/audio.js', 'js/audio-cues.js', 'js/audio-bgm.js']) await page.addScriptTag({ path: path.join(ROOT, f) });

  const base64 = await page.evaluate(async (T) => {
    const audio = window.InkAudio;
    audio.unlock();
    await audio.resume();
    if (!audio.isRunning()) throw new Error('AudioContext 未能运行');
    audio.bgmVolume = 1; audio.sfxVolume = 1; audio.applyGains(true);

    const dest = audio.context.createMediaStreamDestination();
    audio.master.connect(dest);
    const chunks = [];
    const rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 192000 });
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.start(500);

    const t0 = performance.now();
    const at = (t, fn) => setTimeout(fn, Math.max(0, t * 1000 - (performance.now() - t0)));
    audio.bgm.sync();
    for (const s of T.musicScenes) at(s.t, () => audio.bgm.setScene(s.scene, s.theme));
    for (const [t, v] of T.musicIntensity) at(t, () => audio.bgm.setIntensity(v));
    for (const c of T.cues) at(c.t, () => audio.play(c.name, c.opts));

    await new Promise((r) => setTimeout(r, (T.duration + 1.5) * 1000));
    audio.bgm.stop();
    await new Promise((r) => setTimeout(r, 1500));
    const done = new Promise((r) => { rec.onstop = r; });
    rec.stop();
    await done;
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return btoa(bin);
  }, T);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(base64, 'base64'));
  console.log('saved', OUT, (fs.statSync(OUT).size / 1024).toFixed(0) + 'KB');
  await b.close(); server.close();
})();
