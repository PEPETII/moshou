// UI：融合图鉴
// === 融合图鉴系统事件监听 ===
UI.prototype.setupFusionEncyclopediaEventListeners = function() {
    // 融合图鉴按钮
    const btnFusionEncyclopedia = document.getElementById("btn-fusion-encyclopedia");
    if (btnFusionEncyclopedia) {
      this.addTrackedEventListener(btnFusionEncyclopedia, "click", () => {
        this.showFusionEncyclopedia();
      });
    }

    // 从融合图鉴返回图鉴主界面
    const backToEncyclopediaFromFusion = document.getElementById("back-to-encyclopedia-from-fusion");
    if (backToEncyclopediaFromFusion) {
      this.addTrackedEventListener(backToEncyclopediaFromFusion, "click", () => {
        this.hideFusionEncyclopedia();
        this.showEncyclopedia();
      });
    }

    // 融合指南按钮
    const btnFusionGuide = document.getElementById("btn-fusion-guide");
    if (btnFusionGuide) {
      this.addTrackedEventListener(btnFusionGuide, "click", () => {
        this.showFusionGuide();
      });
    }

    // 关闭融合详情面板
    const closeFusionDetail = document.getElementById("close-fusion-detail");
    if (closeFusionDetail) {
      this.addTrackedEventListener(closeFusionDetail, "click", () => {
        this.hideFusionDetail();
      });
    }

    // 关闭融合指南面板
    const closeFusionGuide = document.getElementById("close-fusion-guide");
    if (closeFusionGuide) {
      this.addTrackedEventListener(closeFusionGuide, "click", () => {
        this.hideFusionGuide();
      });
    }
  
};
// === 游戏内融合图鉴系统方法 ===
UI.prototype.showGameFusionEncyclopedia = function() {
    const modal = document.getElementById("game-fusion-encyclopedia-modal");
    if (modal) {
      modal.classList.remove("hidden");
      this.populateGameFusionEncyclopedia();
    }
  
};
UI.prototype.hideGameFusionEncyclopedia = function() {
    const modal = document.getElementById("game-fusion-encyclopedia-modal");
    if (modal) modal.classList.add("hidden");
    this.hideGameFusionDetail();
  
};
// 填充游戏内融合图鉴
UI.prototype.populateGameFusionEncyclopedia = function() {
    const grid = document.getElementById("game-fusion-grid");
    if (!grid) return;

    grid.innerHTML = "";

    for (const [fusionType, config] of Object.entries(CONFIG.FUSION_TOWERS)) {
      const rarity = this.getFusionRarity(config.cost);
      
      const item = document.createElement("div");
      item.className = "game-fusion-item";
      item.dataset.fusionType = fusionType;

      const componentChars = config.components.map(c => (
        CONFIG.TOWERS[c]?.char || CONFIG.FUSION_TOWERS[c]?.char || c
      )).join('+');
      const tierText = config.tier ? `T${config.tier}` : 'T1';
      const evoTag = config.isEvolution ? '·进化' : '';

      item.innerHTML = `
        <span class="fusion-rarity-tag ${rarity.level}">${rarity.name}</span>
        <span class="fusion-result-char">${config.char}</span>
        <span class="fusion-components">${componentChars}</span>
        <span class="fusion-cost">${config.cost}墨 ${tierText}${evoTag}</span>
      `;

      const clickHandler = () => {
        this.showGameFusionDetail(fusionType, config);
      };
      this.addTrackedEventListener(item, "click", clickHandler);

      grid.appendChild(item);
    }
  
};
// 显示游戏内融合详情
UI.prototype.showGameFusionDetail = function(fusionType, config) {
    const panel = document.getElementById("game-fusion-detail-panel");
    const charEl = document.getElementById("game-fusion-detail-char");
    const nameEl = document.getElementById("game-fusion-detail-name");
    const rarityEl = document.getElementById("game-fusion-detail-rarity");
    const materialsEl = document.getElementById("game-fusion-detail-materials");
    const statsEl = document.getElementById("game-fusion-detail-stats");
    const descEl = document.getElementById("game-fusion-detail-desc");

    if (!panel) return;

    const rarity = this.getFusionRarity(config.cost);

    charEl.textContent = config.char;
    nameEl.textContent = fusionType;
    rarityEl.textContent = rarity.name;
    rarityEl.className = `fusion-rarity ${rarity.level}`;

    // 材料信息
    const materialsHtml = config.components.map(comp => {
      const towerConfig = CONFIG.TOWERS[comp];
      const fusionConfig = CONFIG.FUSION_TOWERS[comp];
      const label = towerConfig?.char || fusionConfig?.char || comp;
      return `
        <div class="game-fusion-material-item">
          <span class="game-fusion-material-char">${label}</span>
          <span class="game-fusion-material-name">${label}</span>
        </div>
      `;
    }).join('');

    materialsEl.innerHTML = `
      <div class="game-fusion-materials-title">融合材料</div>
      <div class="game-fusion-materials-list">${materialsHtml}</div>
    `;

    // 属性列表
    let statsHtml = '';
    if (config.damage !== undefined) {
      statsHtml += this.createGameFusionStatRow("攻击力", config.damage);
    }
    if (config.range !== undefined && config.range > 0) {
      statsHtml += this.createGameFusionStatRow("射程", config.range + "格");
    }
    if (config.cooldown !== undefined && config.cooldown > 0 && config.cooldown < 999999) {
      statsHtml += this.createGameFusionStatRow("攻速", (config.cooldown / 1000).toFixed(1) + "秒");
    }
    if (config.hp !== undefined) {
      statsHtml += this.createGameFusionStatRow("生命值", config.hp);
    }
    if (config.cost !== undefined) {
      statsHtml += this.createGameFusionStatRow("融合费用", config.cost + "墨", true);
    }
    if (config.onPath) {
      statsHtml += this.createGameFusionStatRow("放置位置", "路径上");
    }

    statsEl.innerHTML = statsHtml;

    // 描述
    let descText = config.desc || "暂无描述";
    if (config.tier) {
      descText += `\n阶位: T${config.tier}${config.isEvolution ? ' (进化)' : ''}`;
    }
    if (config.skillId) {
      descText += `\n技能: ${config.skillId}`;
    }
    descEl.textContent = descText;

    panel.classList.remove("hidden");
  
};
UI.prototype.createGameFusionStatRow = function(label, value, highlight = false) {
    return `
      <div class="game-fusion-detail-stat-row">
        <span class="game-fusion-detail-stat-label">${label}</span>
        <span class="game-fusion-detail-stat-value ${highlight ? 'highlight' : ''}">${value}</span>
      </div>
    `;
  
};
UI.prototype.hideGameFusionDetail = function() {
    const panel = document.getElementById("game-fusion-detail-panel");
    if (panel) panel.classList.add("hidden");
  
};
// === 融合图鉴系统方法 ===
UI.prototype.showFusionEncyclopedia = function() {
    const encyclopediaContainer = document.getElementById("encyclopedia-container");
    const fusionEncyclopediaContainer = document.getElementById("fusion-encyclopedia-container");

    if (encyclopediaContainer) encyclopediaContainer.classList.add("hidden");
    if (fusionEncyclopediaContainer) {
      fusionEncyclopediaContainer.classList.remove("hidden");
      this.populateFusionEncyclopedia();
    }
  
};
UI.prototype.hideFusionEncyclopedia = function() {
    const fusionEncyclopediaContainer = document.getElementById("fusion-encyclopedia-container");
    if (fusionEncyclopediaContainer) fusionEncyclopediaContainer.classList.add("hidden");
  
};
// 获取稀有度
UI.prototype.getFusionRarity = function(cost) {
    if (cost < 200) return { level: 'common', name: '普通' };
    if (cost <= 250) return { level: 'rare', name: '稀有' };
    if (cost <= 300) return { level: 'epic', name: '史诗' };
    return { level: 'legendary', name: '传说' };
  
};
// 填充融合图鉴
UI.prototype.populateFusionEncyclopedia = function() {
    const grid = document.getElementById("fusion-encyclopedia-grid");
    if (!grid) return;

    grid.innerHTML = "";

    for (const [fusionType, config] of Object.entries(CONFIG.FUSION_TOWERS)) {
      const rarity = this.getFusionRarity(config.cost);
      
      const item = document.createElement("div");
      item.className = "encyclopedia-item fusion-item";
      item.dataset.fusionType = fusionType;

      const componentChars = config.components.map(c => (
        CONFIG.TOWERS[c]?.char || CONFIG.FUSION_TOWERS[c]?.char || c
      )).join('+');
      const tierText = config.tier ? `T${config.tier}` : 'T1';
      const evoTag = config.isEvolution ? '·进化' : '';

      item.innerHTML = `
        <span class="fusion-rarity-tag ${rarity.level}">${rarity.name}</span>
        <span class="fusion-result-char">${config.char}</span>
        <span class="fusion-components">${componentChars}</span>
        <span class="fusion-cost">${config.cost}墨 ${tierText}${evoTag}</span>
      `;

      const clickHandler = () => {
        this.showFusionDetail(fusionType, config);
      };
      this.addTrackedEventListener(item, "click", clickHandler);

      grid.appendChild(item);
    }
  
};
// 显示融合详情
UI.prototype.showFusionDetail = function(fusionType, config) {
    const panel = document.getElementById("fusion-detail-panel");
    const charEl = document.getElementById("fusion-detail-char");
    const nameEl = document.getElementById("fusion-detail-name");
    const rarityEl = document.getElementById("fusion-detail-rarity");
    const materialsEl = document.getElementById("fusion-detail-materials");
    const comparisonEl = document.getElementById("fusion-detail-comparison");
    const descEl = document.getElementById("fusion-detail-desc");

    if (!panel) return;

    const rarity = this.getFusionRarity(config.cost);

    charEl.textContent = config.char;
    nameEl.textContent = fusionType;
    rarityEl.textContent = rarity.name;
    rarityEl.className = `fusion-rarity ${rarity.level}`;

    // 材料信息
    const materialsHtml = config.components.map(comp => {
      const towerConfig = CONFIG.TOWERS[comp];
      const fusionConfig = CONFIG.FUSION_TOWERS[comp];
      const label = towerConfig?.char || fusionConfig?.char || comp;
      return `
        <div class="material-item">
          <span class="material-char">${label}</span>
          <span class="material-name">${label}</span>
        </div>
      `;
    }).join('');

    materialsEl.innerHTML = `
      <div class="materials-title">融合材料</div>
      <div class="materials-list">${materialsHtml}</div>
    `;

    // 属性对比
    let comparisonHtml = '<div class="comparison-title">属性对比</div>';
    
    // 计算材料平均属性
    const materialConfigs = config.components.map(c => CONFIG.TOWERS[c]).filter(Boolean);
    const avgDamage = materialConfigs.reduce((sum, c) => sum + (c.damage || 0), 0) / materialConfigs.length;
    const avgRange = materialConfigs.reduce((sum, c) => sum + (c.range || 0), 0) / materialConfigs.length;

    // 攻击力对比
    if (config.damage !== undefined) {
      comparisonHtml += this.createComparisonRow("攻击力", avgDamage.toFixed(1), config.damage);
    }
    
    // 射程对比
    if (config.range !== undefined) {
      comparisonHtml += this.createComparisonRow("射程", avgRange.toFixed(1) + "格", config.range + "格");
    }
    
    // 攻速
    if (config.cooldown !== undefined) {
      comparisonHtml += this.createComparisonRow("攻速", "-", (config.cooldown / 1000).toFixed(1) + "秒");
    }
    
    // 生命值
    if (config.hp !== undefined) {
      comparisonHtml += this.createComparisonRow("生命值", "-", config.hp);
    }

    comparisonEl.innerHTML = comparisonHtml;

    // 描述
    descEl.textContent = config.desc || "暂无描述";
    if (config.skillId) {
      descEl.textContent += `\n技能ID: ${config.skillId}`;
    }
    if (config.isEvolution && config.evolutionFrom) {
      descEl.textContent += `\n进化来源: ${config.evolutionFrom}`;
    }

    panel.classList.remove("hidden");
  
};
UI.prototype.createComparisonRow = function(label, materialValue, resultValue) {
    return `
      <div class="comparison-row">
        <span class="comparison-label">${label}</span>
        <div class="comparison-values">
          <span class="comparison-material">${materialValue}</span>
          <span class="comparison-arrow">→</span>
          <span class="comparison-result">${resultValue}</span>
        </div>
      </div>
    `;
  
};
UI.prototype.hideFusionDetail = function() {
    const panel = document.getElementById("fusion-detail-panel");
    if (panel) panel.classList.add("hidden");
  
};
// 显示融合指南
UI.prototype.showFusionGuide = function() {
    const panel = document.getElementById("fusion-guide-panel");
    if (panel) panel.classList.remove("hidden");
  
};
UI.prototype.hideFusionGuide = function() {
    const panel = document.getElementById("fusion-guide-panel");
    if (panel) panel.classList.add("hidden");
  
};
