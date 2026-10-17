// 合成宣传片：逐帧 JPEG + 录制的配乐 → H.264(MP4) + AAC，响度归一、淡入淡出。
// 用法: node build-video.js <帧目录> <配乐webm> <输出mp4>
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const T = require('./timeline');

const [frames, music, out] = process.argv.slice(2);
if (!frames || !music || !out) { console.error('用法: node build-video.js <帧目录> <配乐webm> <输出mp4>'); process.exit(1); }
const FFMPEG = process.env.FFMPEG_PATH ||
  path.join(process.env.APPDATA || '', 'Python', 'Python314', 'site-packages', 'imageio_ffmpeg', 'binaries', 'ffmpeg-win-x86_64-v7.1.exe');

fs.mkdirSync(path.dirname(out), { recursive: true });
const af = [
  'loudnorm=I=-16:TP=-1.5:LRA=11',
  'afade=t=in:st=0:d=0.8',
  `afade=t=out:st=${T.duration - 3}:d=3`,
  'aresample=48000',
].join(',');

execFileSync(FFMPEG, [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-framerate', String(T.fps), '-i', path.join(frames, 'f%05d.jpg'),
  '-i', music,
  '-t', String(T.duration),
  '-vf', 'scale=in_range=pc:out_range=tv:flags=lanczos,format=yuv420p',
  '-af', af,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-r', String(T.fps),
  '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
  '-c:a', 'aac', '-b:a', '192k', '-ac', '2',
  '-movflags', '+faststart',
  out,
], { stdio: 'inherit' });
console.log('saved', out, (fs.statSync(out).size / 1048576).toFixed(1) + 'MB');
