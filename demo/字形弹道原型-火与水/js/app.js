// 装配：画布与纸面、主循环、输入、控件、统计、字形拆解图
(() => {
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const paper = document.createElement('canvas');
  const stain = document.createElement('canvas');
  for (const c of [canvas, paper, stain]) { c.width = STAGE.W * dpr; c.height = STAGE.H * dpr; }
  const pctx = paper.getContext('2d');
  const sctx = stain.getContext('2d');
  pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const state = { running: true, speed: 1 };
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) FX.reduceMotion = true;

  function paintPaper() {
    pctx.fillStyle = COLORS.paper;
    pctx.fillRect(0, 0, STAGE.W, STAGE.H);
    for (let i = 0; i < 2600; i++) {
      pctx.fillStyle = `rgba(90,75,55,${rnd(0.02, 0.07)})`;
      pctx.fillRect(rnd(0, STAGE.W), rnd(0, STAGE.H), rnd(0.6, 1.6), rnd(0.6, 1.6));
    }
    pctx.strokeStyle = 'rgba(120,100,70,0.06)';
    pctx.lineWidth = 0.7;
    for (let i = 0; i < 180; i++) {
      const x = rnd(0, STAGE.W), y = rnd(0, STAGE.H), a = rnd(0, Math.PI), l = rnd(6, 22);
      pctx.beginPath(); pctx.moveTo(x, y); pctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); pctx.stroke();
    }
    const v = pctx.createRadialGradient(STAGE.W / 2, STAGE.H / 2, STAGE.H * 0.35, STAGE.W / 2, STAGE.H / 2, STAGE.W * 0.65);
    v.addColorStop(0, 'rgba(120,100,70,0)');
    v.addColorStop(1, 'rgba(120,100,70,0.14)');
    pctx.fillStyle = v;
    pctx.fillRect(0, 0, STAGE.W, STAGE.H);
    World.drawPath(pctx);
    pctx.font = `16px ${FONT_BRUSH}`;
    pctx.fillStyle = 'rgba(107,100,88,0.7)';
    pctx.fillText('入', 14, 82);
    pctx.fillText('出', STAGE.W - 30, 470);
  }

  function resetGame() {
    World.reset();
    Towers.reset();
    FX.reset();
    // 开场把敌人铺满整条路，两座塔第一眼就都在出手
    for (let i = 0; i < 22; i++) {
      World.spawn(i === 9 ? 'giant' : i % 3 === 2 ? 'ghost' : 'corpse');
      World.enemies[World.enemies.length - 1].s = 60 + i * 58;
    }
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, STAGE.W, STAGE.H);
    ctx.save();
    const sh = FX.shake;
    if (sh > 0) ctx.translate(rnd(-sh, sh) * 0.6, rnd(-sh, sh) * 0.6);
    ctx.drawImage(paper, 0, 0, STAGE.W, STAGE.H);
    ctx.drawImage(stain, 0, 0, STAGE.W, STAGE.H);
    Towers.drawGround(ctx);
    World.drawEnemies(ctx);
    Towers.drawTowers(ctx);
    Towers.drawShots(ctx);
    FX.drawWorld(ctx);
    FX.drawNumbers(ctx);
    ctx.restore();
    FX.drawHud(ctx);
    if (!state.running) {
      ctx.fillStyle = 'rgba(242,236,223,0.55)';
      ctx.fillRect(0, 0, STAGE.W, STAGE.H);
      ctx.fillStyle = COLORS.seal;
      ctx.font = `64px ${FONT_BRUSH}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('停', STAGE.W / 2, STAGE.H / 2);
    }
  }

  const statEls = {
    kills: document.getElementById('stat-kills'),
    leaks: document.getElementById('stat-leaks'),
    best: document.getElementById('stat-best'),
    field: document.getElementById('stat-field'),
  };
  let statTimer = 0;
  function updateStats(dt) {
    statTimer -= dt;
    if (statTimer > 0) return;
    statTimer = 0.2;
    statEls.kills.textContent = World.kills;
    statEls.leaks.textContent = World.leaks;
    statEls.best.textContent = FX.bestCombo;
    statEls.field.textContent = World.enemies.length;
  }

  let last = performance.now();
  function frame(now) {
    const real = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.running) {
      let dt = real * state.speed;
      if (FX.hitstop > 0) { FX.hitstop -= dt; dt *= 0.06; }
      World.update(dt);
      Towers.update(dt);
      FX.update(dt);
    }
    render();
    updateStats(real);
    Diagrams.draw(now);
    requestAnimationFrame(frame);
  }

  // ---- 输入 ----
  function toStage(ev) {
    const r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width * STAGE.W, y: (ev.clientY - r.top) / r.height * STAGE.H };
  }

  function tryCast(type) {
    const t = Towers.get(type);
    if (!t) return;
    if (Towers.cast(type)) return;
    const msg = t.charge < 1 ? `蓄力 ${Math.floor(t.charge * 100)}%` : '无敌可打';
    FX.numbers.push({ x: t.x, y: t.y - t.size * 0.7, vy: -30, text: msg, size: 18, color: COLORS.inkSoft, life: 0.9, max: 0.9 });
  }

  canvas.addEventListener('pointerdown', (ev) => {
    const p = toStage(ev);
    const t = Towers.hitTest(p.x, p.y);
    if (t) tryCast(t.type);
  });
  canvas.addEventListener('pointermove', (ev) => {
    const p = toStage(ev);
    canvas.style.cursor = Towers.hitTest(p.x, p.y) ? 'pointer' : 'default';
  });

  function setPaused(paused) {
    state.running = !paused;
    const btn = document.getElementById('btn-pause');
    btn.textContent = paused ? '继续' : '暂停';
    btn.setAttribute('aria-pressed', String(paused));
  }

  document.addEventListener('keydown', (ev) => {
    if (ev.target.closest && ev.target.closest('input, textarea')) return;
    if (ev.code === 'Space') { ev.preventDefault(); setPaused(state.running); }
    else if (ev.key === 'q' || ev.key === 'Q') tryCast('fire');
    else if (ev.key === 'w' || ev.key === 'W') tryCast('water');
  });

  // ---- 控件 ----
  const apply = {
    mode: (v) => { Towers.mode = v; },
    feedback: (v) => { FX.feedback = v === 'on'; },
    density: (v) => { World.density = v; },
    speed: (v) => { state.speed = Number(v); },
    cast: (v) => { Towers.auto = v === 'auto'; },
    roster: (v) => { Towers.roster = v; resetGame(); },
  };
  document.querySelectorAll('[data-group]').forEach((group) => {
    const name = group.dataset.group;
    group.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-value]');
      if (!btn) return;
      group.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      apply[name](btn.dataset.value);
    });
  });
  document.getElementById('btn-pause').addEventListener('click', () => setPaused(state.running));
  document.getElementById('btn-reset').addEventListener('click', () => { resetGame(); setPaused(false); });

  // ---- 字形拆解图：循环演示笔顺，普攻笔画着元素色 ----
  const Diagrams = {
    items: [],
    init() {
      for (const el of document.querySelectorAll('canvas[data-glyph]')) {
        const type = el.dataset.glyph;
        el.width = 220 * dpr; el.height = 220 * dpr;
        this.items.push({ el, c: el.getContext('2d'), type });
      }
    },
    draw(now) {
      const cycle = 5200, t = (now % cycle) / cycle * 5.2;
      for (const d of this.items) {
        const { c, type } = d;
        const glyph = GLYPHS[type];
        const color = type === 'fire' ? COLORS.fire : COLORS.water;
        const normal = type === 'fire' ? [0, 1] : [0];
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, 220, 220);
        c.strokeStyle = 'rgba(180,71,58,0.28)';
        c.lineWidth = 1;
        c.setLineDash([4, 5]);
        c.strokeRect(20, 20, 180, 180);
        c.beginPath(); c.moveTo(110, 20); c.lineTo(110, 200); c.moveTo(20, 110); c.lineTo(200, 110); c.stroke();
        c.setLineDash([]);
        Brush.drawGlyph(c, glyph, { x: 110, y: 110, size: 172, paper: '#f7f2e7' }, (i) => ({
          progress: Math.max(0, Math.min(1, (t - i * 0.6) / 0.55)),
          color: normal.includes(i) ? color : COLORS.ink,
        }));
      }
    },
  };

  World.buildPath();
  paintPaper();
  FX.init(sctx);
  Diagrams.init();
  resetGame();
  requestAnimationFrame(frame);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { pctx.clearRect(0, 0, STAGE.W, STAGE.H); paintPaper(); });
})();
