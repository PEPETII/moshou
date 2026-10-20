// 音频系统回归测试：用假的 AudioContext 在 Node 中加载 audio*.js，不需要浏览器。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', 'js');
const FILES = ['audio.js', 'audio-cues.js', 'audio-bgm.js', 'audio-director.js'];

class FakeParam {
  constructor() { this.value = 0; }
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
  setTargetAtTime() {}
  cancelScheduledValues() {}
}

class FakeNode {
  constructor() {
    this.gain = new FakeParam();
    this.frequency = new FakeParam();
    this.Q = new FakeParam();
    this.playbackRate = new FakeParam();
    this.threshold = new FakeParam();
    this.knee = new FakeParam();
    this.ratio = new FakeParam();
    this.attack = new FakeParam();
    this.release = new FakeParam();
  }
  connect() {}
  disconnect() {}
  start() {}
  stop() {}
}

class FakeAudioContext {
  constructor() {
    this.state = 'suspended';
    this.currentTime = 0;
    this.sampleRate = 8000; // 低采样率让 Karplus-Strong 缓冲足够小
    this.destination = new FakeNode();
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  createGain() { return new FakeNode(); }
  createOscillator() { return new FakeNode(); }
  createBufferSource() { return new FakeNode(); }
  createBiquadFilter() { return new FakeNode(); }
  createConvolver() { return new FakeNode(); }
  createDynamicsCompressor() { return new FakeNode(); }
  createBuffer(channels, length) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { length, getChannelData: (i) => data[i] };
  }
}

// 可复现的伪随机数，避免概率性断言偶发失败。
function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

// hidden: { 元素 id: 是否带 hidden 类 }；未列出的 id 视为不存在。
function createWorld({ supported = true, storage = {}, hidden = {} } = {}) {
  const listeners = {};
  const doc = {
    hidden: false,
    querySelectorAll: () => [],
    addEventListener: (name, handler) => { (listeners[name] = listeners[name] || []).push(handler); },
    removeEventListener() {},
    getElementById: (id) => (id in hidden
      ? { classList: { contains: (cls) => cls === 'hidden' && hidden[id] === true } }
      : null)
  };
  const intervals = [];
  const store = { ...storage };
  const sandbox = {
    console,
    Math: Object.create(Math, { random: { value: seededRandom(12345) } }),
    Date,
    Promise,
    Float32Array,
    Number,
    String,
    Set,
    Map,
    Object,
    Array,
    document: doc,
    localStorage: {
      getItem: (key) => (key in store ? store[key] : null),
      setItem: (key, value) => { store[key] = String(value); }
    },
    setInterval: (fn) => { intervals.push(fn); return intervals.length; },
    clearInterval: () => {}
  };
  if (supported) sandbox.AudioContext = FakeAudioContext;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const file of FILES) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
  }
  return { sandbox, audio: sandbox.InkAudio, store, listeners, doc, intervals };
}

function advance(world, seconds) {
  world.audio.context.currentTime += seconds;
}

(async () => {
  // 1. 注册的音效、系别与体型映射
  {
    const { audio } = createWorld();
    const expected = ['attack', 'death', 'place', 'wave', 'core',
      'uiTap', 'sell', 'deny', 'waveClear', 'victory', 'defeat'];
    for (const name of expected) assert.ok(audio.cues[name], `缺少音效 ${name}`);
    assert.strictEqual(audio.familyOf({ type: 'fire' }), 'fire');
    assert.strictEqual(audio.familyOf({ type: 'water' }), 'water');
    assert.strictEqual(audio.familyOf({ type: 'earth' }), 'thud');
    assert.strictEqual(audio.familyOf({ type: 'wood' }), 'wind');
    assert.strictEqual(audio.familyOf({ type: 'ice' }), 'water');
    assert.strictEqual(audio.familyOf({ type: 'fen' }), 'fire');
    assert.strictEqual(audio.familyOf({ type: 'unknown' }), 'metal');
    assert.strictEqual(audio.deathVariantOf({ type: 'overlord', maxHp: 10 }), 'boss');
    assert.strictEqual(audio.deathVariantOf({ type: 'giant', maxHp: 80 }), 'large');
    assert.strictEqual(audio.deathVariantOf({ type: 'corpse', maxHp: 6 }), 'small');
  }

  // 2. 设置持久化、音量夹取与重新加载
  {
    const world = createWorld();
    world.audio.setEnabled(false);
    world.audio.setMusicEnabled(false);
    assert.strictEqual(world.audio.setVolume('bgm', 3), 1);
    assert.strictEqual(world.audio.setVolume('sfx', -2), 0);
    assert.strictEqual(world.store['moshou-sound-enabled'], '0');
    assert.strictEqual(world.store['moshou-bgm-enabled'], '0');
    const reloaded = createWorld({ storage: world.store }).audio;
    assert.strictEqual(reloaded.enabled, false);
    assert.strictEqual(reloaded.musicEnabled, false);
    assert.strictEqual(reloaded.bgmVolume, 1);
    assert.strictEqual(reloaded.sfxVolume, 0);
  }

  // 3. 不支持 Web Audio 时静默且不抛错
  {
    const { audio } = createWorld({ supported: false });
    assert.strictEqual(audio.supported, false);
    assert.strictEqual(audio.play('place'), false);
    assert.strictEqual(audio.unlock(), false);
    assert.strictEqual(audio.setEnabled(true), false);
    assert.strictEqual(audio.setMusicEnabled(true), false);
    audio.bgm.sync();
    assert.strictEqual(audio.bgm.running, false);
  }

  // 4. 冷却、分系别节流、同时发声上限
  {
    const world = createWorld();
    const { audio } = world;
    audio.unlock();
    await audio.resume();
    assert.strictEqual(audio.play('uiTap'), true);
    assert.strictEqual(audio.play('uiTap'), false, '同一音效应被冷却');
    audio.lastPlayed = Object.create(null);
    assert.strictEqual(audio.play('attack', { family: 'fire' }), true);
    assert.strictEqual(audio.play('attack', { family: 'water' }), false, '攻击组间隔内应被限制');
    audio.lastPlayed = Object.create(null);
    audio.voices = 26;
    assert.strictEqual(audio.play('attack', { family: 'fire' }), false, '发声过多时低优先级被丢弃');
    assert.strictEqual(audio.play('victory'), true, '高优先级不受发声上限影响');
    audio.setEnabled(false);
    audio.lastPlayed = Object.create(null);
    assert.strictEqual(audio.play('place'), false, '音效关闭后不发声');
  }

  // 5. BGM：解锁后启动、调度出声部、场景与主题切换、开关停止
  {
    const world = createWorld();
    const { audio } = world;
    const bgm = audio.bgm;
    audio.unlock();
    await audio.resume();
    bgm.sync();
    assert.strictEqual(bgm.running, true);

    for (let i = 0; i < 80; i++) { advance(world, 0.3); bgm.tick(); }
    assert.ok(bgm.stats.notes > 10, '菜单场景应调度古筝音符');
    assert.ok(bgm.stats.flutes > 0, '菜单场景应出现竹笛');
    assert.strictEqual(bgm.stats.drums, 0, '菜单场景没有鼓');

    bgm.setScene('battle', 3);
    bgm.setIntensity(1);
    assert.strictEqual(bgm.scene, 'battle');
    assert.strictEqual(bgm.themeId, 3);
    const before = bgm.stats.drums;
    for (let i = 0; i < 80; i++) { advance(world, 0.3); bgm.tick(); }
    assert.ok(bgm.stats.drums > before, '战斗场景应出现鼓点');
    assert.ok(bgm.curBpm > 88, '强度提高应加快速度');

    bgm.setScene('nonexistent', 99);
    assert.strictEqual(bgm.scene, 'menu');
    assert.strictEqual(bgm.themeId, 0);
    bgm.duck(2);

    // 挂起恢复后时钟跳变不应一次性补播大量音符
    bgm.setScene('prep', 1);
    const notes = bgm.stats.notes;
    advance(world, 600);
    bgm.tick();
    assert.ok(bgm.stats.notes - notes < 20, '长时间挂起后应重新对齐而不是补播');

    audio.setMusicEnabled(false);
    assert.strictEqual(bgm.running, false, '关闭音乐应停止调度器');
    audio.setMusicEnabled(true);
    assert.strictEqual(bgm.running, true, '重新开启音乐应恢复调度');
  }

  // 6. 导演器：界面状态 → BGM 场景
  {
    const menu = createWorld({
      hidden: { 'main-menu': false, 'main-container': true, 'conquest-container': true }
    });
    assert.strictEqual(menu.audio.director.readState().scene, 'menu');

    const tower = createWorld({
      hidden: { 'main-menu': true, 'main-container': false, 'conquest-container': true }
    });
    const game = {
      currentLevelData: { theme: 4 },
      gameEnded: false,
      battleActive: false,
      holdTotal: 150,
      holdLeft: 100,
      enemies: []
    };
    tower.sandbox.gameInstance = game;
    const prep = tower.audio.director.readState();
    assert.strictEqual(prep.scene, 'prep');
    assert.strictEqual(prep.theme, 4);
    game.battleActive = true;
    game.enemies = Array.from({ length: 9 }, () => ({ dead: false }));
    const battle = tower.audio.director.readState();
    assert.strictEqual(battle.scene, 'battle');
    assert.ok(battle.intensity > 0 && battle.intensity <= 1, '强度应在 0~1');
    game.gameEnded = true;
    assert.strictEqual(tower.audio.director.readState().scene, 'result');

    // 征服模式：关卡 ID 决定主题
    const conquest = createWorld({
      hidden: { 'main-menu': true, 'main-container': true, 'conquest-container': false }
    });
    conquest.sandbox.conquestGame = {
      currentLevelId: '3-2', gameEnded: false, battleActive: true, holdTotal: 150, holdLeft: 90, enemies: []
    };
    const state = conquest.audio.director.readState();
    assert.strictEqual(state.scene, 'battle');
    assert.strictEqual(state.theme, 3);
  }

  console.log('音频系统测试通过：音效注册/节流/发声上限、设置持久化、BGM 调度与场景、导演器状态');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
