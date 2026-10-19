// 连续刷怪与限时坚守调度（工单 04）。塔防 Game 与征服 ConquestGame 共用。
//
// 宿主（game）需提供：
//   enemies[]            场上敌人
//   spawnGlyphEnemy(type) 创建并加入一只敌人，返回该敌人
//   aliveEnemyCount()     存活数（用于 ENEMY_CAP）
//   gameOver(victory)     终局
//   coreHp                核心血量（塔防胜利要求 > 0；征服不扣血，始终 > 0）
// 调度写在宿主上的字段：density、spawnAcc、giantTimer、holdTotal、holdLeft、battleActive。
const BattleDirector = {
  /** 每次进场的默认档位（不记忆上次选择，A7） */
  defaultDensity() {
    return CONFIG.DENSITY_DEFAULT;
  },

  /** 玩家确认敌潮档位后开战：重置计时与计数，预铺敌人，开始计时 */
  begin(game, densityKey) {
    const key = CONFIG.DENSITY[densityKey] ? densityKey : this.defaultDensity();
    game.density = key;
    game.spawnAcc = 0;
    game.giantTimer = CONFIG.SPAWN.firstGiantDelay;
    const level = game.currentLevelData || game.levelConfig || {};
    game.holdTotal = level.holdSeconds || CONFIG.HOLD_SECONDS;
    game.holdLeft = game.holdTotal;
    game.kills = 0;
    game.leaks = 0;
    game.battleActive = true;
    this.prefill(game);
  },

  /** 开局在路上预铺一批敌人，让塔第一眼就有目标 */
  prefill(game) {
    const cfg = CONFIG.SPAWN;
    for (let i = 0; i < cfg.prefillCount; i++) {
      const type = Math.random() < cfg.corpseRatio ? 'corpse' : 'ghost';
      const enemy = game.spawnGlyphEnemy(type);
      if (!enemy) continue;
      const s = cfg.prefillStart * CONFIG.CELL_SIZE + i * cfg.prefillSpacing;
      enemy.s = Math.min(s, enemy.track.total - CONFIG.CELL_SIZE);
      enemy.syncPosition();
    }
  },

  /** 每帧调用，dt 单位为秒 */
  update(game, dt) {
    if (!game.battleActive || game.gameEnded) return;
    const dens = CONFIG.DENSITY[game.density];
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

    game.holdLeft -= dt;
    if (game.holdLeft <= 0 && game.coreHp > 0) {
      game.holdLeft = 0;
      game.battleActive = false;
      game.gameOver(true);
    }
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
