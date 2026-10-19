// ConquestGame：召唤、连续刷怪和胜负
// 当前召唤费用：基础费用随已召唤数量递增，避免无限铺塔
ConquestGame.prototype.getSummonCost = function() {
    return Math.round(this.summonCost * (1 + (this.summonCostGrowth || 0) * (this.summonedCount || 0)));
};
ConquestGame.prototype.summonTower = function() {
    // 触屏没有 hover，只闪一下红屏无法说明失败原因，必须补一条文字提示
    if (this.gameEnded) return;

    const cost = this.getSummonCost();
    if (this.ink < cost) {
      this.summonFlashTime = Date.now();
      this.summonFlashType = "fail";
      this._notify(`墨水不足，召唤需要 ${cost} 墨`, "warning");
      return;
    }

    const pos = this.getNextPlacementPosition();
    if (!pos) {
      this.summonFlashTime = Date.now();
      this.summonFlashType = "fail";
      this._notify("内圈已无空位，先出售腾出位置", "warning");
      return;
    }

    const towerTypes = CONFIG.ACTIVE_TOWERS;
    const type = towerTypes[Math.floor(Math.random() * towerTypes.length)];

    this.ink -= cost;
    this.summonedCount = (this.summonedCount || 0) + 1;

    const tower = new Tower(type, pos.x, pos.y, this);
    if (tower.onPath) {
      tower.onPath = false;
    }
    this.towers.push(tower);
    this._towerIndex.set(`${tower.gx},${tower.gy}`, tower);

    const pixelPos = gridToPixel(pos.x, pos.y);
    this.particleSystem.createExplosion(pixelPos.x, pixelPos.y, 15, "#a67c00");

    this.summonFlashTime = Date.now();
    this.summonFlashType = "success";
    this.updateUI();
    if (window.InkAudio) window.InkAudio.play('place');
  
};
ConquestGame.prototype.getNextPlacementPosition = function() {
    while (this.nextPlacementIndex < this.placementGrid.length) {
      const pos = this.placementGrid[this.nextPlacementIndex];
      this.nextPlacementIndex++;
      const occupied = this.towers.some((t) => t.gx === pos.x && t.gy === pos.y);
      if (!occupied) return pos;
    }
    return null;
  
};
// ---- 连续刷怪与限时坚守（工单 04）：与塔防共用 BattleDirector ----
// 征服的路径是环形回路：入口不延伸，s 到终点后归零继续绕圈
ConquestGame.prototype.getPathTrack = function(path) {
    return PathTrack.forPath(path, { loop: true });
};
ConquestGame.prototype.aliveEnemyCount = function() {
    let n = 0;
    for (const e of this.enemies) if (!e.dead) n++;
    return n;
};
ConquestGame.prototype.spawnGlyphEnemy = function(type) {
    const enemy = new ConquestEnemy(type, this.path, this);
    this.enemies.push(enemy);
    return enemy;
};
ConquestGame.prototype.resetBattleState = function(level) {
    this.battleActive = false;
    this.density = null;
    this.spawnAcc = 0;
    this.giantTimer = 0;
    this.holdTotal = (level && level.holdSeconds) || CONFIG.HOLD_SECONDS;
    this.holdLeft = this.holdTotal;
    this.kills = 0;
    this.leaks = 0;
    // 字形弹道、特效与全局大招间隔
    if (typeof GlyphSystem !== 'undefined') GlyphSystem.reset(this);
};
ConquestGame.prototype.updateSpawner = function(dt) {
    BattleDirector.update(this, dt);
};
ConquestGame.prototype.beginBattle = function(densityKey) {
    BattleDirector.begin(this, densityKey);
    this.updateUI();
    if (window.InkAudio) window.InkAudio.play('wave');
};
// 开局前弹出敌潮选择；暂停和继续不会再次弹出
ConquestGame.prototype.promptDensity = function() {
    this.battleActive = false;
    DensityPicker.open(
      (key) => this.beginBattle(key),
      () => this.returnToLevelSelect()
    );
};
ConquestGame.prototype.gameOver = function(victory) {
    this.gameEnded = true;
    this.victory = victory;
    this.battleActive = false;
    // 胜负弹窗必须位于当前操作上下文之上，先关闭可能仍打开的炮塔信息面板。
    this.hideTowerInfo();

    if (victory) {
      // 标记当前关卡已完成
      if (typeof conquestProgress !== "undefined" && conquestProgress.markLevelCompleted) {
        conquestProgress.markLevelCompleted(this.currentLevelId);
      }

      const nextLevelId = this.getNextLevelId();
      const actions = [{ label: "重来", onClick: () => this.startLevel(this.currentLevelId) }];
      if (nextLevelId) {
        actions.push({ label: "选关", onClick: () => this.returnToLevelSelect() });
        actions.push({ label: "下一关", primary: true, onClick: () => this.startLevel(nextLevelId) });
      } else {
        actions.push({ label: "选关", primary: true, onClick: () => this.returnToLevelSelect() });
      }
      InkModal.show({
        scene: "victory",
        title: "胜",
        lines: nextLevelId
          ? [`第 ${this.currentLevelId} 境 · 坚守已成`]
          : [`第 ${this.currentLevelId} 境 · 坚守已成`, "山河尽入卷 · 征服诸境已成"],
        actions,
      });
    } else {
      InkModal.show({
        scene: "defeat",
        title: "破",
        lines: ["群邪越境 · 防线失守"],
        actions: [
          { label: "选关", onClick: () => this.returnToLevelSelect() },
          { label: "重来", primary: true, onClick: () => this.startLevel(this.currentLevelId) },
        ],
      });
    }
  
};
ConquestGame.prototype.showModal = function(title, text, buttonText, onClick) {
    InkModal.show({
      scene: title.includes('胜') ? 'victory' : title.includes('破') || title.includes('失败') ? 'defeat' : 'notice',
      title,
      lines: [text],
      actions: [{ label: buttonText, primary: true, onClick }],
    });
};
ConquestGame.prototype.updateUI = function() {
    document.getElementById("conquest-ink").textContent = this.ink;
    document.getElementById("conquest-hold").textContent = BattleDirector.formatHold(this.holdLeft);

    const aliveCount = this.aliveEnemyCount();
    document.getElementById("conquest-danger").textContent = `${aliveCount} / ${this.dangerLimit}`;

    const coreHpEl = document.getElementById("conquest-core-hp");
    if (coreHpEl) coreHpEl.textContent = this.coreHp;

    const cost = this.getSummonCost();
    const costEl = document.getElementById("conquest-summon-cost");
    if (costEl) costEl.textContent = `${cost}墨`;
    const summonBtn = document.getElementById("conquest-summon-btn");
    if (summonBtn) summonBtn.disabled = this.ink < cost || this.gameEnded;
  
};
