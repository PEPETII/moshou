// 校验上架素材是否符合平台规范（截图 / 宣传图 / 录屏）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { OUT } = require('./lib');

const FFMPEG = process.env.FFMPEG_PATH ||
  path.join(process.env.APPDATA || '', 'Python', 'Python314', 'site-packages', 'imageio_ffmpeg', 'binaries', 'ffmpeg-win-x86_64-v7.1.exe');

function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error('不是 PNG: ' + file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

let fail = 0;
const check = (ok, msg) => { console.log((ok ? '  OK  ' : ' FAIL ') + msg); if (!ok) fail++; };

console.log('== 截图 ==');
const shotDir = path.join(OUT, '截图');
const shots = fs.readdirSync(shotDir).filter(f => /\.(png|jpe?g)$/i.test(f)).sort();
check(shots.length >= 3, `数量 ${shots.length} ≥ 3`);
const ratios = [];
for (const f of shots) {
  const file = path.join(shotDir, f);
  const { w, h } = pngSize(file);
  const r = w / h, mb = fs.statSync(file).size / 1048576;
  ratios.push(r.toFixed(4));
  check(r >= 1.6 - 1e-6 && r <= 8 / 3 + 1e-6 && w >= 1280 && h >= 720 && mb <= 4,
    `${f}  ${w}x${h}  比例 ${r.toFixed(3)} (需 1.600~2.667)  ${mb.toFixed(2)}MB (≤4MB)`);
}
check(new Set(ratios).size === 1, `所有截图比例一致: ${[...new Set(ratios)].join(',')}`);

console.log('== 宣传图 ==');
const promoDir = path.join(OUT, '宣传图');
for (const f of fs.readdirSync(promoDir).filter(f => /\.png$/i.test(f))) {
  const { w, h } = pngSize(path.join(promoDir, f));
  check(Math.abs(w / h - 16 / 9) < 0.002, `${f}  ${w}x${h}  比例 ${(w / h).toFixed(4)} (16:9=1.7778)`);
}

console.log('== 录屏 ==');
const vidDir = path.join(OUT, '录屏');
for (const f of fs.readdirSync(vidDir).filter(f => /\.(mp4|mov)$/i.test(f))) {
  let info = '';
  try { execFileSync(FFMPEG, ['-i', path.join(vidDir, f)], { stdio: 'pipe' }); } catch (e) { info = String(e.stderr); }
  const dur = /Duration: (\d+):(\d+):([\d.]+)/.exec(info);
  const sec = dur ? (+dur[1]) * 3600 + (+dur[2]) * 60 + parseFloat(dur[3]) : 0;
  const vs = /Video: (\w+).*?, (\d+)x(\d+)/.exec(info);
  const hasAudio = /Audio:/.test(info);
  check(sec >= 15 && sec <= 1800, `${f} 时长 ${sec.toFixed(1)}s (≥15s，建议 2 分钟内)`);
  check(vs && vs[1] === 'h264', `编码 ${vs && vs[1]} (H.264)`);
  check(vs && Math.min(+vs[2], +vs[3]) >= 540, `分辨率 ${vs && vs[2]}x${vs && vs[3]} (短边≥540)`);
  check(!hasAudio, '无音轨（无人声配音）');
  check(fs.statSync(path.join(vidDir, f)).size < 5 * 1024 ** 3, `体积 ${(fs.statSync(path.join(vidDir, f)).size / 1048576).toFixed(1)}MB (<5GB)`);
}

console.log('== 宣传片 ==');
const trailerDir = path.join(OUT, '宣传片');
if (fs.existsSync(trailerDir)) {
  for (const f of fs.readdirSync(trailerDir).filter(f => /\.(mp4|mov)$/i.test(f))) {
    let info = '';
    try { execFileSync(FFMPEG, ['-i', path.join(trailerDir, f)], { stdio: 'pipe' }); } catch (e) { info = String(e.stderr); }
    const dur = /Duration: (\d+):(\d+):([\d.]+)/.exec(info);
    const sec = dur ? (+dur[1]) * 3600 + (+dur[2]) * 60 + parseFloat(dur[3]) : 0;
    const vs = /Video: (\w+).*?, (\d+)x(\d+)/.exec(info);
    const sz = fs.statSync(path.join(trailerDir, f)).size;
    check(sec >= 15, `${f} 时长 ${sec.toFixed(1)}s (≥15s)`);
    check(vs && ['h264', 'hevc'].includes(vs[1]), `编码 ${vs && vs[1]} (H.264/HEVC)`);
    check(vs && Math.abs(vs[2] / vs[3] - 16 / 9) < 0.002 && +vs[2] >= 1280 && +vs[3] >= 720, `分辨率 ${vs && vs[2]}x${vs && vs[3]} (16:9 且 ≥1280x720)`);
    check(/Audio:/.test(info), '含音轨（背景音乐）');
    check(sz < 5 * 1024 ** 3, `体积 ${(sz / 1048576).toFixed(1)}MB (<5GB)`);
  }
}
console.log(fail ? `\n${fail} 项未通过` : '\n全部通过');
process.exit(fail ? 1 : 0);
