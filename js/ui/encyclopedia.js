// UI：炮塔和敌人图鉴
// === 图鉴系统事件监听 ===
UI.prototype.setupEncyclopediaEventListeners = function() {
    // 炮塔图鉴按钮
    const btnTowerEncyclopedia = document.getElementById("btn-tower-encyclopedia");
    if (btnTowerEncyclopedia) {
      this.addTrackedEventListener(btnTowerEncyclopedia, "click", () => {
        this.showTowerEncyclopedia();
      });
    }

    // 怪物图鉴按钮
    const btnEnemyEncyclopedia = document.getElementById("btn-enemy-encyclopedia");
    if (btnEnemyEncyclopedia) {
      this.addTrackedEventListener(btnEnemyEncyclopedia, "click", () => {
        this.showEnemyEncyclopedia();
      });
    }

    // 从图鉴返回主菜单
    const backToMenuFromEncyclopedia = document.getElementById("back-to-menu-from-encyclopedia");
    if (backToMenuFromEncyclopedia) {
      this.addTrackedEventListener(backToMenuFromEncyclopedia, "click", () => {
        this.hideEncyclopedia();
      });
    }

    // 从炮塔图鉴返回图鉴主界面
    const backToEncyclopediaFromTowers = document.getElementById("back-to-encyclopedia-from-towers");
    if (backToEncyclopediaFromTowers) {
      this.addTrackedEventListener(backToEncyclopediaFromTowers, "click", () => {
        this.hideTowerEncyclopedia();
        this.showEncyclopedia();
      });
    }

    // 从怪物图鉴返回图鉴主界面
    const backToEncyclopediaFromEnemies = document.getElementById("back-to-encyclopedia-from-enemies");
    if (backToEncyclopediaFromEnemies) {
      this.addTrackedEventListener(backToEncyclopediaFromEnemies, "click", () => {
        this.hideEnemyEncyclopedia();
        this.showEncyclopedia();
      });
    }

    // 关闭炮塔详情面板
    const closeTowerDetail = document.getElementById("close-tower-detail");
    if (closeTowerDetail) {
      this.addTrackedEventListener(closeTowerDetail, "click", () => {
        this.hideTowerDetail();
      });
    }

    // 关闭怪物详情面板
    const closeEnemyDetail = document.getElementById("close-enemy-detail");
    if (closeEnemyDetail) {
      this.addTrackedEventListener(closeEnemyDetail, "click", () => {
        this.hideEnemyDetail();
      });
    }

    // 筛选标签点击事件
    const filterTabs = document.querySelectorAll(".filter-tab");
    filterTabs.forEach(tab => {
      const clickHandler = () => {
        filterTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        this.filterTowerEncyclopedia(tab.dataset.filter);
      };
      this.addTrackedEventListener(tab, "click", clickHandler);
    });

    // === 融合图鉴系统事件监听 ===
    this.setupFusionEncyclopediaEventListeners();
  
};
// === 图鉴系统方法 ===
UI.prototype.showEncyclopedia = function() {
    const menuButtons = document.querySelector(".menu-buttons");
    const encyclopediaContainer = document.getElementById("encyclopedia-container");

    if (menuButtons) menuButtons.style.display = "none";
    if (encyclopediaContainer) encyclopediaContainer.classList.remove("hidden");
  
};
UI.prototype.hideEncyclopedia = function() {
    const menuButtons = document.querySelector(".menu-buttons");
    const encyclopediaContainer = document.getElementById("encyclopedia-container");

    if (menuButtons) menuButtons.style.display = "flex";
    if (encyclopediaContainer) encyclopediaContainer.classList.add("hidden");
  
};
UI.prototype.showTowerEncyclopedia = function() {
    const encyclopediaContainer = document.getElementById("encyclopedia-container");
    const towerEncyclopediaContainer = document.getElementById("tower-encyclopedia-container");

    if (encyclopediaContainer) encyclopediaContainer.classList.add("hidden");
    if (towerEncyclopediaContainer) {
      towerEncyclopediaContainer.classList.remove("hidden");
      this.populateTowerEncyclopedia();
    }
  
};
UI.prototype.hideTowerEncyclopedia = function() {
    const towerEncyclopediaContainer = document.getElementById("tower-encyclopedia-container");
    if (towerEncyclopediaContainer) towerEncyclopediaContainer.classList.add("hidden");
  
};
UI.prototype.showEnemyEncyclopedia = function() {
    const encyclopediaContainer = document.getElementById("encyclopedia-container");
    const enemyEncyclopediaContainer = document.getElementById("enemy-encyclopedia-container");

    if (encyclopediaContainer) encyclopediaContainer.classList.add("hidden");
    if (enemyEncyclopediaContainer) {
      enemyEncyclopediaContainer.classList.remove("hidden");
      this.populateEnemyEncyclopedia();
    }
  
};
UI.prototype.hideEnemyEncyclopedia = function() {
    const enemyEncyclopediaContainer = document.getElementById("enemy-encyclopedia-container");
    if (enemyEncyclopediaContainer) enemyEncyclopediaContainer.classList.add("hidden");
  
};
// 炮塔分类定义
UI.prototype.getTowerCategory = function(type, config) {
    if (type === 'fire' || type === 'water' || type === 'mountain' || type === 'wood' || type === 'gold' || type === 'earth') {
      return 'basic';
    }
    if (config.onPath) {
      return 'path';
    }
    if (config.aura || config.globalSlow || config.copyEfficiency) {
      return 'support';
    }
    if (type === 'xinZhongYan' || type === 'ruFengSiZhen' || type === 'thunder' || type === 'ice' || type === 'poison' || type === 'wind' || type === 'light' || type === 'dark' || type === 'star' || type === 'frost') {
      return 'element';
    }
    return 'special';
  
};
// 填充炮塔图鉴
UI.prototype.populateTowerEncyclopedia = function(filter = 'all') {
    const grid = document.getElementById("tower-encyclopedia-grid");
    if (!grid) return;

    grid.innerHTML = "";

    for (const [type, config] of Object.entries(CONFIG.TOWERS)) {
      if (type === 'fusion') continue; // 跳过融合基类

      const category = this.getTowerCategory(type, config);
      if (filter !== 'all' && category !== filter) continue;

      const item = document.createElement("div");
      item.className = "encyclopedia-item";
      item.dataset.type = type;

      let charHtml = config.char;
      if (config.char && config.char.length >= 3) {
        charHtml = `<span class="item-char small">${config.char}</span>`;
      } else {
        charHtml = `<span class="item-char">${config.char}</span>`;
      }

      item.innerHTML = `
        ${charHtml}
        <span class="item-cost">${config.cost}墨</span>
      `;

      const clickHandler = () => {
        this.showTowerDetail(type, config);
      };
      this.addTrackedEventListener(item, "click", clickHandler);

      grid.appendChild(item);
    }
  
};
// 筛选炮塔图鉴
UI.prototype.filterTowerEncyclopedia = function(filter) {
    this.populateTowerEncyclopedia(filter);
  
};
// 显示炮塔详情
UI.prototype.showTowerDetail = function(type, config) {
    const panel = document.getElementById("tower-detail-panel");
    const charEl = document.getElementById("tower-detail-char");
    const nameEl = document.getElementById("tower-detail-name");
    const statsEl = document.getElementById("tower-detail-stats");
    const descEl = document.getElementById("tower-detail-desc");

    if (!panel) return;

    charEl.textContent = config.char;
    nameEl.textContent = type;

    // 构建属性列表
    let statsHtml = "";
    
    if (config.damage !== undefined && config.damage > 0) {
      statsHtml += this.createDetailStatRow("攻击力", config.damage);
    }
    if (config.range !== undefined && config.range > 0) {
      statsHtml += this.createDetailStatRow("射程", config.range + "格");
    }
    if (config.cooldown !== undefined && config.cooldown > 0) {
      statsHtml += this.createDetailStatRow("攻速", (config.cooldown / 1000).toFixed(1) + "秒");
    }
    if (config.cost !== undefined) {
      statsHtml += this.createDetailStatRow("造价", config.cost + "墨", true);
    }
    if (config.hp !== undefined) {
      statsHtml += this.createDetailStatRow("生命值", config.hp);
    }
    if (config.slow !== undefined) {
      statsHtml += this.createDetailStatRow("减速", Math.round(config.slow * 100) + "%");
    }
    if (config.burn) {
      statsHtml += this.createDetailStatRow("灼烧", "是");
    }
    if (config.pierce) {
      statsHtml += this.createDetailStatRow("穿透", "是");
    }
    if (config.chain) {
      statsHtml += this.createDetailStatRow("弹射", config.chainCount + "次");
    }
    if (config.aoe) {
      statsHtml += this.createDetailStatRow("范围伤害", config.aoeRange + "格");
    }
    if (config.aura) {
      statsHtml += this.createDetailStatRow("光环范围", config.auraRange + "格");
    }
    if (config.onPath) {
      statsHtml += this.createDetailStatRow("放置位置", "路径上");
    }
    if (config.unlockLevel) {
      statsHtml += this.createDetailStatRow("解锁关卡", "第" + config.unlockLevel + "关");
    }

    statsEl.innerHTML = statsHtml;
    descEl.textContent = config.desc || "暂无描述";

    panel.classList.remove("hidden");
  
};
UI.prototype.hideTowerDetail = function() {
    const panel = document.getElementById("tower-detail-panel");
    if (panel) panel.classList.add("hidden");
  
};
// 填充怪物图鉴
UI.prototype.populateEnemyEncyclopedia = function() {
    const grid = document.getElementById("enemy-encyclopedia-grid");
    if (!grid) return;

    grid.innerHTML = "";

    for (const [type, config] of Object.entries(CONFIG.ENEMIES)) {
      const item = document.createElement("div");
      item.className = "encyclopedia-item";
      item.dataset.type = type;

      item.innerHTML = `
        <span class="item-char">${config.char}</span>
        <span class="item-cost">${config.hp}HP</span>
      `;

      const clickHandler = () => {
        this.showEnemyDetail(type, config);
      };
      this.addTrackedEventListener(item, "click", clickHandler);

      grid.appendChild(item);
    }
  
};
// 显示怪物详情
UI.prototype.showEnemyDetail = function(type, config) {
    const panel = document.getElementById("enemy-detail-panel");
    const charEl = document.getElementById("enemy-detail-char");
    const nameEl = document.getElementById("enemy-detail-name");
    const statsEl = document.getElementById("enemy-detail-stats");
    const descEl = document.getElementById("enemy-detail-desc");

    if (!panel) return;

    charEl.textContent = config.char;
    nameEl.textContent = type;

    // 构建属性列表
    let statsHtml = "";
    
    statsHtml += this.createDetailStatRow("生命值", config.hp);
    statsHtml += this.createDetailStatRow("攻击力", config.damage);
    statsHtml += this.createDetailStatRow("移动速度", config.speed);
    statsHtml += this.createDetailStatRow("击败奖励", config.reward + "墨", true);

    // 特殊能力
    const specials = [];
    if (config.flying) specials.push("飞行");
    if (config.armor) specials.push("护甲(" + Math.round(config.armorReduction * 100) + "%)");
    if (config.split) specials.push("分裂");
    if (config.invisible) specials.push("隐身");
    if (config.explodeOnDeath) specials.push("死亡爆炸");

    if (specials.length > 0) {
      statsHtml += this.createDetailStatRow("特殊能力", specials.join("、"));
    }

    statsEl.innerHTML = statsHtml;

    // 生成描述
    let desc = "";
    if (config.flying) desc += "飞行单位，不受地面阻挡影响。";
    if (config.armor) desc += "拥有护甲，减少受到的伤害。";
    if (config.split) desc += `死亡时分裂为${config.splitCount}个小型单位。`;
    if (config.invisible) desc += "具有隐身能力，需要特殊手段才能发现。";
    if (config.explodeOnDeath) desc += `死亡时对周围造成${config.explodeDamage}点范围伤害。`;
    if (!desc) desc = "普通敌人，没有特殊能力。";

    descEl.textContent = desc;

    panel.classList.remove("hidden");
  
};
UI.prototype.hideEnemyDetail = function() {
    const panel = document.getElementById("enemy-detail-panel");
    if (panel) panel.classList.add("hidden");
  
};
// 辅助方法：创建详情属性行
UI.prototype.createDetailStatRow = function(label, value, highlight = false) {
    return `
      <div class="detail-stat-row">
        <span class="detail-stat-label">${label}</span>
        <span class="detail-stat-value ${highlight ? 'highlight' : ''}">${value}</span>
      </div>
    `;
  
};
