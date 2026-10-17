// 水墨 BGM 引擎：程序化合成古筝（Karplus-Strong）、竹笛、波鼓与低频长音。
// 旋律在五声音阶内随机游走并复用动机；场景、主题与战斗强度由 audio-director.js 驱动。
(function initInkBgm(global) {
  const audio = global.InkAudio;
  if (!audio) return;

  const LOOKAHEAD = 0.28; // 预调度窗口（秒）
  const TICK_MS = 60;
  const STEPS_PER_BAR = 8; // 每小节 8 个八分音符
  const SILENT = 0.0001;
  const MAX_CACHED_PLUCKS = 48;

  // 五声音阶：相对根音的半音偏移（宫商角徵羽的各调式）。
  const SCALES = {
    gong: [0, 2, 4, 7, 9],
    shang: [0, 2, 5, 7, 10],
    jue: [0, 3, 5, 8, 10],
    zhi: [0, 2, 5, 7, 9],
    yu: [0, 3, 5, 7, 10]
  };

  // 主题 0 为菜单；1~5 对应初墨、风林、火山、玄冰、终焉（征服模式同序）。
  const THEMES = {
    0: { root: 50, scale: 'gong', tempo: 0, flute: 0, drum: 0, wet: 0.55 },
    1: { root: 50, scale: 'gong', tempo: 0, flute: 0, drum: 0, wet: 0.5 },
    2: { root: 55, scale: 'zhi', tempo: 6, flute: 0.2, drum: 0, wet: 0.45 },
    3: { root: 57, scale: 'yu', tempo: 10, flute: -0.1, drum: 0.2, wet: 0.4 },
    4: { root: 52, scale: 'jue', tempo: -8, flute: 0.1, drum: -0.1, wet: 0.75 },
    5: { root: 50, scale: 'shang', tempo: 12, flute: -0.2, drum: 0.3, wet: 0.55 }
  };

  // 场景：速度、旋律密度、低音方式、鼓、笛与长音。
  const SCENES = {
    menu: { bpm: 54, density: 0.38, bass: 'bar', drum: false, flute: 0.55, drone: 0.045, chime: 0.25 },
    prep: { bpm: 64, density: 0.5, bass: 'bar', drum: false, flute: 0.35, drone: 0.04, chime: 0.1 },
    battle: { bpm: 88, density: 0.68, bass: 'beat', drum: true, flute: 0, drone: 0.03, chime: 0 },
    result: { bpm: 52, density: 0.25, bass: 'bar', drum: false, flute: 0.4, drone: 0.045, chime: 0.2 }
  };

  // 各小节的低音级数：宫、徵、角、徵。
  const BASS_DEGREES = [0, 3, 2, 3];
  const MOVES = [-3, -2, -1, -1, 0, 1, 1, 2, 3];

  const midiHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  const bgm = {
    running: false,
    timer: null,
    scene: 'menu',
    themeId: 0,
    intensity: 0,
    curBpm: SCENES.menu.bpm,
    nextTime: 0,
    step: 0,
    bar: 0,
    degree: 5,
    motif: new Array(STEPS_PER_BAR).fill(null),
    prevMotif: null,
    nodes: null,
    drone: null,
    plucks: new Map(),
    stats: { notes: 0, drums: 0, flutes: 0, bars: 0 },

    degreeToHz(d) {
      const theme = THEMES[this.themeId] || THEMES[0];
      const scale = SCALES[theme.scale];
      const octave = Math.floor(d / 5);
      const index = ((d % 5) + 5) % 5;
      return midiHz(theme.root + octave * 12 + scale[index]);
    },

    // 创建混响与干湿路由；只在音频上下文可用后执行一次。
    ensureNodes() {
      if (this.nodes || !audio.context || !audio.bgmBus) return this.nodes;
      const ctx = audio.context;
      const out = ctx.createGain();
      out.connect(audio.bgmBus);
      const dry = ctx.createGain();
      dry.connect(out);

      const send = ctx.createGain();
      const convolver = ctx.createConvolver();
      const length = Math.floor(ctx.sampleRate * 2.4);
      const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6);
        }
      }
      convolver.buffer = impulse;
      const soften = ctx.createBiquadFilter();
      soften.type = 'lowpass';
      soften.frequency.value = 3600;
      send.connect(convolver);
      convolver.connect(soften);
      soften.connect(out);

      this.nodes = { out, dry, send };
      this.applyTheme();
      return this.nodes;
    },

    applyTheme() {
      if (!this.nodes) return;
      const theme = THEMES[this.themeId] || THEMES[0];
      const now = audio.context.currentTime;
      this.nodes.send.gain.setTargetAtTime(theme.wet * 0.8, now, 0.3);
    },

    // 根据设置与上下文状态决定是否运行；导演器与设置变化都会调用。
    sync() {
      const shouldRun = audio.supported && audio.musicEnabled && audio.isRunning();
      if (shouldRun && !this.running) this.start();
      else if (!shouldRun && this.running) this.stop();
    },

    start() {
      if (this.running || !this.ensureNodes()) return;
      this.running = true;
      this.nextTime = audio.context.currentTime + 0.12;
      this.step = 0;
      this.startDrone();
      this.timer = global.setInterval(() => this.tick(), TICK_MS);
    },

    stop() {
      this.running = false;
      if (this.timer) global.clearInterval(this.timer);
      this.timer = null;
      this.stopDrone();
    },

    setScene(scene, themeId) {
      const nextScene = SCENES[scene] ? scene : 'menu';
      const nextTheme = THEMES[themeId] ? themeId : 0;
      if (nextScene === this.scene && nextTheme === this.themeId) return;
      const sceneChanged = nextScene !== this.scene;
      this.scene = nextScene;
      if (nextTheme !== this.themeId) {
        this.themeId = nextTheme;
        this.degree = 5;
        this.prevMotif = null;
        this.applyTheme();
        this.retuneDrone();
      }
      if (sceneChanged) {
        this.prevMotif = null;
        this.step = 0; // 新场景从下一小节开头起拍。
        this.updateDroneLevel();
      }
    },

    setIntensity(value) {
      this.intensity = clamp(Number(value) || 0, 0, 1);
    },

    // 胜负短旋律播放时压低 BGM，随后缓缓恢复。
    duck(seconds) {
      if (!this.nodes) return;
      const now = audio.context.currentTime;
      const gain = this.nodes.out.gain;
      gain.cancelScheduledValues(now);
      gain.setTargetAtTime(0.2, now, 0.05);
      gain.setTargetAtTime(1, now + seconds, 0.7);
    },

    // ---- 调度 ----

    tick() {
      const ctx = audio.context;
      if (!this.running || !ctx || ctx.state !== 'running') return;
      // 挂起恢复后时钟已越过预定时间，重新对齐，避免一次性补播。
      if (this.nextTime < ctx.currentTime - 0.1) this.nextTime = ctx.currentTime + 0.05;

      const sceneConfig = SCENES[this.scene];
      const theme = THEMES[this.themeId] || THEMES[0];
      const boost = this.scene === 'battle' ? this.intensity * 16 : 0;
      const targetBpm = sceneConfig.bpm + theme.tempo + boost;

      while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
        this.curBpm += (targetBpm - this.curBpm) * 0.12;
        const stepDuration = 30 / this.curBpm;
        try {
          this.scheduleStep(this.nextTime, stepDuration, sceneConfig, theme);
        } catch (error) {
          audio.reportIssue(error);
        }
        this.nextTime += stepDuration;
      }
    },

    beginBar(sceneConfig) {
      this.bar++;
      this.stats.bars++;
      const reuse = this.prevMotif && Math.random() < 0.4;
      this.motif = reuse ? this.mutateMotif(this.prevMotif) : this.generateMotif(sceneConfig);
      // 每四小节收束到主音，让乐句有落脚感。
      if (this.bar % 4 === 0) this.resolveMotif();
      this.prevMotif = this.motif.slice();
    },

    generateMotif(sceneConfig) {
      const motif = new Array(STEPS_PER_BAR).fill(null);
      const density = sceneConfig.density * (1 + this.intensity * 0.35);
      let degree = this.degree;
      for (let i = 0; i < STEPS_PER_BAR; i++) {
        const strong = i % 2 === 0;
        const chance = i === 0 ? 1 : density * (strong ? 1.3 : 0.65);
        if (Math.random() >= chance) continue;
        degree = clamp(degree + pick(MOVES), 3, 12);
        // 句尾偏向主音/徵音，旋律更像一句话。
        if (i >= 6 && Math.random() < 0.6) degree = this.nearestAnchor(degree);
        motif[i] = degree;
      }
      this.degree = degree;
      return motif;
    },

    mutateMotif(source) {
      const motif = source.slice();
      const indexes = motif.map((value, i) => (value === null ? -1 : i)).filter((i) => i >= 0);
      if (indexes.length > 1) {
        const i = pick(indexes.slice(1));
        motif[i] = clamp(motif[i] + pick([-1, 1]), 3, 12);
      }
      return motif;
    },

    nearestAnchor(degree) {
      for (const delta of [0, -1, 1, -2, 2]) {
        const candidate = degree + delta;
        const mod = ((candidate % 5) + 5) % 5;
        if (mod === 0 || mod === 3) return clamp(candidate, 3, 12);
      }
      return degree;
    },

    resolveMotif() {
      for (let i = STEPS_PER_BAR - 1; i >= 0; i--) {
        if (this.motif[i] !== null) {
          this.motif[i] = this.nearestAnchor(this.motif[i]);
          this.degree = this.motif[i];
          return;
        }
      }
    },

    scheduleStep(time, stepDuration, sceneConfig, theme) {
      const step = this.step;
      if (step === 0) this.beginBar(sceneConfig);

      const note = this.motif[step];
      if (note !== null) {
        const strong = step % 2 === 0;
        this.pluck(this.degreeToHz(note), time, strong ? 0.9 : 0.62, 1);
        // 战斗高强度时强拍加一记轮指式回音。
        if (this.scene === 'battle' && strong && Math.random() < this.intensity * 0.55) {
          this.pluck(this.degreeToHz(note), time + stepDuration * 0.5, 0.45, 1);
        }
      }

      const bassDegree = BASS_DEGREES[this.bar % BASS_DEGREES.length] - 5;
      if (sceneConfig.bass === 'bar' && step === 0) {
        this.pluck(this.degreeToHz(bassDegree), time, 0.8, 0.35, 900);
      } else if (sceneConfig.bass === 'beat' && step % 2 === 0) {
        const degree = step === 0 || step === 4 ? bassDegree : bassDegree + 3;
        this.pluck(this.degreeToHz(degree), time, step === 0 ? 0.85 : 0.6, 0.3, 900);
      }

      if (sceneConfig.drum) this.scheduleDrums(time, step);

      if (step === 0 && this.bar % 2 === 0) {
        const fluteChance = clamp(sceneConfig.flute + theme.flute, 0, 1);
        if (fluteChance > 0 && Math.random() < fluteChance) {
          const degree = 5 + (((this.degree % 5) + 5) % 5);
          const length = pick([4, 6, 8]);
          this.flute(this.degreeToHz(degree), time, stepDuration * length * 0.95, 0.85);
        }
      }
      if (step === 0 && sceneConfig.chime > 0 && Math.random() < sceneConfig.chime) {
        this.pluck(this.degreeToHz(pick([10, 11, 13])), time + stepDuration * 3, 0.4, 1.4);
      }

      this.step = (step + 1) % STEPS_PER_BAR;
    },

    scheduleDrums(time, step) {
      const theme = THEMES[this.themeId] || THEMES[0];
      const level = clamp(this.intensity + theme.drum, 0, 1.2);
      if (step === 0) this.drum('big', time, 1);
      else if (step === 4) this.drum('mid', time, 0.7);
      else if ((step === 2 || step === 6) && level > 0.35) this.drum('tap', time, 0.5);
      else if (step % 2 === 1 && level > 0.65) this.drum('tick', time, 0.35);
      // 每四小节末尾加密鼓点作过门。
      if (this.bar % 4 === 3 && step === 7 && level > 0.5) this.drum('tap', time, 0.6);
    },

    // ---- 声部 ----

    // Karplus-Strong 拨弦缓冲：按音高缓存，播放时用 playbackRate 精调音准。
    pluckBuffer(hz) {
      const ctx = audio.context;
      const key = Math.round(hz * 2);
      const cached = this.plucks.get(key);
      if (cached) return cached;

      const rate = ctx.sampleRate;
      const delay = Math.max(2, Math.round(rate / hz - 0.5));
      const length = Math.floor(rate * 2.4);
      const buffer = ctx.createBuffer(1, length, rate);
      const data = buffer.getChannelData(0);
      let smooth = 0;
      for (let i = 0; i <= delay; i++) {
        smooth = smooth * 0.5 + (Math.random() * 2 - 1) * 0.5; // 先低通，音头更温润
        data[i] = smooth;
      }
      for (let i = delay + 1; i < length; i++) {
        data[i] = 0.998 * 0.5 * (data[i - delay] + data[i - delay - 1]);
      }
      let peak = 0;
      for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(data[i]));
      const fadeStart = length - Math.floor(rate * 0.3);
      for (let i = 0; i < length; i++) {
        const fade = i > fadeStart ? 1 - (i - fadeStart) / (length - fadeStart) : 1;
        data[i] = (data[i] / (peak || 1)) * fade;
      }
      const entry = { buffer, baseHz: rate / (delay + 0.5) };
      this.plucks.set(key, entry);
      if (this.plucks.size > MAX_CACHED_PLUCKS) {
        this.plucks.delete(this.plucks.keys().next().value);
      }
      return entry;
    },

    pluck(hz, time, velocity, wet, cutoff) {
      const ctx = audio.context;
      const nodes = this.nodes;
      if (!nodes) return;
      const entry = this.pluckBuffer(hz);
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      source.buffer = entry.buffer;
      source.playbackRate.value = hz / entry.baseHz;
      filter.type = 'lowpass';
      filter.frequency.value = cutoff || 4800;
      gain.gain.value = velocity * 0.32;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(nodes.dry);
      let send = null;
      if (wet > 0) {
        send = ctx.createGain();
        send.gain.value = wet;
        gain.connect(send);
        send.connect(nodes.send);
      }
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
        if (send) send.disconnect();
      };
      source.start(time);
      source.stop(time + 2.3);
      this.stats.notes++;
    },

    // 竹笛：正弦主音 + 二次泛音 + 气声，带缓起的颤音。
    flute(hz, time, duration, velocity) {
      const ctx = audio.context;
      const nodes = this.nodes;
      if (!nodes) return;
      const end = time + duration + 0.5;
      const envelope = ctx.createGain();
      envelope.gain.setValueAtTime(SILENT, time);
      envelope.gain.linearRampToValueAtTime(0.085 * velocity, time + 0.09);
      envelope.gain.setValueAtTime(0.085 * velocity, time + Math.max(0.1, duration - 0.1));
      envelope.gain.exponentialRampToValueAtTime(SILENT, end);

      const main = ctx.createOscillator();
      main.type = 'sine';
      main.frequency.value = hz;
      const upper = ctx.createOscillator();
      upper.type = 'sine';
      upper.frequency.value = hz * 2;
      const upperGain = ctx.createGain();
      upperGain.gain.value = 0.22;
      const vibrato = ctx.createOscillator();
      vibrato.frequency.value = 5.2;
      const vibratoDepth = ctx.createGain();
      vibratoDepth.gain.setValueAtTime(0, time);
      vibratoDepth.gain.linearRampToValueAtTime(hz * 0.006, time + Math.min(0.5, duration));
      vibrato.connect(vibratoDepth);
      vibratoDepth.connect(main.frequency);
      vibratoDepth.connect(upper.frequency);

      const breath = ctx.createBufferSource();
      breath.buffer = audio.noiseBuffer;
      breath.loop = true;
      const breathFilter = ctx.createBiquadFilter();
      breathFilter.type = 'bandpass';
      breathFilter.frequency.value = hz * 2;
      breathFilter.Q.value = 2;
      const breathGain = ctx.createGain();
      breathGain.gain.value = 0.18;

      main.connect(envelope);
      upper.connect(upperGain);
      upperGain.connect(envelope);
      breath.connect(breathFilter);
      breathFilter.connect(breathGain);
      breathGain.connect(envelope);
      envelope.connect(nodes.dry);
      const send = ctx.createGain();
      send.gain.value = 1.2;
      envelope.connect(send);
      send.connect(nodes.send);

      const sources = [main, upper, vibrato, breath];
      main.onended = () => {
        [main, upper, vibrato, breath, envelope, upperGain, vibratoDepth, breathFilter, breathGain, send]
          .forEach((node) => node.disconnect());
      };
      sources.forEach((node) => { node.start(time); node.stop(end + 0.02); });
      this.stats.flutes++;
    },

    // 波鼓：低频正弦下扫 + 皮面噪声；tap/tick 为高处的轻敲。
    drum(kind, time, velocity) {
      const ctx = audio.context;
      const nodes = this.nodes;
      if (!nodes) return;
      const spec = {
        big: { from: 125, to: 48, length: 0.34, body: 0.3, noise: 260, noiseGain: 0.13 },
        mid: { from: 150, to: 70, length: 0.24, body: 0.22, noise: 320, noiseGain: 0.1 },
        tap: { from: 210, to: 120, length: 0.14, body: 0.12, noise: 900, noiseGain: 0.06 },
        tick: { from: 900, to: 700, length: 0.05, body: 0.03, noise: 3200, noiseGain: 0.04 }
      }[kind];
      if (!spec) return;

      const body = ctx.createOscillator();
      const bodyGain = ctx.createGain();
      body.type = 'sine';
      body.frequency.setValueAtTime(spec.from, time);
      body.frequency.exponentialRampToValueAtTime(spec.to, time + spec.length);
      bodyGain.gain.setValueAtTime(SILENT, time);
      bodyGain.gain.exponentialRampToValueAtTime(spec.body * velocity, time + 0.006);
      bodyGain.gain.exponentialRampToValueAtTime(SILENT, time + spec.length);
      body.connect(bodyGain);
      bodyGain.connect(nodes.dry);

      const skin = ctx.createBufferSource();
      const skinFilter = ctx.createBiquadFilter();
      const skinGain = ctx.createGain();
      skin.buffer = audio.noiseBuffer;
      skin.loop = true;
      skinFilter.type = kind === 'tick' ? 'highpass' : 'bandpass';
      skinFilter.frequency.value = spec.noise;
      skinGain.gain.setValueAtTime(SILENT, time);
      skinGain.gain.exponentialRampToValueAtTime(spec.noiseGain * velocity, time + 0.005);
      skinGain.gain.exponentialRampToValueAtTime(SILENT, time + spec.length * 0.7);
      skin.connect(skinFilter);
      skinFilter.connect(skinGain);
      skinGain.connect(nodes.dry);

      body.onended = () => {
        body.disconnect();
        bodyGain.disconnect();
        skin.disconnect();
        skinFilter.disconnect();
        skinGain.disconnect();
      };
      body.start(time);
      body.stop(time + spec.length + 0.02);
      skin.start(time);
      skin.stop(time + spec.length + 0.02);
      this.stats.drums++;
    },

    // 低频长音：根音与五度的正弦，铺一层若有若无的底。
    startDrone() {
      if (this.drone || !this.nodes) return;
      const ctx = audio.context;
      const gain = ctx.createGain();
      gain.gain.value = SILENT;
      gain.connect(this.nodes.dry);
      const oscillators = [0, 7].map((offset, index) => {
        const osc = ctx.createOscillator();
        const level = ctx.createGain();
        osc.type = 'sine';
        level.gain.value = index === 0 ? 1 : 0.5;
        osc.connect(level);
        level.connect(gain);
        osc.start();
        return { osc, level, offset };
      });
      this.drone = { gain, oscillators };
      this.retuneDrone();
      this.updateDroneLevel();
    },

    retuneDrone() {
      if (!this.drone) return;
      const theme = THEMES[this.themeId] || THEMES[0];
      const now = audio.context.currentTime;
      for (const { osc, offset } of this.drone.oscillators) {
        osc.frequency.setTargetAtTime(midiHz(theme.root - 24 + offset), now, 0.4);
      }
    },

    updateDroneLevel() {
      if (!this.drone) return;
      const level = SCENES[this.scene].drone;
      this.drone.gain.gain.setTargetAtTime(Math.max(SILENT, level), audio.context.currentTime, 0.6);
    },

    stopDrone() {
      const drone = this.drone;
      if (!drone) return;
      this.drone = null;
      const ctx = audio.context;
      if (!ctx) return;
      const now = ctx.currentTime;
      drone.gain.gain.setTargetAtTime(SILENT, now, 0.15);
      for (const { osc } of drone.oscillators) {
        try { osc.stop(now + 0.8); } catch (_) { /* 已停止则忽略 */ }
      }
      drone.oscillators[0].osc.onended = () => {
        drone.oscillators.forEach(({ osc, level }) => { osc.disconnect(); level.disconnect(); });
        drone.gain.disconnect();
      };
    }
  };

  bgm.THEMES = THEMES;
  bgm.SCENES = SCENES;
  audio.bgm = bgm;
  audio.onChange(() => bgm.sync());
})(window);
