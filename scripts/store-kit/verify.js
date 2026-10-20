// 上架素材合规校验：逐项对照平台规格（尺寸、比例、格式、大小、编码、时长、透明通道）
// 用法: node scripts/store-kit/verify.js
const fs = require('fs');
const path = require('path');
const { OUT, probe } = require('./lib');

let fail = 0;
const check = (ok, msg) => { console.log((ok ? '  OK   ' : '  FAIL ') + msg); if (!ok) fail++; };
const MB = (f) => fs.statSync(f).size / 1048576;
const list = (dir, re) => (fs.existsSync(path.join(OUT, dir)) ? fs.readdirSync(path.join(OUT, dir)).filter((f) => re.test(f)).sort().map((f) => path.join(OUT, dir, f)) : []);

// 图片尺寸：PNG 读 IHDR，JPG 读 SOF 段
function imgInfo(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(0) === 0x89504e47) return { fmt: 'png', w: b.readUInt32BE(16), h: b.readUInt32BE(20), alpha: [4, 6].includes(b[25]) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i < b.length;) {
      const m = b[i + 1], len = b.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { fmt: 'jpg', h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7), alpha: false };
      i += 2 + len;
    }
  }
  throw new Error('无法识别的图片: ' + file);
}
function vidInfo(file) {
  const p = probe(file), v = p.streams.find((s) => s.codec_type === 'video'), a = p.streams.find((s) => s.codec_type === 'audio');
  return { codec: v.codec_name, w: v.width, h: v.height, dur: parseFloat(p.format.duration), audio: a ? a.codec_name : null };
}
const name = (f) => path.relative(OUT, f);

console.log('== 宣传图（16:9，≥1920×1080，JPG/PNG ≤4MB）==');
for (const f of list('宣传图', /\.(png|jpe?g)$/i)) {
  const i = imgInfo(f);
  check(Math.abs(i.w / i.h - 16 / 9) < 0.002 && i.w >= 1920 && i.h >= 1080 && MB(f) <= 4, `${name(f)} ${i.w}×${i.h} ${MB(f).toFixed(2)}MB`);
}

console.log('== 游戏截图（3–10 张，横图 8:3~8:5，≥1280×720，比例统一，≤4MB）==');
const shots = list('截图', /\.(png|jpe?g)$/i);
check(shots.length >= 3 && shots.length <= 10, `数量 ${shots.length}`);
const ratios = new Set();
for (const f of shots) {
  const i = imgInfo(f), r = i.w / i.h;
  ratios.add(r.toFixed(4));
  check(r >= 1.6 - 1e-6 && r <= 8 / 3 + 1e-6 && i.w >= 1280 && i.h >= 720 && MB(f) <= 4, `${name(f)} ${i.w}×${i.h} 比例 ${r.toFixed(3)} ${MB(f).toFixed(2)}MB`);
}
check(ratios.size === 1, `比例一致：${[...ratios].join(', ')}`);

console.log('== 宣传片（横屏 16:9，≥1280×720，≥15s，H.264/HEVC，<5GB）==');
for (const f of list('宣传片', /\.(mp4|mov)$/i)) {
  const v = vidInfo(f);
  check(['h264', 'hevc'].includes(v.codec), `${name(f)} 编码 ${v.codec}`);
  check(Math.abs(v.w / v.h - 16 / 9) < 0.002 && v.w >= 1280 && v.h >= 720, `分辨率 ${v.w}×${v.h}`);
  check(v.dur >= 15, `时长 ${v.dur.toFixed(1)}s`);
  check(MB(f) < 5120, `大小 ${MB(f).toFixed(1)}MB`);
  console.log(`         音轨：${v.audio || '无'}`);
}

console.log('== 实机录屏（15s–30min，H.264/HEVC，短边 ≥540，宽高比 21:9~9:2，<5GB）==');
for (const f of list('录屏', /\.(mp4|mov)$/i)) {
  const v = vidInfo(f), r = v.w / v.h;
  check(['h264', 'hevc'].includes(v.codec), `${name(f)} 编码 ${v.codec}`);
  check(Math.min(v.w, v.h) >= 540 && r <= 21 / 9 + 1e-6 && r >= 9 / 21 - 1e-6, `分辨率 ${v.w}×${v.h} 比例 ${r.toFixed(3)}`);
  check(v.dur >= 15 && v.dur <= 1800, `时长 ${v.dur.toFixed(1)}s`);
  check(MB(f) < 5120, `大小 ${MB(f).toFixed(1)}MB`);
  console.log(`         音轨：${v.audio || '无'}（游戏自带音乐与音效，无人声）`);
}

console.log('== 游戏 Logo（透明 PNG，宽 ≥1280 或高 ≥720，≤4MB）==');
for (const f of list('Logo', /\.png$/i)) {
  const i = imgInfo(f);
  check(i.alpha && (i.w >= 1280 || i.h >= 720) && MB(f) <= 4, `${name(f)} ${i.w}×${i.h} 透明=${i.alpha} ${MB(f).toFixed(2)}MB`);
}

console.log('== 游戏库壁纸（≥3840×1240，JPG/PNG ≤10MB）==');
for (const f of list('游戏库壁纸', /\.(png|jpe?g)$/i)) {
  const i = imgInfo(f);
  check(i.w >= 3840 && i.h >= 1240 && MB(f) <= 10, `${name(f)} ${i.w}×${i.h} ${MB(f).toFixed(2)}MB`);
}

console.log('== 封面图（横版 ≥460×215、竖版 ≥600×900，JPG/PNG）==');
const covers = list('封面图', /\.(png|jpe?g)$/i);
const h = covers.find((f) => /横版/.test(f)), v = covers.find((f) => /竖版/.test(f));
check(!!h && !!v, '横版、竖版齐全');
if (h) { const i = imgInfo(h); check(i.w >= 460 && i.h >= 215 && i.w > i.h, `${name(h)} ${i.w}×${i.h}`); }
if (v) { const i = imgInfo(v); check(i.w >= 600 && i.h >= 900 && i.h > i.w, `${name(v)} ${i.w}×${i.h}`); }

console.log(fail ? `\n${fail} 项未通过` : '\n全部通过');
process.exit(fail ? 1 : 0);
