// 首领流程（工单 01 §3.3）：出场、斩首、到达核心、关底胜负。塔防 Game 与征服 ConquestGame 共用 BattleDirector，
// 没有首领的关卡（征服、1-1～1-4 等）走 checkVictory 的老分支：坚守计时结束且核心血量 > 0 即胜。
//
// 关底判定（需同时满足坚守与斩首，数值见 CONFIG.BOSS）：
//   计时结束、首领已死、核心血量 > 0 → 胜利
//   计时结束、首领还活着             → 进入「决战」：停止普通刷怪，倒计时文字变「斩首」，之后首领死亡且核心血量 > 0 即胜
//   计时结束前首领被斩               → 剩余坚守时间立即 × killEarlyHoldMul，计时继续，横幅「首级已斩」
//   首领第 1 次到达核心              → 扣核心上限的 coreHitRatio（向上取整），首领带着当前血量回到入口重新走
//   首领第 2 次到达核心              → 直接失败，原因「首领破阵」
//   核心血量归零                     → 失败（原有规则；与斩首同一帧时失败优先）
const BossFlow = {
  // 开战时清空首领相关状态
  reset(game) {
    game.boss = null;
    game.bossSlain = false;
    game.bossCoreHits = 0;
    game.bossSlainAt = null;
    game.nightT = 0;
    game.nightRangeMul = 1;
    game.nightDim = 0;
    game.bossBanner = null;
    game.bossEntryAt = null;
    game.bossOmen = null;
    game.entrySeals = [];
    game.failReason = null;
  },

  // 首领刚刷出
  onBossSpawn(game, boss) {
    game.boss = boss;
    game.bossEntryAt = game.elapsed;
    game.bossOmen = null;
    boss.fresh = 0;
    this.banner(game, `首领 · ${boss.displayName}`);
  },

  // 精英出场：入口处一枚朱砂小印（精英名），持续 1.2 秒；镜头不自动移动
  markEntry(game, enemy) {
    if (!game.entrySeals) game.entrySeals = [];
    game.entrySeals.push({ x: enemy.x, y: enemy.y, text: enemy.displayName, t: 0, max: 1.2 });
  },

  // 首领出场前 omenSeconds 秒：入口处墨晕扩散，并响起预兆音
  updateOmen(game, level, dt) {
    if (game.bossOmen) { game.bossOmen.t += dt; return; }
    const b = level && level.boss;
    if (!b || game.bossSpawned || game.elapsed < b.at - CONFIG.BOSS.omenSeconds) return;
    const paths = Array.isArray(game.path[0]) ? game.path : [game.path];
    const idx = b.path != null && b.path < paths.length ? b.path : 0;
    const track = game.getPathTrack(paths[idx]);
    const p = track.pointAt(0);
    game.bossOmen = { x: p.x, y: p.y, t: 0 };
    if (window.InkAudio) window.InkAudio.play('boss_omen');
  },

  // 首领出场后的缓冲期：普通刷怪速率打折
  calmMul(game) {
    const B = CONFIG.BOSS;
    if (game.bossEntryAt == null) return 1;
    return game.elapsed - game.bossEntryAt < B.entryCalmSeconds ? B.entryCalmRateMul : 1;
  },

  // 横幅：首领名、首级已斩、卷土重来
  banner(game, text) {
    game.bossBanner = { text, life: CONFIG.BOSS.bannerSeconds, max: CONFIG.BOSS.bannerSeconds };
  },

  // 每帧（BattleDirector.update 调用）：夜幕、横幅计时
  tick(game, dt) {
    if (game.entrySeals && game.entrySeals.length) {
      for (const s of game.entrySeals) s.t += dt;
      game.entrySeals = game.entrySeals.filter((s) => s.t < s.max);
    }
    if (game.boss && game.boss.fresh != null && game.boss.fresh < 2) game.boss.fresh += dt;
    this.updateOmen(game, BattleDirector.levelOf(game), dt);
    if (game.nightT > 0) {
      game.nightT -= dt;
      if (game.nightT <= 0) { game.nightT = 0; game.nightRangeMul = 1; game.nightDim = 0; }
    }
    if (game.bossBanner) {
      game.bossBanner.life -= dt;
      if (game.bossBanner.life <= 0) game.bossBanner = null;
    }
  },

  // 首领被击杀（Enemy.die 调用）
  onBossDeath(game, boss) {
    if (!game || game.boss !== boss) return;
    game.bossSlain = true;
    game.bossSlainAt = game.elapsed;
    this.banner(game, '首级已斩');
    // 计时结束前斩首：剩余坚守时间减半
    if (!game.duel && game.holdLeft > 0) game.holdLeft *= CONFIG.BOSS.killEarlyHoldMul;
    if (typeof GlyphFX !== 'undefined') {
      const hv = CONFIG.GLYPH_FEEDBACK.heavyKill;
      const k = CONFIG.BOSS.killHeavyMul;
      GlyphFX.addShake(hv.shake * k);
      GlyphFX.addHitstop(hv.hitstop * k);
      GlyphFX.ring(boss.x, boss.y, hv.ringR * k, CONFIG.GLYPH_COLORS.seal || '#b03a2e', 0.6, 8);
    }
  },

  // 首领走到终点（Enemy.reachCore 转交）
  onReachCore(game, boss) {
    const B = CONFIG.BOSS;
    game.bossCoreHits = (game.bossCoreHits || 0) + 1;
    game.leaks = (game.leaks || 0) + 1;
    if (window.InkAudio) window.InkAudio.play('core');
    if (game.bossCoreHits > B.maxCoreHits) {
      game.failReason = 'boss';
      game.coreHp = 0;
      boss.dead = true;
      game.updateUI();
      game.battleActive = false;
      game.gameOver(false);
      return;
    }
    game.coreHp -= Math.ceil(game.maxCoreHp * B.coreHitRatio);
    game.updateUI();
    if (game.coreHp <= 0) {
      boss.dead = true;
      game.battleActive = false;
      game.gameOver(false);
      return;
    }
    this.banner(game, '首领破阵 · 卷土重来');
    this.returnToEntry(game, boss);
  },

  // 卷土重来：带着当前血量回到入口，其余状态清空，短暂无敌
  returnToEntry(game, boss) {
    boss.s = 0;
    boss.carried = null;
    boss.pulledBy = null;
    boss.stun = 0;
    boss.iceTime = 0;
    boss.slowTime = 0;
    boss.chillStacks = 0;
    boss.chillTime = 0;
    boss.burnTime = 0;
    boss.burnStacks = 0;
    boss.wet = 0;
    boss.exposeTime = 0;
    boss.stagger = 0;
    boss.staggerT = 0;
    boss.invulnT = CONFIG.BOSS.returnInvuln;
    boss.syncPosition();
    if (game.runtimeIndexes) game.runtimeIndexes.rebuildEnemies();
  },

  // 胜负判定（BattleDirector.update 每帧末调用）。没有首领的关卡行为与原来完全一样
  checkVictory(game, level) {
    if (game.gameEnded || !game.battleActive) return;
    const hasBoss = SpawnSchedule.hasBoss(level);
    if (!hasBoss) {
      if (game.holdLeft <= 0 && game.coreHp > 0) {
        game.holdLeft = 0;
        game.battleActive = false;
        game.gameOver(true);
      }
      return;
    }
    // 失败优先：核心血量归零就不再判胜
    if (game.coreHp <= 0) return;
    const boss = game.boss;
    const bossDead = !!(boss && boss.dead && game.bossSlain);
    if (game.holdLeft <= 0) {
      if (bossDead) {
        game.battleActive = false;
        game.gameOver(true);
        return;
      }
      // 计时结束而首领还没出场（at 大于坚守时长的异常数据）或还活着：进入决战
      if (!game.duel && CONFIG.BOSS.duelSpawnStop) {
        game.duel = true;
        if (!game.bossSpawned && level.boss) {
          game.bossSpawned = true;
          const b = game.spawnGlyphEnemy(level.boss.type, { pathIndex: level.boss.path });
          this.onBossSpawn(game, b);
        }
      }
    }
  },

  // 首领血条用：首领是否在场
  active(game) {
    return !!(game.boss && !game.boss.dead);
  },
};

if (typeof window !== 'undefined') window.BossFlow = BossFlow;
