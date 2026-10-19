// 设计令牌检查：统计 css/ 中绕开 tokens.css 的裸色值与像素字号。
// 工单：docs/工单计划/2026-10-19-P1-水墨设计令牌与组件.md
//
// 用法：
//   node scripts/check-tokens.js           只报告，退出码恒为 0（P1–P6 期间）
//   node scripts/check-tokens.js --strict  有违规时退出码 1
//   node scripts/check-tokens.js --ratchet 与 scripts/tokens-baseline.json 比较：任何文件的违规数超过基线、
//                                          或基线外的文件出现违规时退出码 1（只许减少，不许增加；npm test 使用）
//   node scripts/check-tokens.js --write-baseline  用当前结果重写基线（清理旧样式后执行，让棘轮收紧）
//
// 规则：
//   - 色值：#rgb / #rrggbb / #rrggbbaa、rgb()/rgba()/hsl()/hsla() 字面量
//   - 字号：font-size: Npx，以及 font 简写里的 Npx
//   - url(...) 内部（SVG 数据 URI）不计；注释不计
//   - tokens.css 与 ink-texture.css 是令牌来源，整文件豁免
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CSS_DIR = path.join(ROOT, "css");
const EXEMPT = new Set(["css/ink-ui/tokens.css", "css/ink-ui/ink-texture.css"]);

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(\s*\d/g;
const FONT_SIZE_RE = /font-size\s*:\s*[\d.]+px/g;
const FONT_SHORTHAND_RE = /(?:^|[;{\s])font\s*:[^;{}]*?\b[\d.]+px/g;

function collectCss(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectCss(absolutePath));
    else if (entry.isFile() && entry.name.endsWith(".css")) files.push(absolutePath);
  }
  return files;
}

// 去掉注释与 url(...) 内容，但保留换行，以便报告行号
function stripIgnored(source) {
  const blank = (match) => match.replace(/[^\n]/g, " ");
  return source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/url\(\s*(["'])[\s\S]*?\1\s*\)/g, blank)
    .replace(/url\([^)]*\)/g, blank);
}

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

function scan(filePath) {
  const text = stripIgnored(fs.readFileSync(filePath, "utf8"));
  const hits = { color: [], fontSize: [] };
  for (const match of text.matchAll(COLOR_RE)) {
    hits.color.push({ line: lineOf(text, match.index), value: match[0] });
  }
  for (const re of [FONT_SIZE_RE, FONT_SHORTHAND_RE]) {
    for (const match of text.matchAll(re)) {
      hits.fontSize.push({ line: lineOf(text, match.index), value: match[0].trim() });
    }
  }
  return hits;
}

const BASELINE = path.join(__dirname, "tokens-baseline.json");
const strict = process.argv.includes("--strict");
const ratchet = process.argv.includes("--ratchet");
const writeBaseline = process.argv.includes("--write-baseline");
const verbose = process.argv.includes("--verbose");
const rows = [];

for (const absolutePath of collectCss(CSS_DIR)) {
  const relativePath = path.relative(ROOT, absolutePath).split(path.sep).join("/");
  if (EXEMPT.has(relativePath)) continue;
  const hits = scan(absolutePath);
  if (hits.color.length || hits.fontSize.length) rows.push({ path: relativePath, hits });
}

rows.sort((a, b) =>
  (b.hits.color.length + b.hits.fontSize.length) - (a.hits.color.length + a.hits.fontSize.length));

let totalColor = 0;
let totalFont = 0;
for (const { path: file, hits } of rows) {
  totalColor += hits.color.length;
  totalFont += hits.fontSize.length;
  console.log(`${file}  色值 ${hits.color.length}  字号 ${hits.fontSize.length}`);
  if (verbose) {
    for (const hit of [...hits.color, ...hits.fontSize].sort((a, b) => a.line - b.line)) {
      console.log(`    :${hit.line}  ${hit.value}`);
    }
  }
}

const total = totalColor + totalFont;
console.log(
  `\n令牌检查：${rows.length} 个文件，裸色值 ${totalColor} 处，像素字号 ${totalFont} 处` +
  (strict ? "" : "（报告模式，不阻断；加 --verbose 看逐行）")
);

if (writeBaseline) {
  const baseline = {};
  for (const { path: file, hits } of rows) baseline[file] = { color: hits.color.length, fontSize: hits.fontSize.length };
  fs.writeFileSync(BASELINE, JSON.stringify(baseline, null, 2) + "\n");
  console.log(`已写入基线 ${path.relative(ROOT, BASELINE)}`);
}

if (ratchet) {
  const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")) : {};
  const worse = [];
  for (const { path: file, hits } of rows) {
    const base = baseline[file] || { color: 0, fontSize: 0 };
    if (hits.color.length > base.color) worse.push(`${file} 色值 ${base.color} → ${hits.color.length}`);
    if (hits.fontSize.length > base.fontSize) worse.push(`${file} 字号 ${base.fontSize} → ${hits.fontSize.length}`);
  }
  if (worse.length) {
    console.error(`\n[tokens] 违规数超过基线（请改用 tokens.css 中的令牌）：\n  ${worse.join("\n  ")}`);
    process.exit(1);
  }
  console.log("[tokens] 棘轮通过：没有文件超过基线");
}

if (strict && total > 0) process.exit(1);
