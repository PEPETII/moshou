// 文档层货币文案安全替换：仅替换明确为货币的 token，保留「金」作为金行塔元素。
import fs from 'fs';
import path from 'path';

const ROOT = 'E:/news-game/moshou';
const FILES = [
  'README.md',
  'docs/ui-design-spec.md',
  'docs/full-balance-spec.md',
  'docs/architecture/refactor-boundaries.md',
  'docs/quality-audit-report.md',
];

function patch(src) {
  let s = src;
  s = s.replace(/金币/g, '墨水');
  s = s.replace(/产金/g, '产墨');
  s = s.replace(/金\/波/g, '墨/波');
  s = s.replace(/(\d+)\s*金/g, '$1墨'); // 数字+金（如 120金 / 220 金）= 货币花费
  s = s.replace(/gold=/g, 'ink=');       // 仅 balance spec 内的货币 gold=
  return s;
}

const changed = [];
for (const f of FILES) {
  const p = path.join(ROOT, f);
  const before = fs.readFileSync(p, 'utf8');
  const after = patch(before);
  if (after !== before) {
    fs.writeFileSync(p, after);
    changed.push(f);
  }
}
console.log('Docs patched:\n' + (changed.join('\n') || '(none)'));
