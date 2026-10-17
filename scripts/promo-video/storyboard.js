// 宣传片分镜：renderAt(t) 把第 t 秒的画面画到 #stage（1920x1080）。
// 起笔泼墨 → 山水路径成形 → 炮塔字落位 → 敌群来袭 → 合字特写 ×3 → 首领来袭 → 标题定格。
(function () {
  const { W, H, ease, prog, lerp, rng, clamp01, glyph, softDot, splash, pointAt, PathLayer, makePaper, makeMountains, canvas, FONT } = INK;
  const T = PROMO_T;
  const C = T.colors;
  const cv = document.getElementById('stage');
  const g = cv.getContext('2d');

  const paper = makePaper();
  const mountains = makeMountains();
  const road = new PathLayer(T.path, 84);
  const info = road.info;
  const gridCanvas = (() => {
    const c = canvas(); const x = c.getContext('2d');
    x.strokeStyle = 'rgba(203,194,173,0.7)'; x.lineWidth = 1.4;
    for (let i = 0; i <= W; i += 72) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); }
    for (let j = 0; j <= H; j += 72) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); }
    return c;
  })();

  const rgbOf = (hex) => { const n = parseInt(hex.slice(1), 16); return `${n >> 16},${(n >> 8) & 255},${n & 255}`; };

  // ---------------- 战场模拟（确定性，固定步长） ----------------
  const TYPES = {
    corpse: { ch: '尸', size: 84, hp: 7, speed: 135 },
    ghost: { ch: '鬼', size: 84, hp: 7, speed: 150 },
    armor: { ch: '甲', size: 86, hp: 12, speed: 110 },
    shadow: { ch: '影', size: 86, hp: 8, speed: 165 },
    giant: { ch: '巨尸', size: 96, hp: 28, speed: 88 },
  };
  const KIND = {
    fire: { rate: 0.7, dmg: 1, range: 235 }, ice: { rate: 0.85, dmg: 1, range: 270, slow: true },
    thunder: { rate: 0.95, dmg: 2, range: 300 }, water: { rate: 0.9, dmg: 1, range: 270, slow: true },
    wind: { rate: 0.8, dmg: 1, range: 270 }, gold: { rate: 1.0, dmg: 2, range: 300 },
    wood: { rate: 0.85, dmg: 1, range: 270 }, light: { rate: 0.9, dmg: 2, range: 300 }, dark: { rate: 0.9, dmg: 1, range: 270 },
  };
  const FUSED = { 炎: { rate: 0.4, dmg: 3, range: 320 }, 霆: { rate: 0.5, dmg: 4, range: 360 }, 凌: { rate: 0.45, dmg: 2, range: 320, slow: true } };

  const SPAWNS = [];
  for (let i = 0; i < 14; i++) SPAWNS.push({ t: 12.0 + i * 0.75, type: i % 3 === 2 ? 'ghost' : 'corpse' });
  SPAWNS.push({ t: 16.8, type: 'armor' }, { t: 19.4, type: 'armor' });
  for (let i = 0; i < 12; i++) SPAWNS.push({ t: 21 + i * 0.7, type: ['corpse', 'ghost', 'shadow'][i % 3] });
  SPAWNS.push({ t: 24.8, type: 'giant' }, { t: 29.5, type: 'giant' });
  for (let i = 0; i < 5; i++) SPAWNS.push({ t: 29 + i * 0.9, type: 'shadow' });
  for (let i = 0; i < 8; i++) SPAWNS.push({ t: 34.0 + i * 0.5, type: i % 2 ? 'ghost' : 'shadow' });
  SPAWNS.sort((a, b) => a.t - b.t);

  const towerPos = Object.fromEntries(T.towers.map((t) => [t.id, t]));
  const fusionOf = (id) => T.fusions.find((f) => f.a === id || f.b === id);

  // 炮塔在时刻 t 的状态：hidden / normal / fused，以及不透明度
  function towerState(tw, t) {
    if (t < tw.t) return { vis: false };
    const f = fusionOf(tw.id);
    if (!f) return { vis: true, alpha: 1, glyph: tw.glyph, color: tw.color, size: 46, fused: false, canFire: t > tw.t + 0.5 };
    const into = t - f.t;
    if (into < 0) return { vis: true, alpha: 1, glyph: tw.glyph, color: tw.color, size: 46, fused: false, canFire: t > tw.t + 0.5 };
    if (tw.id === f.b) return into < 0.5 ? { vis: true, alpha: 1 - into / 0.5, glyph: tw.glyph, color: tw.color, size: 46, fused: false, canFire: false } : { vis: false };
    if (into < 0.5) return { vis: true, alpha: 1 - into / 0.5, glyph: tw.glyph, color: tw.color, size: 46, fused: false, canFire: false };
    if (into < 2.5) return { vis: false };
    return { vis: true, alpha: clamp01((into - 2.5) / 0.5), glyph: f.glyph, color: f.color, size: 60, fused: true, canFire: into > 3.0, fusion: f };
  }

  let sim = null;
  function newSim() {
    return { t: 0, rand: rng(77), enemies: [], deaths: [], hits: [], shots: [], cd: {}, spawnIdx: 0, nextId: 1, boss: null, bossDeadAt: null, cdInit: false, camX: 0, camY: 0 };
  }
  const aliveEnemies = (s) => s.enemies.filter((e) => !e.dead);

  function stepSim(s, dt) {
    s.t += dt;
    while (s.spawnIdx < SPAWNS.length && SPAWNS[s.spawnIdx].t <= s.t) {
      const sp = SPAWNS[s.spawnIdx++]; const ty = TYPES[sp.type];
      s.enemies.push({ id: s.nextId++, type: sp.type, d: 0, hp: ty.hp, speed: ty.speed * (0.94 + s.rand() * 0.12), born: sp.t, slowUntil: 0 });
    }
    if (!s.boss && s.t >= T.bossSpawn) {
      s.boss = { id: s.nextId++, type: 'boss', boss: true, d: 0, hp: 9999, speed: 380, born: T.bossSpawn, slowUntil: 0 };
      s.enemies.push(s.boss);
    }
    for (const e of s.enemies) {
      if (e.dead) continue;
      const slow = e.slowUntil > s.t ? 0.55 : 1;
      e.d += e.speed * slow * dt;
      if (e.boss && s.t >= T.bossDeath) { e.dead = true; e.diedAt = s.t; e.big = true; s.deaths.push({ x: pointAt(info, e.d).x, y: pointAt(info, e.d).y, t: s.t, boss: true, type: 'boss' }); }
      else if (!e.boss && e.d >= info.total * 0.96) { e.dead = true; e.diedAt = s.t; s.leaks = (s.leaks || 0) + 1; }
    }
    // 炮塔开火
    for (const tw of T.towers) {
      const st = towerState(tw, s.t);
      if (!st.vis || !st.canFire) continue;
      const kind = st.fused ? FUSED[st.glyph] : KIND[tw.kind];
      s.cd[tw.id] = (s.cd[tw.id] === undefined ? s.rand() * 0.6 : s.cd[tw.id]) - dt;
      if (s.cd[tw.id] > 0) continue;
      let best = null, bestScore = -1;
      for (const e of s.enemies) {
        if (e.dead || e.d < 20) continue;
        const p = pointAt(info, e.d);
        if (Math.hypot(p.x - tw.x, p.y - tw.y) > kind.range) continue;
        const score = e.boss ? 1e6 : e.d;
        if (score > bestScore) { bestScore = score; best = e; }
      }
      if (best) {
        s.shots.push({ from: tw, color: st.color, kind: tw.kind, fused: st.fused, target: best, t0: s.t, dur: 0.22, dmg: kind.dmg, slow: kind.slow });
        s.cd[tw.id] = kind.rate * (0.9 + s.rand() * 0.2);
        s.pulse = s.pulse || {}; s.pulse[tw.id] = s.t;
      } else s.cd[tw.id] = 0.1;
    }
    const keep = [];
    for (const sh of s.shots) {
      if (s.t < sh.t0 + sh.dur) { keep.push(sh); continue; }
      const e = sh.target; if (e.dead) continue;
      const p = pointAt(info, e.d);
      s.hits.push({ x: p.x, y: p.y, t: s.t, color: sh.color, seed: s.nextId++ });
      if (sh.slow) e.slowUntil = s.t + 1.2;
      if (!e.boss) { e.hp -= sh.dmg; if (e.hp <= 0) { e.dead = true; e.diedAt = s.t; s.deaths.push({ x: p.x, y: p.y, t: s.t, type: e.type, seed: e.id, d: e.d }); } }
    }
    s.shots = keep;
    // 镜头跟随敌群重心（平滑，确定性）
    const alive = s.enemies.filter((e) => !e.dead);
    let tx = 0, ty = 0;
    if (alive.length) {
      let cx = 0, cy = 0;
      for (const e of alive) { const p = pointAt(info, e.d); const w = e.boss ? 4 : 1; cx += p.x * w; cy += p.y * w; }
      const wsum = alive.reduce((a, e) => a + (e.boss ? 4 : 1), 0);
      tx = Math.max(-100, Math.min(100, -(cx / wsum - 960) * 0.4));
      ty = Math.max(-50, Math.min(50, -(cy / wsum - 540) * 0.25));
    }
    s.camX += (tx - s.camX) * 0.03; s.camY += (ty - s.camY) * 0.03;
    s.hits = s.hits.filter((h) => s.t - h.t < 0.8);
    s.deaths = s.deaths.filter((d) => s.t - d.t < (d.boss ? 2.6 : 1.2));
    s.enemies = s.enemies.filter((e) => !e.dead || s.t - e.diedAt < 0.5);
  }
  function seek(t) {
    if (!sim || t < sim.t - 1e-6) sim = newSim();
    while (sim.t + 1 / 60 <= t + 1e-9) stepSim(sim, 1 / 60);
    return sim;
  }

  // ---------------- 镜头 ----------------
  function camera(t, s) {
    const z = 1 + 0.14 * ease.inOut(prog(t, 6, 36));
    let dx = Math.sin(t * 0.35) * 10 + s.camX, dy = Math.cos(t * 0.27) * 7 + s.camY;
    const shake = t > T.bossDeath && t < T.bossDeath + 0.7 ? (1 - (t - T.bossDeath) / 0.7) * 16 : 0;
    dx += Math.sin(t * 90) * shake; dy += Math.cos(t * 77) * shake;
    // 平移幅度不能超过缩放留出的余量，否则会露出舞台边缘
    const limX = 960 * (1 - 1 / z) * 0.92, limY = 540 * (1 - 1 / z) * 0.92;
    return { z, dx: Math.max(-limX, Math.min(limX, dx)), dy: Math.max(-limY, Math.min(limY, dy)) };
  }
  const toScreen = (x, y, cam) => ({ x: 960 + (x - 960 + cam.dx) * cam.z, y: 540 + (y - 540 + cam.dy) * cam.z });

  // ---------------- 绘制部件 ----------------
  function drawInkDrop(t) {
    const a = t - T.drop;
    if (t > T.drop - 1.1 && a < 0) { // 下落
      const k = ease.in(prog(t, T.drop - 1.1, T.drop));
      const y = lerp(-60, 540, k);
      g.fillStyle = 'rgba(28,26,23,0.95)'; g.beginPath(); g.ellipse(960, y, 11, 11 + 22 * k, 0, 0, 6.3); g.fill();
    }
    if (a < 0 || a > 4.2) return;
    const fade = 1 - ease.inOut(prog(a, 1.6, 4.2));
    for (let i = 0; i < 4; i++) {
      const r = (30 + ease.out(prog(a, 0, 1.6)) * (200 - i * 36)) * (1 + Math.sin(a * 2 + i) * 0.015);
      softDot(g, 960, 540, r, '28,26,23', (0.5 - i * 0.09) * fade);
    }
    g.fillStyle = `rgba(28,26,23,${0.9 * fade})`; g.beginPath(); g.arc(960, 540, 18 + ease.out(prog(a, 0, 0.5)) * 34, 0, 6.3); g.fill();
    splash(g, t, T.drop, 960, 540, { seed: 5, n: 46, speed: 760, size: 8, life: 1.7, gravity: 40 });
    splash(g, t, T.drop, 960, 540, { seed: 6, n: 22, speed: 380, size: 12, life: 2.2, alpha: 0.6 });
  }

  function drawMist(t) {
    const blobs = [[300, 640, 340], [1100, 560, 420], [1650, 700, 360], [760, 800, 300]];
    blobs.forEach(([x, y, r], i) => {
      const k = ease.out(prog(t, 4 + i * 0.4, 8));
      softDot(g, x + Math.sin(t * 0.18 + i * 2) * 90, y + Math.cos(t * 0.13 + i) * 22, r, '250,246,236', 0.34 * k);
    });
  }

  function drawCore(t) {
    const k = ease.outBack(prog(t, T.pathEnd - 0.6, T.pathEnd + 0.4));
    if (k <= 0) return;
    const [x, y] = T.path[T.path.length - 1];
    const pulse = 1 + Math.sin(t * 3) * 0.04;
    g.save(); g.translate(x, y); g.scale(k * pulse, k * pulse);
    softDot(g, 0, 0, 110, '196,92,72', 0.22 + 0.06 * Math.sin(t * 3));
    g.fillStyle = 'rgba(28,26,23,0.22)'; g.beginPath(); g.ellipse(0, 52, 62, 16, 0, 0, 6.3); g.fill();
    g.fillStyle = C.coreDark; g.beginPath(); g.moveTo(0, 28); g.lineTo(0, 66); g.lineTo(-54, 38); g.lineTo(-54, -2); g.closePath(); g.fill();
    g.fillStyle = '#a24a39'; g.beginPath(); g.moveTo(0, 28); g.lineTo(0, 66); g.lineTo(54, 38); g.lineTo(54, -2); g.closePath(); g.fill();
    g.fillStyle = '#d7715c'; g.beginPath(); g.moveTo(-54, -2); g.lineTo(0, -32); g.lineTo(54, -2); g.lineTo(0, 28); g.closePath(); g.fill();
    g.fillStyle = C.paper; g.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 7 : 17; const a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(Math.cos(a) * r, -2 + Math.sin(a) * r * 0.62); }
    g.closePath(); g.fill();
    g.restore();
  }

  function drawTower(tw, t, s) {
    const st = towerState(tw, t);
    if (!st.vis) return;
    const age = t - (st.fused ? st.fusion.t + 2.5 : tw.t);
    const stamp = st.fused ? 1 : ease.outBack(prog(age, 0, 0.45));
    const pulseAt = s.pulse && s.pulse[tw.id];
    const recoil = pulseAt !== undefined && t - pulseAt < 0.16 ? 1 + 0.16 * (1 - (t - pulseAt) / 0.16) : 1;
    const sc = lerp(st.fused ? 1 : 1.9, 1, stamp) * recoil * (1 + 0.025 * Math.sin(t * 2.4 + tw.x));
    const rgb = rgbOf(st.color); const r = st.size * sc;
    g.save(); g.globalAlpha = st.alpha * clamp01(age / 0.2 + (st.fused ? 1 : 0));
    softDot(g, tw.x, tw.y, r * 2.2, rgb, st.fused ? 0.34 : 0.2);
    g.fillStyle = `rgba(${rgb},${st.fused ? 0.26 : 0.2})`; g.beginPath(); g.arc(tw.x, tw.y, r, 0, 6.3); g.fill();
    g.strokeStyle = `rgba(${rgb},0.38)`; g.lineWidth = 2; g.beginPath(); g.arc(tw.x, tw.y, r, 0, 6.3); g.stroke();
    if (st.fused) { // 融合塔外圈：缓慢转动的断续圆环
      g.setLineDash([14, 12]); g.lineDashOffset = -t * 18; g.strokeStyle = `rgba(${rgb},0.55)`; g.lineWidth = 3;
      g.beginPath(); g.arc(tw.x, tw.y, r + 12, 0, 6.3); g.stroke(); g.setLineDash([]);
    }
    glyph(g, st.glyph, tw.x, tw.y, st.fused ? 96 : 70, st.color, { scale: sc });
    g.restore();
    if (!st.fused && age >= 0 && age < 1.0) { // 落印涟漪与墨点
      const k = age / 1.0;
      g.strokeStyle = `rgba(${rgb},${0.5 * (1 - k)})`; g.lineWidth = 3; g.beginPath(); g.arc(tw.x, tw.y, 46 + k * 110, 0, 6.3); g.stroke();
      splash(g, t, tw.t, tw.x, tw.y, { seed: tw.x, n: 12, speed: 280, size: 5, rgb, life: 0.9, alpha: 0.7 });
    }
  }

  function drawEnemy(e, t) {
    const ty = e.boss ? { ch: '霸', size: 250 } : TYPES[e.type];
    const p = pointAt(info, e.d);
    const age = t - e.born;
    let alpha = clamp01(age / 0.35);
    if (e.dead) alpha = Math.max(0, 1 - (t - e.diedAt) / 0.35);
    if (alpha <= 0) return;
    const bob = Math.sin(e.d / 18) * 4;
    const x = p.x, y = p.y + bob;
    if (e.boss) {
      softDot(g, x, y, 330, '28,26,23', 0.34 * alpha);
      for (let i = 0; i < 5; i++) { const a = t * 1.3 + i * 1.26; softDot(g, x + Math.cos(a) * 150, y + Math.sin(a) * 120, 90, '28,26,23', 0.22 * alpha); }
      softDot(g, x, y, 220, '196,92,72', 0.12 * alpha);
    } else softDot(g, x, y + 10, 42, '28,26,23', 0.2 * alpha);
    for (let k = 3; k >= 1; k--) {
      const q = pointAt(info, e.d - k * (e.boss ? 26 : 14));
      glyph(g, ty.ch, q.x, q.y + bob, ty.size, '#1c1a17', { alpha: 0.2 * alpha / k, blur: 3 });
    }
    glyph(g, ty.ch, x, y, ty.size, '#1c1a17', { alpha, shadow: 'rgba(28,26,23,0.5)', shadowBlur: e.boss ? 24 : 9, scale: e.dead ? 1 + (t - e.diedAt) * 0.5 : 1 });
  }

  function drawShots(s, t) {
    for (const sh of s.shots) {
      const k = clamp01((t - sh.t0) / sh.dur);
      const e = sh.target; const p = pointAt(info, e.d);
      const hx = lerp(sh.from.x, p.x, k), hy = lerp(sh.from.y, p.y, k);
      const tk = Math.max(0, k - 0.4);
      const tx = lerp(sh.from.x, p.x, tk), ty = lerp(sh.from.y, p.y, tk);
      const rgb = rgbOf(sh.color);
      const gr = g.createLinearGradient(tx, ty, hx, hy);
      gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(1, `rgba(${rgb},0.95)`);
      g.strokeStyle = gr; g.lineCap = 'round'; g.lineWidth = sh.fused ? 9 : 6;
      g.beginPath();
      if (sh.kind === 'thunder') { // 雷：折线电弧
        const n = 6; g.moveTo(sh.from.x, sh.from.y);
        for (let i = 1; i <= n; i++) { const u = i / n * k; g.lineTo(lerp(sh.from.x, p.x, u) + (i < n ? Math.sin(i * 7 + sh.t0 * 9) * 14 : 0), lerp(sh.from.y, p.y, u) + (i < n ? Math.cos(i * 5 + sh.t0 * 7) * 14 : 0)); }
      } else { g.moveTo(tx, ty); g.lineTo(hx, hy); }
      g.stroke();
      softDot(g, hx, hy, sh.fused ? 20 : 14, rgb, 0.9);
    }
    for (const h of s.hits) splash(g, t, h.t, h.x, h.y, { seed: h.seed, n: 7, speed: 200, size: 4, rgb: rgbOf(h.color), life: 0.5, alpha: 0.9 });
  }

  function drawDeaths(s, t) {
    for (const d of s.deaths) {
      const age = t - d.t;
      if (d.boss) {
        const k = age / 2.6;
        softDot(g, d.x, d.y, 160 + 520 * ease.out(prog(age, 0, 1.2)), '28,26,23', 0.5 * (1 - k));
        for (let i = 0; i < 3; i++) {
          g.strokeStyle = `rgba(28,26,23,${0.55 * (1 - prog(age, i * 0.12, 1.1 + i * 0.12))})`; g.lineWidth = 8 - i * 2;
          g.beginPath(); g.arc(d.x, d.y, 40 + ease.out(prog(age, i * 0.12, 1.1 + i * 0.12)) * 520, 0, 6.3); g.stroke();
        }
        splash(g, t, d.t, d.x, d.y, { seed: 91, n: 70, speed: 1100, size: 15, life: 2.0, gravity: 60 });
        splash(g, t, d.t, d.x, d.y, { seed: 92, n: 40, speed: 600, size: 22, life: 2.4, alpha: 0.55 });
        splash(g, t, d.t, d.x, d.y, { seed: 93, n: 30, speed: 800, size: 9, rgb: '196,92,72', life: 1.6, alpha: 0.8 });
      } else {
        softDot(g, d.x, d.y, 30 + 46 * ease.out(prog(age, 0, 0.6)), '28,26,23', 0.3 * (1 - age / 1.2));
        splash(g, t, d.t, d.x, d.y, { seed: d.seed * 13, n: 14, speed: 300, size: 7, life: 1.0 });
      }
    }
  }

  function drawFusionCut(f, t, cam) {
    const a = t - f.t;
    if (a < 0 || a > 3.0) return;
    const rgb = rgbOf(f.color);
    const veil = 0.9 * Math.min(prog(a, 0, 0.35), 1 - prog(a, 2.5, 3.0));
    g.fillStyle = `rgba(244,239,228,${veil})`; g.fillRect(0, 0, W, H);
    softDot(g, 960, 540, 760 * (0.85 + 0.12 * Math.sin(a * 3)), rgbOf(f.wash), 0.9 * veil);
    const slide = ease.in(prog(a, 0.35, 1.05));
    if (a < 1.05) {
      const al = prog(a, 0.3, 0.6);
      for (const dir of [-1, 1]) {
        const x = lerp(960 + dir * 420, 960 + dir * 36, slide);
        for (let k = 1; k <= 4; k++) glyph(g, f.from, x - dir * k * 30 * slide, 540, 330, '#1c1a17', { alpha: al * 0.16 / k, blur: 6 });
        glyph(g, f.from, x, 540, 330, '#1c1a17', { alpha: al, shadow: f.color, shadowBlur: 26 });
      }
    }
    const c = a - 1.05;
    if (c >= 0) {
      for (let k = 0; k < 3; k++) {
        const u = prog(c, k * 0.1, 1.0 + k * 0.1);
        g.strokeStyle = `rgba(${rgb},${0.65 * (1 - u)})`; g.lineWidth = 10 - k * 3;
        g.beginPath(); g.arc(960, 540, 60 + ease.out(u) * 780, 0, 6.3); g.stroke();
      }
      splash(g, t, f.t + 1.05, 960, 540, { seed: 41, n: 56, speed: 1000, size: 11, life: 1.3, alpha: 0.9 });
      splash(g, t, f.t + 1.05, 960, 540, { seed: 42, n: 40, speed: 760, size: 9, rgb, life: 1.3, alpha: 0.85 });
      const exit = ease.inOut(prog(a, 2.3, 3.0));
      const dest = toScreen(towerPos[f.a].x, towerPos[f.a].y, cam);
      const px = lerp(960, dest.x, exit), py = lerp(540, dest.y, exit);
      const size = lerp(520, 96 * cam.z, exit);
      const pop = ease.outBack(prog(c, 0, 0.5));
      glyph(g, f.glyph, px, py, size, '#1c1a17', {
        alpha: prog(c, 0, 0.08) * (1 - prog(a, 2.75, 3.0)), scale: lerp(1.45, 1, pop), blur: lerp(18, 0, prog(c, 0, 0.25)), shadow: f.color, shadowBlur: lerp(50, 8, exit),
      });
      const flash = 0.7 * (1 - prog(c, 0, 0.22));
      if (flash > 0) { g.fillStyle = `rgba(255,252,244,${flash})`; g.fillRect(0, 0, W, H); }
    }
  }

  function revealGlyph(ch, x, y, size, a, start) {
    const p = prog(a, start, start + 1.3);
    if (p <= 0) return;
    glyph(g, ch, x, y, size, '#1c1a17', { alpha: ease.out(prog(p, 0, 0.45)), blur: lerp(26, 0, ease.out(p)), scale: lerp(1.07, 1, ease.out(p)), shadow: 'rgba(28,26,23,0.35)', shadowBlur: 14 });
    splash(g, a + T.titleStart, T.titleStart + start, x, y, { seed: Math.floor(x + y), n: 16, speed: 420, size: 6, life: 1.1, alpha: 0.6 });
  }
  function drawTitle(t) {
    const a = t - T.titleStart;
    if (a < 0) return;
    const edge = lerp(-420, W + 420, ease.inOut(prog(a, 0, 1.5)));
    const lg = g.createLinearGradient(edge - 420, 0, edge, 0);
    lg.addColorStop(0, 'rgba(244,239,228,0.93)'); lg.addColorStop(1, 'rgba(244,239,228,0)');
    g.fillStyle = 'rgba(244,239,228,0.93)'; g.fillRect(0, 0, Math.max(0, edge - 420), H);
    g.fillStyle = lg; g.fillRect(edge - 420, 0, 420, H);
    revealGlyph('墨', 770, 520, 640, a, 0.9);
    revealGlyph('守', 1140, 330, 190, a, 1.8);
    revealGlyph('成', 1140, 560, 190, a, 2.15);
    revealGlyph('规', 1140, 790, 190, a, 2.5);
  }

  // ---------------- 主入口 ----------------
  function renderAt(t) {
    const s = seek(t);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.filter = 'none';
    g.drawImage(paper, 0, 0);
    drawInkDrop(t);

    const cam = camera(t, s);
    g.save();
    g.translate(960, 540); g.scale(cam.z, cam.z); g.translate(-960 + cam.dx, -540 + cam.dy);
    const gridA = 0.55 * ease.out(prog(t, 4.4, 6.4));
    if (gridA > 0) { g.globalAlpha = gridA; g.drawImage(gridCanvas, 0, 0); g.globalAlpha = 1; }
    mountains.forEach((layer, i) => {
      const p = ease.out(prog(t, T.mountains[0] + i * 0.5, T.mountains[1] + i * 0.3));
      if (p <= 0) return;
      g.globalAlpha = p; g.drawImage(layer, 0, (1 - p) * 40); g.globalAlpha = 1;
    });
    drawMist(t);
    road.upTo(info.total * ease.inOut(prog(t, T.pathStart, T.pathEnd)));
    g.drawImage(road.canvas, 0, 0);
    drawCore(t);
    for (const tw of T.towers) drawTower(tw, t, s);
    for (const e of s.enemies) drawEnemy(e, t);
    drawShots(s, t);
    drawDeaths(s, t);
    g.restore();

    for (const f of T.fusions) drawFusionCut(f, t, cam);
    drawTitle(t);
  }

  // 调参用：整段模拟的击杀位置分布
  window.simStats = function () {
    sim = newSim(); const ds = []; let maxAlive = 0;
    const seen = new Set();
    while (sim.t < T.bossDeath) {
      stepSim(sim, 1 / 60);
      for (const d of sim.deaths) if (!d.boss && !seen.has(d)) { seen.add(d); ds.push(d.d / info.total); }
      maxAlive = Math.max(maxAlive, sim.enemies.filter((e) => !e.dead).length);
    }
    const leaks = sim && sim.leaks; sim = null;
    ds.sort((a, b) => a - b);
    return { leaks: leaks || 0, n: ds.length, min: ds[0], med: ds[Math.floor(ds.length / 2)], max: ds[ds.length - 1], maxAlive };
  };
  window.renderAt = renderAt;
  window.promoReady = document.fonts.load(`100px ${FONT}`, '墨守成规火水雷木金冰风光暗炎霆凌尸鬼甲影巨霸').then(() => document.fonts.ready);
})();
