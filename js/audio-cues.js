// 水墨短音效定义：依赖 audio.js 提供的 defineCue / tone / noise / jitter。
(function registerInkCues(global) {
  const audio = global.InkAudio;
  if (!audio) return;

  // 炮塔 → 攻击音色系别。未列出的塔取默认系别 metal。
  // 2026-10-20：32 座下架塔的音色条目随配置删除，只留现役四塔。
  const FAMILY_BY_TOWER = {
    fire: 'fire',
    water: 'water',
    wood: 'wind',
    earth: 'thud',
    // 2026-10-20 新塔：借用现有五种音色
    gold: 'metal',
    wind: 'wind',
    cannon: 'thud',
    thunder: 'metal',
    ice: 'water',
    bow: 'wind',
    mountain: 'thud',
    sword: 'metal',
    yan: 'fire',
    lin: 'wind',
    fen: 'fire'
  };
  // 首领级敌人：击杀时播放钟鸣。
  const BOSS_ENEMIES = new Set(['overlord', 'tyrant', 'matriarch', 'doomsday', 'juggernaut']);

  audio.familyOf = function familyOf(tower) {
    if (!tower) return 'metal';
    if (FAMILY_BY_TOWER[tower.type]) return FAMILY_BY_TOWER[tower.type];
    return 'metal';
  };

  audio.deathVariantOf = function deathVariantOf(enemy) {
    if (!enemy) return 'small';
    if (BOSS_ENEMIES.has(enemy.type)) return 'boss';
    return (enemy.maxHp || 0) >= 60 ? 'large' : 'small';
  };

  // 攻击音：每个系别一个音色，系别各自节流，另有全局间隔避免多塔齐射叠成噪声。
  const ATTACK_FAMILIES = {
    fire(j) {
      audio.noise(0.13, 'bandpass', 800 * j, 0.13, 0, 0.9);
      audio.tone(300 * j, 150 * j, 0.1, 0.07, 'sawtooth');
    },
    water(j) {
      audio.tone(520 * j, 880 * j, 0.09, 0.11, 'sine');
      audio.tone(780 * j, 1180 * j, 0.06, 0.065, 'sine', 0.04);
    },
    wind(j) {
      audio.noise(0.12, 'bandpass', 2200 * j, 0.12, 0, 1.2);
      audio.tone(420 * j, 300 * j, 0.1, 0.05, 'triangle');
    },
    metal(j) {
      audio.tone(1320 * j, 1290 * j, 0.16, 0.08, 'sine');
      audio.tone(1980 * j, 1950 * j, 0.1, 0.04, 'sine');
      audio.noise(0.03, 'highpass', 3000, 0.06);
    },
    zap(j) {
      audio.tone(900 * j, 220 * j, 0.09, 0.07, 'sawtooth');
      audio.noise(0.04, 'highpass', 3500, 0.09);
    },
    thud(j) {
      audio.tone(150 * j, 70 * j, 0.14, 0.14, 'sine');
      audio.noise(0.06, 'lowpass', 500, 0.1);
    }
  };

  audio.defineCue('attack', {
    cooldown: 120,
    group: 'attack',
    groupCooldown: 40,
    priority: 'low',
    key: (opts) => `attack:${(opts && opts.family) || 'metal'}`,
    render(a, opts) {
      const render = ATTACK_FAMILIES[opts.family] || ATTACK_FAMILIES.metal;
      render(a.jitter(0.05));
    }
  });

  const DEATH_VARIANTS = {
    small(j) {
      audio.tone(185 * j, 72 * j, 0.28, 0.14, 'sine');
      audio.noise(0.16, 'lowpass', 380, 0.12);
    },
    large(j) {
      audio.tone(130 * j, 48 * j, 0.4, 0.18, 'sine');
      audio.tone(260 * j, 110 * j, 0.2, 0.06, 'triangle');
      audio.noise(0.26, 'lowpass', 300, 0.16);
    },
    boss(j) {
      // 钟鸣：基音加两个非整数倍泛音，余音拉长。
      audio.tone(110 * j, 106 * j, 1.1, 0.15, 'sine');
      audio.tone(233 * j, 228 * j, 0.9, 0.07, 'sine');
      audio.tone(331 * j, 326 * j, 0.7, 0.04, 'sine');
      audio.noise(0.5, 'lowpass', 500, 0.14);
    }
  };

  audio.defineCue('death', {
    cooldown: 90,
    priority: 'low',
    key: (opts) => `death:${(opts && opts.variant) || 'small'}`,
    render(a, opts) {
      const render = DEATH_VARIANTS[opts.variant] || DEATH_VARIANTS.small;
      render(a.jitter(0.06));
    }
  });

  audio.defineCue('place', {
    cooldown: 90,
    render(a) {
      const j = a.jitter(0.03);
      a.noise(0.1, 'bandpass', 1200 * j, 0.12);
      a.tone(245 * j, 170 * j, 0.16, 0.12, 'triangle');
    }
  });

  audio.defineCue('wave', {
    cooldown: 500,
    priority: 'high',
    render(a) {
      a.tone(78, 48, 0.36, 0.16, 'sine');
      a.noise(0.22, 'lowpass', 260, 0.13);
      a.tone(58, 40, 0.4, 0.1, 'triangle', 0.08);
    }
  });

  audio.defineCue('core', {
    cooldown: 420,
    priority: 'high',
    render(a) {
      a.noise(0.07, 'highpass', 2100, 0.14);
      a.tone(145, 62, 0.28, 0.14, 'triangle');
    }
  });

  // 首领出场前的预兆：低沉的战鼓两声，墨晕渐起（工单 10 §5；素材未备，先用合成音）
  audio.defineCue('boss_omen', {
    cooldown: 1500,
    priority: 'high',
    render(a) {
      a.tone(62, 40, 0.6, 0.18, 'sine');
      a.tone(55, 38, 0.7, 0.16, 'sine', 0.55);
      a.noise(0.5, 'lowpass', 220, 0.1, 0.1);
    }
  });

  // 首领碎字：一声脆裂
  audio.defineCue('segment_break', {
    cooldown: 200,
    priority: 'high',
    render(a) {
      a.noise(0.12, 'highpass', 1800, 0.16);
      a.tone(210, 70, 0.28, 0.14, 'triangle');
    }
  });

  // 天劫封笔：雷纹劈落
  audio.defineCue('seal', {
    cooldown: 300,
    render(a) {
      a.noise(0.09, 'bandpass', 3200, 0.12);
      a.tone(340, 90, 0.22, 0.1, 'square');
    }
  });

  // 界面轻点：墨滴落纸。
  audio.defineCue('uiTap', {
    cooldown: 60,
    render(a) {
      const j = a.jitter(0.03);
      a.tone(880 * j, 780 * j, 0.06, 0.08, 'triangle');
      a.noise(0.03, 'bandpass', 2400, 0.05);
    }
  });

  audio.defineCue('sell', {
    cooldown: 150,
    render(a) {
      a.tone(660, 440, 0.12, 0.06, 'triangle');
      a.tone(440, 330, 0.14, 0.05, 'triangle', 0.06);
      a.noise(0.06, 'bandpass', 1500, 0.04);
    }
  });

  // 拒绝：低沉两声，用于墨水不足、位置非法等失败提示。
  audio.defineCue('deny', {
    cooldown: 220,
    render(a) {
      a.tone(220, 165, 0.14, 0.09, 'square');
      a.tone(196, 150, 0.16, 0.075, 'square', 0.1);
    }
  });

  // 一波清场：宫调三音上行，如轻敲磬。
  audio.defineCue('waveClear', {
    cooldown: 800,
    priority: 'high',
    render(a) {
      [[587, 0], [740, 0.12], [880, 0.24]].forEach(([hz, delay]) => {
        a.tone(hz, hz * 0.995, 0.4, 0.07, 'sine', delay);
        a.tone(hz * 2, hz * 1.99, 0.25, 0.02, 'sine', delay);
      });
    }
  });

  audio.defineCue('victory', {
    cooldown: 3000,
    priority: 'high',
    render(a) {
      const notes = [[587, 0], [740, 0.16], [880, 0.32], [988, 0.48], [1175, 0.64]];
      notes.forEach(([hz, delay]) => {
        a.tone(hz, hz * 0.997, 0.5, 0.08, 'triangle', delay);
        a.tone(hz * 2, hz * 1.99, 0.3, 0.02, 'sine', delay);
      });
      // 收束长音：宫、徵、宫八度。
      [[294, 0.8], [440, 0.8], [587, 0.8]].forEach(([hz, delay]) => {
        a.tone(hz, hz * 0.998, 1.4, 0.07, 'sine', delay);
      });
      a.noise(0.5, 'highpass', 4000, 0.02, 0.8);
      if (a.bgm && a.bgm.duck) a.bgm.duck(3.6);
    }
  });

  audio.defineCue('defeat', {
    cooldown: 3000,
    priority: 'high',
    render(a) {
      a.tone(392, 380, 0.5, 0.09, 'triangle');
      a.tone(330, 318, 0.6, 0.09, 'triangle', 0.28);
      a.tone(220, 196, 1.1, 0.1, 'sine', 0.6);
      a.tone(110, 70, 0.7, 0.16, 'sine', 0.6);
      a.noise(0.5, 'lowpass', 320, 0.14, 0.6);
      if (a.bgm && a.bgm.duck) a.bgm.duck(3.6);
    }
  });
})(window);
