const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MAX_LINES = 600;
const ALLOWED_EXTENSIONS = new Set([".html", ".css", ".js"]);
const IGNORED_DIRECTORIES = new Set([".git", "node_modules", "dist", "build"]);

function collectFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(absolutePath));
      continue;
    }

    if (entry.isFile() && ALLOWED_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }

  return files;
}

function countLines(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  if (content.length === 0) {
    return 0;
  }

  const lines = content.split(/\r?\n/);
  return content.endsWith("\n") ? lines.length - 1 : lines.length;
}

const results = collectFiles(ROOT).map((absolutePath) => {
  const relativePath = path.relative(ROOT, absolutePath).split(path.sep).join("/");
  return { path: relativePath, lineCount: countLines(absolutePath) };
});

const violations = results.filter(({ lineCount }) => lineCount > MAX_LINES);
const largest = results.reduce(
  (current, item) => (item.lineCount > current.lineCount ? item : current),
  { path: "", lineCount: 0 }
);

console.log(
  `[line-count] checked ${results.length} HTML/CSS/JS files; largest ${largest.lineCount} lines (${largest.path})`
);

if (violations.length > 0) {
  console.error(
    violations
      .sort((left, right) => right.lineCount - left.lineCount)
      .map(({ path: filePath, lineCount }) => `[line-count] ${filePath}: ${lineCount} > ${MAX_LINES}`)
      .join("\n")
  );
  process.exitCode = 1;
}
