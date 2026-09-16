// UI：塔信息、弹窗和解锁
UI.prototype.showTowerInfo = function(tower, x, y) {
    // 清理长按定时器，防止在显示信息面板期间切换界面导致意外行为
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    const config = tower.isFusion ?
      CONFIG.FUSION_TOWERS[tower.fusionType] :
      CONFIG.TOWERS[tower.type];

    this.towerInfo.querySelector(".info-char").textContent = tower.char;
    this.towerInfo.querySelector(".info-level").textContent =
      tower.isFusion ? "融合 Lv.1" : `Lv.${tower.level}`;

    let stats = "";
    if (tower.isFusion) {
      stats += `组合: ${tower.components.map(c => CONFIG.TOWERS[c]?.char || c).join('+')}\n`;
    }
    if (tower.damage > 0) stats += `伤害: ${tower.damage}<br>`;
    if (tower.range) stats += `范围: ${tower.range}格<br>`;
    if (tower.cooldown)
      stats += `攻速: ${(tower.cooldown / 1000).toFixed(1)}秒<br>`;
    if (tower.slow) stats += `减速: ${Math.round(tower.slow * 100)}%<br>`;
    if (tower.hp) stats += `生命: ${tower.hp}/${tower.maxHp}<br>`;
    if (tower.burn) stats += `灼烧: 是<br>`;
    if (tower.pierce) stats += `穿透: 是<br>`;

    if (tower.aura) {
      stats += `<div class="stat-field"><span class="stat-label">光环</span><span class="stat-value">${tower.auraRange}格</span></div>`;
      if (tower.auraType === 'attackSpeed') {
        stats += `<div class="stat-field"><span class="stat-label">攻速加成</span><span class="stat-value">${Math.round(tower.auraValue * 100)}%</span></div>`;
      } else if (tower.auraType === 'range') {
        stats += `<div class="stat-field"><span class="stat-label">射程加成</span><span class="stat-value">+${tower.auraValue}格</span></div>`;
      } else if (tower.auraType === 'slow') {
        stats += `<div class="stat-field"><span class="stat-label">减速</span><span class="stat-value">${Math.round(tower.auraValue * 100)}%</span></div>`;
      } else if (tower.auraType === 'reflect') {
        stats += `<div class="stat-field"><span class="stat-label">反射</span><span class="stat-value">${Math.round(tower.auraValue * 100)}%</span></div>`;
      } else if (tower.auraType === 'dot') {
        stats += `<div class="stat-field"><span class="stat-label">持续伤害</span><span class="stat-value">${tower.auraValue}/秒</span></div>`;
      } else if (tower.auraType === 'reveal') {
        stats += `<div class="stat-field"><span class="stat-label">照明</span><span class="stat-value">${tower.auraRange}格</span></div>`;
      }
    }
    if (tower.goldPerWave) {
      stats += `<div class="stat-field"><span class="stat-label">产金</span><span class="stat-value">${tower.goldPerWave}金/波</span></div>`;
    }
    if (tower.healPerWave) {
      stats += `<div class="stat-field"><span class="stat-label">治疗</span><span class="stat-value">+${tower.healPerWave}HP/波</span></div>`;
    }
    if (tower.globalSlow) {
      stats += `<div class="stat-field"><span class="stat-label">全局减速</span><span class="stat-value">${Math.round(tower.globalSlow * 100)}%</span></div>`;
    }
    if (tower.chainCount) {
      stats += `<div class="stat-field"><span class="stat-label">弹射</span><span class="stat-value">${tower.chainCount}次</span></div>`;
    }
    if (tower.freezeDuration) {
      stats += `<div class="stat-field"><span class="stat-label">冻结</span><span class="stat-value">${tower.freezeDuration / 1000}秒</span></div>`;
    }
    if (tower.knockback) {
      stats += `<div class="stat-field"><span class="stat-label">击退</span><span class="stat-value">${tower.knockback}格</span></div>`;
    }
    if (tower.markBonus) {
      stats += `<div class="stat-field"><span class="stat-label">增伤</span><span class="stat-value">+${Math.round(tower.markBonus * 100)}%</span></div>`;
    }
    if (tower.isDetonator) {
      stats += `<div class="stat-field"><span class="stat-label">爆炸伤害</span><span class="stat-value">${tower.damage}</span></div>`;
      stats += `<div class="stat-field"><span class="stat-label">爆炸范围</span><span class="stat-value">${tower.explodeRange}格</span></div>`;
    }

    this.towerInfo.querySelector(".info-stats").innerHTML = stats;

    const actionsDiv = this.towerInfo.querySelector(".info-actions");
    const existingDetonate = actionsDiv.querySelector('.detonate-btn');
    if (existingDetonate) existingDetonate.remove();

    const upgradeBtn = this.towerInfo.querySelector(".upgrade-btn");
    const sellBtn = this.towerInfo.querySelector(".sell-btn");

    if (tower.isFusion) {
      upgradeBtn.textContent = "融合不可升级";
      upgradeBtn.disabled = true;
    } else if (tower.level >= tower.maxLevel) {
      upgradeBtn.textContent = "已满级";
      upgradeBtn.disabled = true;
    } else {
      upgradeBtn.textContent = `升级 ${tower.upgradeCost * tower.level}金`;
      upgradeBtn.disabled = this.game.gold < tower.upgradeCost * tower.level;
    }

    sellBtn.textContent = `出售 +${tower.getSellValue()}金`;

    // 添加右键取消选择提示
    let rightClickHint = this.towerInfo.querySelector(".right-click-hint");
    if (!rightClickHint) {
      rightClickHint = document.createElement("div");
      rightClickHint.className = "right-click-hint";
      rightClickHint.style.cssText = "font-size:11px;color:#666;text-align:center;margin-top:8px;font-family:'ZCOOL XiaoWei',serif;";
      this.towerInfo.appendChild(rightClickHint);
    }
    rightClickHint.textContent = "右键取消选择";

    if (tower.isDetonator) {
      const detonateBtn = document.createElement('button');
      detonateBtn.textContent = '引爆';
      detonateBtn.className = 'detonate-btn';
      detonateBtn.style.cssText = 'background:#1a1a1a;border:1px solid #ff5722;color:#ff5722;padding:8px;flex:1;cursor:pointer;font-family:"Ma Shan Zheng",cursive;font-size:13px;';
      const detonateHandler = () => {
        const range = tower.explodeRange * CONFIG.CELL_SIZE;
        for (const enemy of this.game.enemies) {
          if (enemy.hp <= 0) continue;
          const dist = distance(tower.x, tower.y, enemy.x, enemy.y);
          if (dist <= range) {
            enemy.takeDamage(tower.damage);
            enemy.applyStun(tower.stunDuration || 1000);
          }
        }
        const idx = this.game.towers.indexOf(tower);
        if (idx >= 0) this.game.towers.splice(idx, 1);
        this.hideTowerInfo();
      };
      this.addTrackedEventListener(detonateBtn, 'click', detonateHandler);
      actionsDiv.appendChild(detonateBtn);
    }

    // 先显示面板以获取实际尺寸
    this.towerInfo.classList.remove("hidden");

    // 获取面板实际尺寸
    const panelWidth = this.towerInfo.offsetWidth;
    const panelHeight = this.towerInfo.offsetHeight;

    // 获取视口尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 边界检测与调整
    let adjustedX = x;
    let adjustedY = y;

    // 右边界检测
    if (adjustedX + panelWidth > viewportWidth) {
      adjustedX = viewportWidth - panelWidth - 10;
    }

    // 下边界检测
    if (adjustedY + panelHeight > viewportHeight) {
      adjustedY = viewportHeight - panelHeight - 10;
    }

    // 确保不小于最小边距
    adjustedX = Math.max(10, adjustedX);
    adjustedY = Math.max(10, adjustedY);

    this.towerInfo.style.left = adjustedX + "px";
    this.towerInfo.style.top = adjustedY + "px";

    tower.selected = true;
    for (const t of this.game.towers) {
      if (t !== tower) t.selected = false;
    }
  
};
UI.prototype.hideTowerInfo = function() {
    // 清理长按定时器，防止隐藏面板后定时器回调仍然执行
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    this.towerInfo.classList.add("hidden");
    for (const t of this.game.towers) {
      t.selected = false;
    }
  
};
UI.prototype.showModal = function(title, text, buttonText = "确定", onBtnClick = null) {
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-text").textContent = text;
    document.getElementById("modal-btn").textContent = buttonText;
    this.modal.classList.remove("hidden");

    // 设置按钮行为
    const btn = document.getElementById("modal-btn");
    btn.onclick = () => {
      this.hideModal();
      if (onBtnClick && typeof onBtnClick === 'function') {
        onBtnClick();
      }
    };
  
};
UI.prototype.hideModal = function() {
    this.modal.classList.add("hidden");
    // 清理待处理的融合状态和事件监听器
    this._cleanupFusionModalListeners();
  
};
UI.prototype.updateUnlocks = function(unlockedTypes) {
    this.createTowerSelects();
  
};
