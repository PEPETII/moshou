// 程序化生成水墨主题短音效，不依赖外部音频素材。
(function initializeInkAudio(global) {
  const storageKey = 'moshou-sound-enabled';
  const cooldowns = {
    place: 90,
    attack: 160,
    death: 100,
    fusion: 180,
    wave: 500,
    core: 420
  };
  const AudioContextClass = global.AudioContext || global.webkitAudioContext;
  let enabled = true;

  try {
    enabled = global.localStorage.getItem(storageKey) !== '0';
  } catch (_) {
    // 存储不可用时只保留当前页面的默认状态。
  }

  const audio = {
    enabled,
    supported: Boolean(AudioContextClass),
    context: null,
    output: null,
    noiseBuffer: null,
    resumePromise: null,
    issueReported: false,
    lastPlayed: Object.create(null),

    reportIssue(error) {
      if (this.issueReported) return;
      this.issueReported = true;
      if (global.console && typeof global.console.warn === 'function') {
        global.console.warn('水墨音效暂不可用，游戏流程不受影响。', error);
      }
    },

    syncButtons() {
      document.querySelectorAll('[data-sound-toggle]').forEach((button) => {
        button.disabled = !this.supported;
        button.textContent = this.supported
          ? `音效 · ${this.enabled ? '开' : '关'}`
          : '音效 · 不支持';
        button.setAttribute('aria-pressed', this.supported && this.enabled ? 'true' : 'false');
        button.title = this.supported ? '音效开关' : '当前浏览器不支持 Web Audio';
      });
    },

    ensureContext() {
      if (this.context || !this.supported) return this.context;

      try {
        this.context = new AudioContextClass();
        this.output = this.context.createGain();
        this.output.gain.value = this.enabled ? 0.6 : 0.0001;
        this.output.connect(this.context.destination);

        const samples = this.context.sampleRate;
        this.noiseBuffer = this.context.createBuffer(1, samples, samples);
        const noise = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < noise.length; i++) noise[i] = Math.random() * 2 - 1;
      } catch (error) {
        this.reportIssue(error);
        this.supported = false;
        this.context = null;
        this.output = null;
        this.noiseBuffer = null;
        this.syncButtons();
      }

      return this.context;
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

    setEnabled(next) {
      if (next && !this.supported) return false;
      this.enabled = Boolean(next);

      try {
        global.localStorage.setItem(storageKey, this.enabled ? '1' : '0');
      } catch (_) {
        // 存储不可用时，开关仍在当前页面生效。
      }

      if (this.context && this.output) {
        const now = this.context.currentTime;
        this.output.gain.cancelScheduledValues(now);
        this.output.gain.setTargetAtTime(this.enabled ? 0.6 : 0.0001, now, 0.015);
      }

      this.syncButtons();
      if (this.enabled) {
        this.ensureContext();
        this.resume();
      }
      return this.enabled;
    },

    toggle() {
      return this.setEnabled(!this.enabled);
    },

    play(name) {
      if (!this.enabled || !this.supported || !Object.prototype.hasOwnProperty.call(cooldowns, name)) {
        return false;
      }

      const now = Date.now();
      if (now - (this.lastPlayed[name] || 0) < cooldowns[name]) return false;
      this.lastPlayed[name] = now;

      const context = this.ensureContext();
      if (!context) return false;

      const render = () => {
        if (!this.enabled || context.state !== 'running') return;
        try {
          this.renderCue(name);
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
      envelope.gain.setValueAtTime(0.0001, startAt);
      envelope.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), startAt + 0.008);
      envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      oscillator.connect(envelope);
      envelope.connect(this.output);
      oscillator.onended = () => {
        oscillator.disconnect();
        envelope.disconnect();
      };
      oscillator.start(startAt);
      oscillator.stop(startAt + duration + 0.01);
    },

    noise(duration, filterType, frequency, volume, delay = 0) {
      const context = this.context;
      const startAt = context.currentTime + delay;
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const envelope = context.createGain();
      source.buffer = this.noiseBuffer;
      source.loop = true;
      filter.type = filterType;
      filter.frequency.setValueAtTime(frequency, startAt);
      filter.Q.value = 0.7;
      envelope.gain.setValueAtTime(0.0001, startAt);
      envelope.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), startAt + 0.008);
      envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      source.connect(filter);
      filter.connect(envelope);
      envelope.connect(this.output);
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        envelope.disconnect();
      };
      source.start(startAt);
      source.stop(startAt + duration + 0.01);
    },

    renderCue(name) {
      switch (name) {
        case 'place':
          this.noise(0.1, 'bandpass', 1200, 0.12);
          this.tone(245, 170, 0.16, 0.12, 'triangle');
          break;
        case 'attack':
          this.noise(0.05, 'highpass', 1800, 0.08);
          this.tone(380, 540, 0.09, 0.07, 'triangle');
          break;
        case 'death':
          this.tone(185, 72, 0.28, 0.14, 'sine');
          this.noise(0.16, 'lowpass', 380, 0.12);
          break;
        case 'fusion':
          this.noise(0.08, 'lowpass', 1200, 0.08);
          this.tone(210, 145, 0.17, 0.12, 'triangle');
          this.tone(392, 523, 0.22, 0.07, 'sine', 0.02);
          break;
        case 'wave':
          this.tone(78, 48, 0.36, 0.16, 'sine');
          this.noise(0.22, 'lowpass', 260, 0.13);
          this.tone(58, 40, 0.4, 0.1, 'triangle', 0.08);
          break;
        case 'core':
          this.noise(0.07, 'highpass', 2100, 0.14);
          this.tone(145, 62, 0.28, 0.14, 'triangle');
          break;
        default:
          return;
      }
    }
  };

  document.querySelectorAll('[data-sound-toggle]').forEach((button) => {
    button.addEventListener('click', () => audio.toggle());
  });
  audio.syncButtons();
  global.InkAudio = audio;
})(window);
