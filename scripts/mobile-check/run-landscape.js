// 横屏回归（P7）：依次运行 P2–P5 的巡检脚本（图鉴、菜单 / 设置 / 选关、战斗布局、弹窗与转场），
// 汇总每个脚本是否有越界、过小按钮、溢出或页面错误。需要本机已安装 Playwright 浏览器。
// 用法: node scripts/mobile-check/run-landscape.js <截图目录> [设备名...]
const { execFileSync } = require('child_process');
const path = require('path');

const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'moshou-landscape');
const devices = process.argv.slice(3);
const PROBES = ['probe-codex.js', 'probe-menu-p3.js', 'probe-battle-p4.js', 'probe-overlay-p5.js'];

// 递归找出报告里的问题字段：非空的 offscreen / out / small / scrollers / errors，或 pageOverflow 为真，
// 以及 P4 / P5 的流程断言（落子数、画布遮挡、按钮流程）
function problems(node, trail = []) {
  if (Array.isArray(node)) return node.flatMap((v, i) => problems(v, trail.concat(i)));
  if (!node || typeof node !== 'object') return [];
  const found = [];
  for (const [k, v] of Object.entries(node)) {
    const here = trail.concat(k).join('.');
    if (['offscreen', 'out', 'small', 'scrollers', 'errors'].includes(k) && Array.isArray(v) && v.length) found.push(`${here}=${JSON.stringify(v)}`);
    else if (k === 'pageOverflow' && v) found.push(here);
    else if (k === 'tdDragPlaced' && v !== 1) found.push(`${here}=${v}`);
    else if (k === 'tdCanvasClear' && v !== 'clear') found.push(`${here}=${JSON.stringify(v)}`);
    else if (['tdCoreVisible', 'backHome', 'tdEnter', 'afterSelect', 'cqAfterSelect'].includes(k) && v !== true) found.push(`${here}=${v}`);
    else if (v && typeof v === 'object') found.push(...problems(v, trail.concat(k)));
  }
  return found;
}

let failed = 0;
for (const probe of PROBES) {
  const dir = path.join(OUT, probe.replace('.js', ''));
  let report;
  try {
    const out = execFileSync(process.execPath, [path.join(__dirname, probe), dir, ...devices],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 15 * 60 * 1000 });
    report = JSON.parse(out.slice(out.indexOf('[')));
  } catch (error) {
    failed++;
    console.log(`✗ ${probe} 运行失败：${String(error.message).split('\n')[0]}`);
    continue;
  }
  const issues = problems(report);
  if (issues.length) failed++;
  console.log(`${issues.length ? '✗' : '✓'} ${probe}（${report.length} 台设备）${issues.length ? '\n    ' + issues.join('\n    ') : ''}`);
}
console.log(`\n截图：${OUT}`);
process.exit(failed ? 1 : 0);
