// 水墨主题音频核心：程序化合成，不依赖外部音频素材。
// 本文件只负责上下文、总线、压限器、设置与发声原语；
// 短音效定义见 audio-cues.js，背景音乐见 audio-bgm.js，场景导演见 audio-director.js。
(function initializeInkAudio(global) {
  const KEYS = {
    sfx: 'moshou-sound-enabled',
    bgm: 'moshou-bgm-enabled',
    sfxVolume: 'moshou-sfx-volume',
    bgmVolume: 'moshou-bgm-volume'
  };
  // 总线基准增益：音量滑块在此之上缩放。
  const SFX_BASE = 0.6;
  const BGM_BASE = 0.5;
  const SILENT = 0.0001;
  // 同时发声数上限；超过后低优先级音效（攻击、击杀）被丢弃，避免手机端卡顿与叠加爆音。
  const MAX_VOICES = 26;
  const AudioContextClass = global.AudioContext || global.webkitAudioContext;

  function readStored(key) {
    try {
      return global.localStorage.getItem(key);
    } catch (_) {
      return null; // 存储不可用时只保留当前页面的默认状态。
    }
  }

  function writeStored(key, value) {
    try {
      global.localStorage.setItem(key, value);
    } catch (_) {
      // 存储不可用时，设置仍在当前页面生效。
    }
  }

  function readVolume(key, fallback) {
    const raw = readStored(key);
    if (raw === null || raw === '') return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
  }

  const audio = {
    enabled: readStored(KEYS.sfx) !== '0',
    musicEnabled: readStored(KEYS.bgm) !== '0',
    sfxVolume: readVolume(KEYS.sfxVolume, 0.8),
    bgmVolume: readVolume(KEYS.bgmVolume, 0.6),
    supported: Boolean(AudioContextClass),
    context: null,
    output: null,
    sfxBus: null,
    bgmBus: null,
    master: null,
    noiseBuffer: null,
    resumePromise: null,
    issueReported: false,
    voices: 0,
    lastPlayed: Object.create(null),
    cues: Object.create(null),
    listeners: [],
    bgm: null,

    reportIssue(error) {
      if (this.issueReported) return;
      this.issueReported = true;
      if (global.console && typeof global.console.warn === 'function') {
        global.console.warn('水墨音频暂不可用，游戏流程不受影响。', error);
      }
    },

    // 订阅设置变化（音乐开关、音量）；BGM 引擎用它启停调度器。
    onChange(listener) {
      this.listeners.push(listener);
    },

    emitChange() {
      for (const listener of this.listeners) {
        try {
          listener(this);
        } catch (error) {
          this.reportIssue(error);
        }
      }
    },

    syncButtons() {
      const doc = global.document;
      if (!doc) return;
      // 设置组件的印章开关（.ink-switch）只改印章字与 aria-checked；其余按钮整段改写文字
      const paint = (button, label, on, title) => {
        button.disabled = !this.supported;
        const seal = button.querySelector('.ink-switch__seal');
        if (seal) {
          seal.textContent = this.supported ? (on ? '开' : '关') : '无';
          button.setAttribute('aria-checked', this.supported && on ? 'true' : 'false');
        } else {
          button.textContent = this.supported ? `${label} · ${on ? '开' : '关'}` : `${label} · 不支持`;
          button.setAttribute('aria-pressed', this.supported && on ? 'true' : 'false');
        }
        button.title = this.supported ? title : '当前浏览器不支持 Web Audio';
      };
      doc.querySelectorAll('[data-sound-toggle]').forEach((button) => paint(button, '音效', this.enabled, '音效开关'));
      doc.querySelectorAll('[data-bgm-toggle]').forEach((button) => paint(button, '音乐', this.musicEnabled, '背景音乐开关'));
      doc.querySelectorAll('[data-volume]').forEach((slider) => {
        const value = slider.dataset.volume === 'bgm' ? this.bgmVolume : this.sfxVolume;
        slider.disabled = !this.supported;
        slider.value = String(Math.round(value * 100));
      });
    },

    ensureContext() {
      if (this.context || !this.supported) return this.context;

      try {
        const context = new AudioContextClass();
        const master = context.createGain();
        master.gain.value = 1;
        // 压限器：多个声音叠加时压住峰值，防止削波爆音。
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -16;
        compressor.knee.value = 20;
        compressor.ratio.value = 4;
        compressor.attack.value = 0.004;
        compressor.release.value = 0.18;
        master.connect(compressor);
        compressor.connect(context.destination);

        const sfxBus = context.createGain();
        const bgmBus = context.createGain();
        sfxBus.connect(master);
        bgmBus.connect(master);

        const samples = context.sampleRate;
        const noiseBuffer = context.createBuffer(1, samples, samples);
        const noise = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noise.length; i++) noise[i] = Math.random() * 2 - 1;

        this.context = context;
        this.master = master;
        this.sfxBus = sfxBus;
        this.bgmBus = bgmBus;
        this.output = sfxBus; // 兼容旧原语：短音效统一接入音效总线。
        this.noiseBuffer = noiseBuffer;
        this.applyGains(true);
      } catch (error) {
        this.reportIssue(error);
        this.supported = false;
        this.context = null;
        this.master = null;
        this.sfxBus = null;
        this.bgmBus = null;
        this.output = null;
        this.noiseBuffer = null;
        this.syncButtons();
      }

      return this.context;
    },

    applyGains(immediate) {
      if (!this.context || !this.sfxBus || !this.bgmBus) return;
      const now = this.context.currentTime;
      const sfx = this.enabled ? Math.max(SILENT, SFX_BASE * this.sfxVolume) : SILENT;
      const bgm = this.musicEnabled ? Math.max(SILENT, BGM_BASE * this.bgmVolume) : SILENT;
      const constant = immediate ? 0.001 : 0.03;
      this.sfxBus.gain.cancelScheduledValues(now);
      this.sfxBus.gain.setTargetAtTime(sfx, now, constant);
      this.bgmBus.gain.cancelScheduledValues(now);
      this.bgmBus.gain.setTargetAtTime(bgm, now, constant);
    },

    resume() {
      if (!this.context || this.context.state === 'running') return Promise.resolve();
      if (this.resumePromise) return this.resumePromise;

      try {
        this.resumePromise = Promise.resolve(this.context.resume())
          .catch((error) => {
            if (!error || error.name !== 'NotAllowedError') this.reportIssue(error);
          })
          .finally(() => { this.resumePromise = null; });
      } catch (error) {
        if (!error || error.name !== 'NotAllowedError') this.reportIssue(error);
        this.resumePromise = null;
        return Promise.resolve();
      }

      return this.resumePromise;
    },

    // 浏览器要求在用户手势内创建/恢复上下文；导演器在首次点击、触摸时调用。
    unlock() {
      if (!this.supported) return false;
      this.ensureContext();
      this.resume();
      return Boolean(this.context);
    },

    isRunning() {
      return Boolean(this.context) && this.context.state === 'running';
    },

    persistAndApply(key, value) {
      writeStored(key, value);
      this.applyGains(false);
      this.syncButtons();
      this.emitChange();
    },

    setEnabled(next) {
      if (next && !this.supported) return false;
      this.enabled = Boolean(next);
      this.persistAndApply(KEYS.sfx, this.enabled ? '1' : '0');
      if (this.enabled) this.unlock();
      return this.enabled;
    },

    toggle() {
      return this.setEnabled(!this.enabled);
    },

    setMusicEnabled(next) {
      if (next && !this.supported) return false;
      this.musicEnabled = Boolean(next);
      this.persistAndApply(KEYS.bgm, this.musicEnabled ? '1' : '0');
      if (this.musicEnabled) this.unlock();
      return this.musicEnabled;
    },

    toggleMusic() {
      return this.setMusicEnabled(!this.musicEnabled);
    },

    // kind: 'sfx' | 'bgm'；value: 0~1
    setVolume(kind, value) {
      const clamped = Math.min(1, Math.max(0, Number(value) || 0));
      if (kind === 'bgm') {
        this.bgmVolume = clamped;
        this.persistAndApply(KEYS.bgmVolume, String(clamped));
      } else {
        this.sfxVolume = clamped;
        this.persistAndApply(KEYS.sfxVolume, String(clamped));
      }
      return clamped;
    },

    // 轻微随机音高，避免高频重复音听起来像机器。
    jitter(amount) {
      const range = amount === undefined ? 0.04 : amount;
      return 1 + (Math.random() * 2 - 1) * range;
    },

    // 注册短音效：def = { cooldown, group?, groupCooldown?, priority?, key?(opts), render(audio, opts) }
    defineCue(name, def) {
      this.cues[name] = def;
    },

    play(name, opts) {
      const def = this.cues[name];
      if (!this.enabled || !this.supported || !def) return false;
      if (def.priority !== 'high' && this.voices >= MAX_VOICES) return false;

      const now = Date.now();
      const key = def.key ? def.key(opts) : name;
      if (now - (this.lastPlayed[key] || 0) < def.cooldown) return false;
      if (def.group && now - (this.lastPlayed[def.group] || 0) < (def.groupCooldown || 0)) return false;
      this.lastPlayed[key] = now;
      if (def.group) this.lastPlayed[def.group] = now;

      const context = this.ensureContext();
      if (!context) return false;

      const render = () => {
        if (!this.enabled || context.state !== 'running') return;
        try {
          def.render(this, opts || {});
        } catch (error) {
          // 音频节点异常不应中断游戏逻辑。
          this.reportIssue(error);
        }
      };

      if (context.state === 'running') render();
      else this.resume().then(render);
      return true;
    },

    tone(startHz, endHz, duration, volume, type, delay = 0) {
      const context = this.context;
      const startAt = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = type || 'sine';
      oscillator.frequency.setValueAtTime(startHz, startAt);
      oscillator.frequency.exponentialRampToValueAtTime(endHz, startAt + duration);
      envelope.gain.setValueAtTime(SILENT, startAt);
      envelope.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), startAt + 0.008);
      envelope.gain.exponentialRampToValueAtTime(SILENT, startAt + duration);
      oscillator.connect(envelope);
      envelope.connect(this.output);
      this.voices++;
      oscillator.onended = () => {
        this.voices = Math.max(0, this.voices - 1);
        oscillator.disconnect();
        envelope.disconnect();
      };
      oscillator.start(startAt);
      oscillator.stop(startAt + duration + 0.01);
    },

    noise(duration, filterType, frequency, volume, delay = 0, q = 0.7) {
      const context = this.context;
      const startAt = context.currentTime + delay;
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const envelope = context.createGain();
      source.buffer = this.noiseBuffer;
      source.loop = true;
      filter.type = filterType;
      filter.frequency.setValueAtTime(frequency, startAt);
      filter.Q.value = q;
      envelope.gain.setValueAtTime(SILENT, startAt);
      envelope.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), startAt + 0.008);
      envelope.gain.exponentialRampToValueAtTime(SILENT, startAt + duration);
      source.connect(filter);
      filter.connect(envelope);
      envelope.connect(this.output);
      this.voices++;
      source.onended = () => {
        this.voices = Math.max(0, this.voices - 1);
        source.disconnect();
        filter.disconnect();
        envelope.disconnect();
      };
      source.start(startAt);
      source.stop(startAt + duration + 0.01);
    }
  };

  const doc = global.document;
  if (doc) {
    doc.addEventListener('click', (event) => {
      const target = event.target && event.target.closest ? event.target : null;
      if (!target) return;
      const sound = target.closest('[data-sound-toggle]');
      if (sound) {
        audio.toggle();
        return;
      }
      const music = target.closest('[data-bgm-toggle]');
      if (music) audio.toggleMusic();
    });
    doc.addEventListener('input', (event) => {
      const slider = event.target && event.target.closest ? event.target.closest('[data-volume]') : null;
      if (slider) audio.setVolume(slider.dataset.volume, Number(slider.value) / 100);
    });
    audio.syncButtons();
  }

  global.InkAudio = audio;
})(window);
