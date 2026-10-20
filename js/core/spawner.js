// 连续刷怪与限时坚守调度（工单 04）。塔防 Game 与征服 ConquestGame 共用。
//
// 宿主（game）需提供：
//   enemies[]            场上敌人
//   spawnGlyphEnemy(type, opts) 创建并加入一只敌人，返回该敌人（opts: pathIndex、s、summoned）
//   aliveEnemyCount()     存活数（用于 ENEMY_CAP）
//   gameOver(victory)     终局
//   coreHp                核心血量（塔防胜利要求 > 0；征服不扣血，始终 > 0）
// 调度写在宿主上的字段：density、spawnAcc、giantTimer、holdTotal、holdLeft、battleActive、
//   elapsed（开战后经过的游戏时间，暂停不走）、heavyTimers、spawnedElites、duel（决战）等。
//
// 关卡数据带 roster 时按编排刷怪（工单 01，见 spawn-schedule.js）；没有 roster 的关卡（征服、旧数据）
// 走原来的「尸鬼比例 + 定时一只巨」逻辑，行为不变。首领胜负见 boss.js。
const BattleDirector = {
  /** 每次进场的默认档位（不记忆上次选择，A7） */
  defaultDensity() {
    return CONFIG.DENSITY_DEFAULT;
  },

  levelOf(game) {
    return game.currentLevelData || game.levelConfig || {};
  },

  /** 玩家确认敌潮档位后开战：重置计时与计数，开始从入口刷怪 */
  begin(game, densityKey) {
    const key = CONFIG.DENSITY[densityKey] ? densityKey : this.defaultDensity();
    game.density = key;
    game.spawnAcc = 0;
    game.giantTimer = CONFIG.SPAWN.firstGiantDelay;
    const level = this.levelOf(game);
    game.holdTotal = level.holdSeconds || CONFIG.HOLD_SECONDS;
    game.holdLeft = game.holdTotal;
    game.kills = 0;
    game.leaks = 0;
    game.elapsed = 0;
    game.spawnedElites = new Set();
    game.bossSpawned = false;
    game.duel = false;
    game.heavyTimers = (level.heavy || []).map((h) => (h.first != null ? h.first : this.heavyEvery(h, key)));
    BossFlow.reset(game);
    game.battleActive = true;
  },

  heavyEvery(h, key) { return SpawnSchedule.heavyEvery(h, key); },

  /** 每帧调用，dt 单位为秒 */
  update(game, dt) {
    if (!game.battleActive || game.gameEnded) return;
    const dens = CONFIG.DENSITY[game.density];
    const level = this.levelOf(game);
    game.elapsed = (game.elapsed || 0) + dt;
    BossFlow.tick(game, dt);

    if (level.roster) this.updateRoster(game, level, dens, dt);
    else this.updateLegacy(game, dens, dt);

    if (!game.duel) {
      game.holdLeft -= dt;
      if (game.holdLeft <= 0) game.holdLeft = 0;
    }
    BossFlow.checkVictory(game, level);
  },

  // 旧逻辑：没有 roster 的关卡（征服、旧数据）
  updateLegacy(game, dens, dt) {
    const cap = CONFIG.ENEMY_CAP;
    game.spawnAcc += dt * dens.rate;
    while (game.spawnAcc >= 1) {
      game.spawnAcc -= 1;
      // 满上限只暂停刷怪，不算失败
      if (game.aliveEnemyCount() < cap) {
        game.spawnGlyphEnemy(Math.random() < CONFIG.SPAWN.corpseRatio ? 'corpse' : 'ghost');
      }
    }
    game.giantTimer -= dt;
    if (game.giantTimer <= 0) {
      game.giantTimer = dens.giantEvery;
      if (game.aliveEnemyCount() < cap) game.spawnGlyphEnemy('giant');
    }
  },

  // 编排逻辑：roster 抽取、重敌间隔、精英与首领时间点、加压时段、首领出场缓冲期
  updateRoster(game, level, dens, dt) {
    const cap = CONFIG.ENEMY_CAP;
    const t = game.elapsed;
    // 精英、首领：按 at 准时出场，各只一次；不受敌潮档位影响，决战阶段不再出
    if (!game.duel) {
      for (const i of SpawnSchedule.dueElites(level, t, game.spawnedElites)) {
        game.spawnedElites.add(i);
        const el = level.elites[i];
        if (game.aliveEnemyCount() < cap) BossFlow.markEntry(game, game.spawnGlyphEnemy(el.type, { pathIndex: el.path }));
      }
      if (level.boss && !game.bossSpawned && t >= level.boss.at) {
        game.bossSpawned = true;
        const boss = game.spawnGlyphEnemy(level.boss.type, { pathIndex: level.boss.path });
        BossFlow.onBossSpawn(game, boss);
      }
    }
    if (game.duel && CONFIG.BOSS.duelSpawnStop) return;

    // 普通刷怪：速率 × 加压时段 × 首领出场缓冲期
    let rate = dens.rate * SpawnSchedule.surgeMul(level, t);
    rate *= BossFlow.calmMul(game);
    game.spawnAcc += dt * rate;
    while (game.spawnAcc >= 1) {
      game.spawnAcc -= 1;
      if (game.aliveEnemyCount() >= cap) continue;
      const type = SpawnSchedule.pickRosterType(level, t);
      if (type) game.spawnGlyphEnemy(type);
    }
    // 重敌：每种各自计时
    (level.heavy || []).forEach((h, i) => {
      if (t < (h.from || 0)) return;
      game.heavyTimers[i] -= dt;
      if (game.heavyTimers[i] <= 0) {
        game.heavyTimers[i] = SpawnSchedule.heavyEvery(h, game.density);
        if (game.aliveEnemyCount() < cap) game.spawnGlyphEnemy(h.type);
      }
    });
  },

  /** 倒计时文字：mm:ss；首领被斩后附「首级已斩」；决战阶段显示「斩首」 */
  holdLabel(game) {
    if (game.duel) return '斩首';
    const t = this.formatHold(game.holdLeft);
    return game.bossSlain ? `${t} · 首级已斩` : t;
  },

  /** 倒计时文字 mm:ss */
  formatHold(seconds) {
    const t = Math.max(0, Math.ceil(seconds));
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },
};

if (typeof window !== 'undefined') window.BattleDirector = BattleDirector;
