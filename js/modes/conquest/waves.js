// ConquestGame：召唤、波次和胜负
ConquestGame.prototype.summonTower = function() {
    // 触屏没有 hover，只闪一下红屏无法说明失败原因，必须补一条文字提示
    if (this.gameEnded) return;

    if (this.ink < this.summonCost) {
      this.summonFlashTime = Date.now();
      this.summonFlashType = "fail";
      this._notify(`墨水不足，召唤需要 ${this.summonCost} 墨`, "warning");
      return;
    }

    const pos = this.getNextPlacementPosition();
    if (!pos) {
      this.summonFlashTime = Date.now();
      this.summonFlashType = "fail";
      this._notify("内圈已无空位，先融合腾出位置", "warning");
      return;
    }

    const towerTypes = ["fire", "water", "mountain", "wood", "gold", "earth", "xinZhongYan", "ruFengSiZhen"];
    const type = towerTypes[Math.floor(Math.random() * towerTypes.length)];

    this.ink -= this.summonCost;

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
ConquestGame.prototype.startWave = function() {
    if (this.waveInProgress || this.gameEnded) return;
    if (this.wave >= this.maxWave) return;

    this.wave++;
    this.waveInProgress = true;

    // 标记已开始自动波次，禁用按钮
    this._autoWaveStarted = true;

    // 使用关卡配置中的波次配置
    const waves = this.levelConfig.waves || [
      { type: "corpse", count: 50 },
      { type: "ghost", count: 50 },
      { type: "armor", count: 50 },
    ];

    const config = waves[this.wave - 1];
    this.spawnQueue = [];
    for (let i = 0; i < config.count; i++) {
      this.spawnQueue.push({ type: config.type, delay: 800 });
    }

    this.spawnNextEnemy();
    this.updateUI();
  
};
ConquestGame.prototype.spawnNextEnemy = function() {
    if (this.spawnQueue.length === 0) {
      this.checkWaveComplete();
      return;
    }

    const data = this.spawnQueue.shift();

    const startPos = this.path[0];
    const startPx = gridToPixel(startPos.x, startPos.y);
    const minSpawnDistance = this.CELL_SIZE * 1.5;

    const lastAliveEnemy = [...this.enemies].reverse().find((e) => !e.dead);
    if (lastAliveEnemy) {
      const dx = lastAliveEnemy.x - startPx.x;
      const dy = lastAliveEnemy.y - startPx.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minSpawnDistance) {
        this.spawnQueue.unshift(data);
        this.spawnTimerId = setTimeout(() => this.spawnNextEnemy(), 300);
        return;
      }
    }

    const enemy = new ConquestEnemy(data.type, this.path, this);
    this.enemies.push(enemy);

    const aliveCount = this.enemies.filter((e) => !e.dead).length;
    if (aliveCount >= this.maxAliveEnemies && !this.gameEnded) {
      this.gameOver(false);
      return;
    }

    if (this.spawnQueue.length > 0) {
      const nextDelay = this.spawnQueue[0].delay;
      this.spawnTimerId = setTimeout(() => this.spawnNextEnemy(), nextDelay);
    } else {
      this.checkWaveComplete();
    }
  
};
ConquestGame.prototype.checkWaveComplete = function() {
    const aliveEnemies = this.enemies.filter((e) => !e.dead);
    if (aliveEnemies.length === 0 && this.spawnQueue.length === 0) {
      if (this.wave >= this.maxWave) {
        this.waveInProgress = false;
        this.updateUI();
        this.gameOver(true);
      } else {
        // 重置波次进行状态，允许开始下一波
        this.waveInProgress = false;
        // 自动开始下一波（间隔5秒）
        setTimeout(() => this.startWave(), 5000);
      }
    }
  
};
ConquestGame.prototype.gameOver = function(victory) {
    this.gameEnded = true;
    this.victory = victory;
    // 胜负弹窗必须位于当前操作上下文之上，先关闭可能仍打开的炮塔信息面板。
    this.hideTowerInfo();

    if (victory) {
      // 标记当前关卡已完成
      if (typeof conquestProgress !== "undefined" && conquestProgress.markLevelCompleted) {
        conquestProgress.markLevelCompleted(this.currentLevelId);
      }

      const nextLevelId = this.getNextLevelId();
      if (nextLevelId) {
        // 有下一关，显示下一关按钮和返回关卡列表按钮
        this.showVictoryModalWithNextLevel(nextLevelId);
      } else {
        // 没有下一关，显示通关所有关卡
        this.showModal("胜", "山河尽入卷 · 征服诸境已成", "关卡列表", () => this.returnToLevelSelect());
      }
    } else {
      this.showModal("破", "群邪越境 · 防线失守", "关卡列表", () => this.returnToLevelSelect());
    }
  
};
ConquestGame.prototype.showVictoryModalWithNextLevel = function(nextLevelId) {
    const modal = document.getElementById("modal");
    const titleEl = document.getElementById("modal-title");
    const textEl = document.getElementById("modal-text");
    const btnEl = document.getElementById("modal-btn");

    InkUI.setModalScene('victory');
    titleEl.textContent = "胜";
    textEl.textContent = `关卡 ${this.currentLevelId} 完成! 所有波次已清除!`;
    btnEl.textContent = "下一关";
    btnEl.disabled = false;
    modal.classList.remove("hidden");

    // 创建返回关卡列表按钮
    let returnBtn = document.getElementById("modal-return-btn");
    if (!returnBtn) {
      returnBtn = document.createElement("button");
      returnBtn.id = "modal-return-btn";
      returnBtn.className = "ink-button secondary";
      btnEl.parentNode.insertBefore(returnBtn, btnEl.nextSibling);
    }
    returnBtn.textContent = "关卡列表";
    returnBtn.style.display = "inline-block";

    btnEl.onclick = () => {
      modal.classList.add("hidden");
      returnBtn.style.display = "none";
      this.startLevel(nextLevelId);
    };

    returnBtn.onclick = () => {
      modal.classList.add("hidden");
      returnBtn.style.display = "none";
      this.returnToLevelSelect();
    };
  
};
ConquestGame.prototype.showModal = function(title, text, buttonText, onClick) {
    const modal = document.getElementById("modal");
    InkUI.setModalScene(title.includes('胜') ? 'victory' : title.includes('破') || title.includes('失败') ? 'defeat' : 'notice');
    const returnBtn = document.getElementById("modal-return-btn");
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-text").textContent = text;
    document.getElementById("modal-btn").textContent = buttonText;
    if (returnBtn) {
      returnBtn.style.display = "none";
      returnBtn.onclick = null;
    }
    modal.classList.remove("hidden");

    document.getElementById("modal-btn").onclick = () => {
      modal.classList.add("hidden");
      if (onClick) onClick();
    };
  
};
ConquestGame.prototype.updateUI = function() {
    document.getElementById("conquest-ink").textContent = this.ink;
    document.getElementById("conquest-wave").textContent = `${this.wave}/${this.maxWave}`;

    const aliveCount = this.enemies.filter((e) => !e.dead).length;
    document.getElementById("conquest-enemies").textContent = aliveCount;

    const coreHpEl = document.getElementById("conquest-core-hp");
    if (coreHpEl) coreHpEl.textContent = this.coreHp;

    const summonBtn = document.getElementById("conquest-summon-btn");
    if (summonBtn) summonBtn.disabled = this.ink < this.summonCost || this.gameEnded;

    const waveBtn = document.getElementById("conquest-wave-btn");
    if (waveBtn) {
      waveBtn.disabled = this.waveInProgress || this.wave >= this.maxWave || this.gameEnded || this._autoWaveStarted;
      if (this.wave >= this.maxWave) {
        waveBtn.textContent = "通关";
      } else if (this._autoWaveStarted) {
        waveBtn.textContent = "进行中";
      } else {
        waveBtn.textContent = "开始波次";
      }
    }
  
};
