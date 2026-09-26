// UI：塔信息、弹窗和解锁
/**
 * 显示炮塔信息面板
 * @param {Object} tower 炮塔
 * @param {number} x 触发点 clientX（触摸端为触点）
 * @param {number} y 触发点 clientY
 * @param {string} [source] "touch" | "mouse"。
 *   触摸端必须区别对待：手指会压在触点上，面板若按触点定位会被手指完全遮住
 *   （实测面板 left/top 正好等于触点坐标，coversFinger: true）。
 */
UI.prototype.showTowerInfo = function(tower, x, y, source) {
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

    // 取消选中提示：文案必须与当前输入方式一致
    // （触摸端没有右键；此前的硬编码"右键取消选择"会让移动端玩家无从下手）
    const isTouchInput =
      source === "touch" || !!(window.DeviceProfile && window.DeviceProfile.isTouch);
    let cancelHint = this.towerInfo.querySelector(".right-click-hint");
    if (!cancelHint) {
      cancelHint = document.createElement("div");
      cancelHint.className = "right-click-hint";
      cancelHint.style.cssText = "font-size:11px;color:#666;text-align:center;margin-top:8px;font-family:'ZCOOL XiaoWei',serif;";
      this.towerInfo.appendChild(cancelHint);
    }
    cancelHint.textContent = isTouchInput ? "点击空白处取消选中" : "右键取消选择";

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

    // 记录锚点：升级/出售后需要按同一锚点重排，避免面板逐次漂移
    this._infoAnchor = { x, y, source: isTouchInput ? "touch" : "mouse" };
    this._infoSource = this._infoAnchor.source;

    // 获取面板实际尺寸
    const panelWidth = this.towerInfo.offsetWidth;
    const panelHeight = this.towerInfo.offsetHeight;

    // 获取视口尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10;

    let adjustedX;
    let adjustedY;

    if (isTouchInput) {
      // 触摸端：面板整体停靠在"离手指较远"的那一侧（左半屏点按 → 面板靠右），
      // 这是移动端常见做法，可以彻底避免面板被手指压住。
      // 手机横屏只有 390px 高，而面板高约 250px，"贴触点上方/下方"往往会互相挤压。
      const dockRight = x < viewportWidth / 2;
      adjustedX = dockRight ? viewportWidth - panelWidth - margin : margin;
      adjustedY = y - panelHeight / 2;
    } else {
      adjustedX = x;
      adjustedY = y;
    }

    // 边界检测与调整
    if (adjustedX + panelWidth > viewportWidth - margin) {
      adjustedX = viewportWidth - panelWidth - margin;
    }
    if (adjustedY + panelHeight > viewportHeight - margin) {
      adjustedY = viewportHeight - panelHeight - margin;
    }

    // 确保不小于最小边距
    adjustedX = Math.max(margin, adjustedX);
    adjustedY = Math.max(margin, adjustedY);

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
