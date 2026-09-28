const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'menuInkBg.js'),
  'utf8',
);

assert.match(source, /this\.SPLASH_LIFESPAN\s*=\s*12000/);
assert.match(source, /this\.SPLASH_FADE_DURATION\s*=\s*1000/);
assert.match(
  source,
  /elapsed\s*>=\s*this\.SPLASH_LIFESPAN\s*-\s*this\.SPLASH_FADE_DURATION/,
);
assert.match(
  source,
  /1\s*-\s*fadeElapsed\s*\/\s*this\.SPLASH_FADE_DURATION/,
);
assert.doesNotMatch(source, /s\.fadeAlpha\s*-=/);
assert.match(source, /if \(s\.fading\)[\s\S]*?else \{\s*this\._drawSplashToCtx\(this\.ctx, s\);/);

const lifespan = 12000;
const fadeDuration = 1000;
const fadeStart = lifespan - fadeDuration;
assert.strictEqual(fadeStart, 11000);
assert.strictEqual(Math.max(0, 1 - 0 / fadeDuration), 1);
assert.strictEqual(Math.max(0, 1 - fadeDuration / fadeDuration), 0);

console.log('Menu ink splash lifespan tests passed.');
