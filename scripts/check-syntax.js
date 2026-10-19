// 语法检查（P7）：对 js/、scripts/、tests/ 下所有 .js 执行 node --check。
// 起因：P5 中一处多余的「};」让征服模式无法初始化，而单元测试不加载该文件，npm test 未能发现。
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIRS = ["js", "scripts", "tests"];
const IGNORED = new Set(["node_modules", ".git"]);

function collect(directory) {
  const out = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (IGNORED.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) out.push(...collect(full));
    else if (entry.isFile() && entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

const files = DIRS.flatMap((dir) => {
  const full = path.join(ROOT, dir);
  return fs.existsSync(full) ? collect(full) : [];
});

const failures = [];
for (const file of files) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (error) {
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    failures.push(`${rel}\n${String(error.stderr || error.message).trim()}`);
  }
}

if (failures.length) {
  console.error(`[syntax] ${failures.length} 个文件有语法错误：\n\n${failures.join("\n\n")}`);
  process.exit(1);
}
console.log(`[syntax] checked ${files.length} JS files, no syntax errors`);
