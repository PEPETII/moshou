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

    const config = CONFIG.TOWERS[tower.type];

    this.towerInfo.querySelector(".info-char").textContent = tower.char;
    this.towerInfo.querySelector(".info-desc").textContent = config && config.desc ? config.desc : "";

    let stats = "";
    if (tower.damage > 0) stats += `伤害: ${tower.damage}<br>`;
    if (tower.range) stats += `范围: ${+tower.range.toFixed(1)}格<br>`;
    if (tower.cooldown)
      stats += `攻速: ${(tower.cooldown / 1000).toFixed(1)}秒<br>`;
    if (tower.slow) stats += `减速: ${Math.round(tower.slow * 100)}%<br>`;
    if (tower.hp) stats += `生命: ${tower.hp}/${tower.maxHp}<br>`;

    this.towerInfo.querySelector(".info-stats").innerHTML = stats;

    const sellBtn = this.towerInfo.querySelector(".sell-btn");

    sellBtn.textContent = `出售 +${tower.getSellValue()}墨`;

    // 合成区：成功后面板改为显示新合字塔
    if (typeof FusionPanel !== "undefined") {
      FusionPanel.render(this.towerInfo, this.game, tower, {
        notify: (msg, type) => this.showToast(msg, type),
        onDone: (made) => {
          this.selectedTower = made;
          const anchor = this._infoAnchor || { x, y, source };
          this.showTowerInfo(made, anchor.x, anchor.y, anchor.source);
        },
      });
    }

    // 取消选中提示：文案必须与当前输入方式一致
    // （触摸端没有右键；此前的硬编码"右键取消选择"会让移动端玩家无从下手）
    const isTouchInput =
      source === "touch" || !!(window.DeviceProfile && window.DeviceProfile.isTouch);
    let cancelHint = this.towerInfo.querySelector(".right-click-hint");
    if (!cancelHint) {
      cancelHint = document.createElement("div");
      cancelHint.className = "right-click-hint";
      cancelHint.style.cssText = "font-size:11px;color:#6a6459;text-align:center;margin-top:8px;font-family:'Ink Glyph Fix', 'ZCOOL XiaoWei',serif;";
      this.towerInfo.appendChild(cancelHint);
    }
    cancelHint.textContent = isTouchInput ? "点击空白处取消选中" : "右键取消选择";

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
    if (typeof FusionPanel !== "undefined") FusionPanel.stop();
    for (const t of this.game.towers) {
      t.selected = false;
    }
  
};
// 兼容旧签名的单按钮告知；胜负弹窗直接用 InkModal.show（见 js/ui/ink-modal.js）
UI.prototype.showModal = function(title, text, buttonText = "确定", onBtnClick = null) {
    InkModal.show({
      scene: title.includes('胜') ? 'victory' : title.includes('破') || title.includes('失败') ? 'defeat' : 'notice',
      title,
      lines: [text],
      actions: [{ label: buttonText, primary: true, onClick: onBtnClick }],
    });
};
UI.prototype.hideModal = function() {
    InkModal.hide();
};
UI.prototype.updateUnlocks = function(unlockedTypes) {
    this.createTowerSelects();
  
};
