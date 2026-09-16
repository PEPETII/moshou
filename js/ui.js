class UI {
  // 静态变量：防止 UI 事件重复绑定
  static _eventsBound = false;
  constructor(game) {
    this.game = game;
    this.canvas = game.canvas;
    this.selectedTowerType = null;
    this.hoveredCell = null;
    this.selectedTower = null;

    // 拖拽融合相关属性
    this.draggingTower = null;
    this.dragStartPos = null;
    this.dragCurrentPos = null;
    this.isDragging = false;
    this.dragThreshold = 5; // 拖拽触发阈值（像素）
    this.dragJustCompleted = false; // 拖拽刚完成标志，防止触发点击事件

    this.towerInfo = document.getElementById("tower-info");
    this.modal = document.getElementById("modal");

    // 征服模式当前状态
    this.currentConquestThemeId = null;

    // 事件监听器追踪数组，用于清理事件监听
    this._eventListeners = [];

    // 防止事件重复绑定（使用静态变量）
    if (!UI._eventsBound) {
      this.setupMenuEventListeners();
      this.setupEventListeners();
      UI._eventsBound = true;
    }

    this.createTowerSelects();
  }

  /**
   * 添加事件监听器并保存引用，以便后续清理
   * @param {EventTarget} target - 事件目标
   * @param {string} type - 事件类型
   * @param {Function} listener - 事件监听器
   * @param {Object|boolean} options - 事件选项
   */
  addTrackedEventListener(target, type, listener, options) {
    if (!target) return;

    // 防御性检查：防止重复添加相同的事件监听器
    const isDuplicate = this._eventListeners.some(
      (item) => item.target === target && item.type === type && item.listener === listener
    );
    if (isDuplicate) {
      console.warn(`重复的事件监听器被阻止: ${type} on`, target);
      return;
    }

    target.addEventListener(type, listener, options);
    this._eventListeners.push({ target, type, listener, options });
  }

  createTowerSelects() {
    const bottomBar = document.getElementById('bottom-bar');
    if (!bottomBar) return;
    bottomBar.innerHTML = '';

    const unlockedTypes = this.game.getUnlockedTowers();

    for (const type of unlockedTypes) {
      const config = CONFIG.TOWERS[type];
      if (!config) continue;

      const el = document.createElement('div');
      el.className = 'tower-select';
      el.dataset.type = type;

      if (this.game.gold < config.cost) {
        el.classList.add('locked');
      }

      let charHtml = config.char;
      if (config.char && config.char.length >= 3) {
        charHtml = '<span>' + config.char.slice(0, 2) + '</span><span>' + config.char.slice(2) + '</span>';
      }

      el.innerHTML = '<span class="tower-char">' + charHtml + '</span><span class="tower-cost">' + config.cost + '</span>';

      const clickHandler = () => {
        if (el.classList.contains('locked')) return;

        document.querySelectorAll('.tower-select').forEach(t => t.classList.remove('selected'));

        if (this.selectedTowerType === el.dataset.type) {
          this.selectedTowerType = null;
        } else {
          el.classList.add('selected');
          this.selectedTowerType = el.dataset.type;
        }

        this.selectedTower = null;
        this.hideTowerInfo();
      };

      this.addTrackedEventListener(el, 'click', clickHandler);

      bottomBar.appendChild(el);
    }
  }

  setupMenuEventListeners() {
    // 开始游戏按钮 - 默认进入第一关（故事模式）
    const btnStart = document.getElementById("btn-start");
    if (btnStart) {
      this.addTrackedEventListener(btnStart, "click", () => {
        this.game.startGame("1-1");
      });
    }

    // 图鉴按钮
    const btnEncyclopedia = document.getElementById("btn-encyclopedia");
    if (btnEncyclopedia) {
      this.addTrackedEventListener(btnEncyclopedia, "click", () => {
        this.showEncyclopedia();
      });
    }

    // 塔防模式按钮 - 显示主题选择界面
    const btnLevels = document.getElementById("btn-levels");
    if (btnLevels) {
      this.addTrackedEventListener(btnLevels, "click", () => {
        this.showThemeSelect();
      });
    }

    // 征服模式按钮 - 显示征服模式主题选择界面
    const btnConquest = document.getElementById("btn-conquest");
    if (btnConquest) {
      this.addTrackedEventListener(btnConquest, "click", () => {
        this.showConquestThemeSelect();
      });
    }

    // 自定义按钮 - 显示自定义主界面
    const btnCustom = document.getElementById("btn-custom");
    if (btnCustom) {
      this.addTrackedEventListener(btnCustom, "click", () => {
        this.showCustomMenu();
      });
    }

    // 征服模式返回主菜单按钮
    const backToMenuFromConquestTheme = document.getElementById("back-to-menu-from-conquest-theme");
    if (backToMenuFromConquestTheme) {
      this.addTrackedEventListener(backToMenuFromConquestTheme, "click", () => {
        this.returnToMainMenu();
      });
    }

    // 征服模式返回主题列表按钮
    const backToConquestThemes = document.getElementById("back-to-conquest-themes");
    if (backToConquestThemes) {
      this.addTrackedEventListener(backToConquestThemes, "click", () => {
        this.showConquestThemeSelect();
      });
    }

    // 返回主菜单按钮（菜单内）
    const backToMenu = document.getElementById("back-to-menu");
    if (backToMenu) {
      this.addTrackedEventListener(backToMenu, "click", () => {
        this.returnToMainMenu();
      });
    }

    // 返回主题按钮
    const backToThemes = document.getElementById("back-to-themes");
    if (backToThemes) {
      this.addTrackedEventListener(backToThemes, "click", () => {
        this.showThemeSelect();
      });
    }

    // 返回主菜单按钮（游戏中顶部栏）
    const backToMenuBtn = document.getElementById("back-to-menu-btn");
    if (backToMenuBtn) {
      this.addTrackedEventListener(backToMenuBtn, "click", () => {
        this.game.returnToLevelSelect();
      });
    }

    // 游戏内融合图鉴按钮
    const fusionEncyclopediaBtn = document.getElementById("fusion-encyclopedia-btn");
    if (fusionEncyclopediaBtn) {
      this.addTrackedEventListener(fusionEncyclopediaBtn, "click", () => {
        this.showGameFusionEncyclopedia();
      });
    }

    // 关闭游戏内融合图鉴模态窗口
    const closeGameFusionModal = document.getElementById("close-game-fusion-modal");
    if (closeGameFusionModal) {
      this.addTrackedEventListener(closeGameFusionModal, "click", () => {
        this.hideGameFusionEncyclopedia();
      });
    }

    // 关闭游戏内融合详情面板
    const closeGameFusionDetail = document.getElementById("close-game-fusion-detail");
    if (closeGameFusionDetail) {
      this.addTrackedEventListener(closeGameFusionDetail, "click", () => {
        this.hideGameFusionDetail();
      });
    }

    // === 图鉴系统事件监听 ===
    this.setupEncyclopediaEventListeners();

    // === 自定义功能事件监听 ===
    this.setupCustomEventListeners();
  }

  // === 图鉴系统事件监听 ===
  setupEncyclopediaEventListeners() {
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
  }

  // === 融合图鉴系统事件监听 ===
  setupFusionEncyclopediaEventListeners() {
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
  }

  // === 游戏内融合图鉴系统方法 ===
  showGameFusionEncyclopedia() {
    const modal = document.getElementById("game-fusion-encyclopedia-modal");
    if (modal) {
      modal.classList.remove("hidden");
      this.populateGameFusionEncyclopedia();
    }
  }

  hideGameFusionEncyclopedia() {
    const modal = document.getElementById("game-fusion-encyclopedia-modal");
    if (modal) modal.classList.add("hidden");
    this.hideGameFusionDetail();
  }

  // 填充游戏内融合图鉴
  populateGameFusionEncyclopedia() {
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
        <span class="fusion-cost">${config.cost}金 ${tierText}${evoTag}</span>
      `;

      const clickHandler = () => {
        this.showGameFusionDetail(fusionType, config);
      };
      this.addTrackedEventListener(item, "click", clickHandler);

      grid.appendChild(item);
    }
  }

  // 显示游戏内融合详情
  showGameFusionDetail(fusionType, config) {
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
      statsHtml += this.createGameFusionStatRow("融合费用", config.cost + "金", true);
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
  }

  createGameFusionStatRow(label, value, highlight = false) {
    return `
      <div class="game-fusion-detail-stat-row">
        <span class="game-fusion-detail-stat-label">${label}</span>
        <span class="game-fusion-detail-stat-value ${highlight ? 'highlight' : ''}">${value}</span>
      </div>
    `;
  }

  hideGameFusionDetail() {
    const panel = document.getElementById("game-fusion-detail-panel");
    if (panel) panel.classList.add("hidden");
  }

  // === 融合图鉴系统方法 ===
  showFusionEncyclopedia() {
    const encyclopediaContainer = document.getElementById("encyclopedia-container");
    const fusionEncyclopediaContainer = document.getElementById("fusion-encyclopedia-container");

    if (encyclopediaContainer) encyclopediaContainer.classList.add("hidden");
    if (fusionEncyclopediaContainer) {
      fusionEncyclopediaContainer.classList.remove("hidden");
      this.populateFusionEncyclopedia();
    }
  }

  hideFusionEncyclopedia() {
    const fusionEncyclopediaContainer = document.getElementById("fusion-encyclopedia-container");
    if (fusionEncyclopediaContainer) fusionEncyclopediaContainer.classList.add("hidden");
  }

  // 获取稀有度
  getFusionRarity(cost) {
    if (cost < 200) return { level: 'common', name: '普通' };
    if (cost <= 250) return { level: 'rare', name: '稀有' };
    if (cost <= 300) return { level: 'epic', name: '史诗' };
    return { level: 'legendary', name: '传说' };
  }

  // 填充融合图鉴
  populateFusionEncyclopedia() {
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
        <span class="fusion-cost">${config.cost}金 ${tierText}${evoTag}</span>
      `;

      const clickHandler = () => {
        this.showFusionDetail(fusionType, config);
      };
      this.addTrackedEventListener(item, "click", clickHandler);

      grid.appendChild(item);
    }
  }

  // 显示融合详情
  showFusionDetail(fusionType, config) {
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
  }

  createComparisonRow(label, materialValue, resultValue) {
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
  }

  hideFusionDetail() {
    const panel = document.getElementById("fusion-detail-panel");
    if (panel) panel.classList.add("hidden");
  }

  // 显示融合指南
  showFusionGuide() {
    const panel = document.getElementById("fusion-guide-panel");
    if (panel) panel.classList.remove("hidden");
  }

  hideFusionGuide() {
    const panel = document.getElementById("fusion-guide-panel");
    if (panel) panel.classList.add("hidden");
  }

  // === 图鉴系统方法 ===
  showEncyclopedia() {
    const menuButtons = document.querySelector(".menu-buttons");
    const encyclopediaContainer = document.getElementById("encyclopedia-container");

    if (menuButtons) menuButtons.style.display = "none";
    if (encyclopediaContainer) encyclopediaContainer.classList.remove("hidden");
  }

  hideEncyclopedia() {
    const menuButtons = document.querySelector(".menu-buttons");
    const encyclopediaContainer = document.getElementById("encyclopedia-container");

    if (menuButtons) menuButtons.style.display = "flex";
    if (encyclopediaContainer) encyclopediaContainer.classList.add("hidden");
  }

  showTowerEncyclopedia() {
    const encyclopediaContainer = document.getElementById("encyclopedia-container");
    const towerEncyclopediaContainer = document.getElementById("tower-encyclopedia-container");

    if (encyclopediaContainer) encyclopediaContainer.classList.add("hidden");
    if (towerEncyclopediaContainer) {
      towerEncyclopediaContainer.classList.remove("hidden");
      this.populateTowerEncyclopedia();
    }
  }

  hideTowerEncyclopedia() {
    const towerEncyclopediaContainer = document.getElementById("tower-encyclopedia-container");
    if (towerEncyclopediaContainer) towerEncyclopediaContainer.classList.add("hidden");
  }

  showEnemyEncyclopedia() {
    const encyclopediaContainer = document.getElementById("encyclopedia-container");
    const enemyEncyclopediaContainer = document.getElementById("enemy-encyclopedia-container");

    if (encyclopediaContainer) encyclopediaContainer.classList.add("hidden");
    if (enemyEncyclopediaContainer) {
      enemyEncyclopediaContainer.classList.remove("hidden");
      this.populateEnemyEncyclopedia();
    }
  }

  hideEnemyEncyclopedia() {
    const enemyEncyclopediaContainer = document.getElementById("enemy-encyclopedia-container");
    if (enemyEncyclopediaContainer) enemyEncyclopediaContainer.classList.add("hidden");
  }

  // 炮塔分类定义
  getTowerCategory(type, config) {
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
  }

  // 填充炮塔图鉴
  populateTowerEncyclopedia(filter = 'all') {
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
        <span class="item-cost">${config.cost}金</span>
      `;

      const clickHandler = () => {
        this.showTowerDetail(type, config);
      };
      this.addTrackedEventListener(item, "click", clickHandler);

      grid.appendChild(item);
    }
  }

  // 筛选炮塔图鉴
  filterTowerEncyclopedia(filter) {
    this.populateTowerEncyclopedia(filter);
  }

  // 显示炮塔详情
  showTowerDetail(type, config) {
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
      statsHtml += this.createDetailStatRow("造价", config.cost + "金", true);
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
  }

  hideTowerDetail() {
    const panel = document.getElementById("tower-detail-panel");
    if (panel) panel.classList.add("hidden");
  }

  // 填充怪物图鉴
  populateEnemyEncyclopedia() {
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
  }

  // 显示怪物详情
  showEnemyDetail(type, config) {
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
    statsHtml += this.createDetailStatRow("击败奖励", config.reward + "金", true);

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
  }

  hideEnemyDetail() {
    const panel = document.getElementById("enemy-detail-panel");
    if (panel) panel.classList.add("hidden");
  }

  // 辅助方法：创建详情属性行
  createDetailStatRow(label, value, highlight = false) {
    return `
      <div class="detail-stat-row">
        <span class="detail-stat-label">${label}</span>
        <span class="detail-stat-value ${highlight ? 'highlight' : ''}">${value}</span>
      </div>
    `;
  }

  // ==================== 征服模式 UI ====================

  /**
   * 返回主菜单
   * 隐藏所有征服模式面板，显示主菜单按钮
   */
  returnToMainMenu() {
    // 清理长按定时器，防止切换界面后定时器回调仍然执行
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.hideAllMenuPanels();
    this.currentConquestThemeId = null;
  }

  /**
   * 隐藏所有菜单面板
   */
  hideAllMenuPanels() {
    const themeSelect = document.getElementById("theme-select-container");
    const levelList = document.getElementById("level-list-container");
    const backBtn = document.getElementById("back-to-menu");
    const backToThemes = document.getElementById("back-to-themes");
    const menuButtons = document.querySelector(".menu-buttons");
    const encyclopediaContainer = document.getElementById("encyclopedia-container");
    const towerEncyclopediaContainer = document.getElementById("tower-encyclopedia-container");
    const enemyEncyclopediaContainer = document.getElementById("enemy-encyclopedia-container");
    const fusionEncyclopediaContainer = document.getElementById("fusion-encyclopedia-container");
    const conquestThemeSelect = document.getElementById("conquest-theme-select-container");
    const conquestLevelSelect = document.getElementById("conquest-level-select-container");

    if (themeSelect) themeSelect.classList.add("hidden");
    if (levelList) levelList.classList.add("hidden");
    if (backBtn) backBtn.classList.add("hidden");
    if (backToThemes) backToThemes.classList.add("hidden");
    if (menuButtons) menuButtons.style.display = "flex";
    if (encyclopediaContainer) encyclopediaContainer.classList.add("hidden");
    if (towerEncyclopediaContainer) towerEncyclopediaContainer.classList.add("hidden");
    if (enemyEncyclopediaContainer) enemyEncyclopediaContainer.classList.add("hidden");
    if (fusionEncyclopediaContainer) fusionEncyclopediaContainer.classList.add("hidden");
    if (conquestThemeSelect) conquestThemeSelect.classList.add("hidden");
    if (conquestLevelSelect) conquestLevelSelect.classList.add("hidden");

    // 隐藏自定义相关容器
    const customContainer = document.getElementById("custom-container");
    const customTowersContainer = document.getElementById("custom-towers-container");
    const customLevelsContainer = document.getElementById("custom-levels-container");
    const customExportContainer = document.getElementById("custom-export-container");

    if (customContainer) customContainer.classList.add("hidden");
    if (customTowersContainer) customTowersContainer.classList.add("hidden");
    if (customLevelsContainer) customLevelsContainer.classList.add("hidden");
    if (customExportContainer) customExportContainer.classList.add("hidden");
  }

  // ==================== 自定义功能方法 ====================

  /**
   * 设置自定义功能事件监听
   */
  setupCustomEventListeners() {
    // 返回主菜单按钮（从自定义主界面）
    const backToMenuFromCustom = document.getElementById("back-to-menu-from-custom");
    if (backToMenuFromCustom) {
      this.addTrackedEventListener(backToMenuFromCustom, "click", () => {
        this.returnToMainMenu();
      });
    }

    // 自定义炮塔卡片
    const btnCustomTowers = document.getElementById("btn-custom-towers");
    if (btnCustomTowers) {
      this.addTrackedEventListener(btnCustomTowers, "click", () => {
        this.showCustomTowers();
      });
    }

    // 自定义关卡卡片
    const btnCustomLevels = document.getElementById("btn-custom-levels");
    if (btnCustomLevels) {
      this.addTrackedEventListener(btnCustomLevels, "click", () => {
        this.showCustomLevels();
      });
    }

    // 导出/导入卡片
    const btnCustomExport = document.getElementById("btn-custom-export");
    if (btnCustomExport) {
      this.addTrackedEventListener(btnCustomExport, "click", () => {
        this.showCustomExport();
      });
    }

    // 返回自定义主界面（从子界面）
    const backToCustomFromTowers = document.getElementById("back-to-custom-from-towers");
    if (backToCustomFromTowers) {
      this.addTrackedEventListener(backToCustomFromTowers, "click", () => {
        this.hideCustomTowers();
        this.showCustomMenu();
      });
    }

    const backToCustomFromLevels = document.getElementById("back-to-custom-from-levels");
    if (backToCustomFromLevels) {
      this.addTrackedEventListener(backToCustomFromLevels, "click", () => {
        this.hideCustomLevels();
        this.showCustomMenu();
      });
    }

    const backToCustomFromExport = document.getElementById("back-to-custom-from-export");
    if (backToCustomFromExport) {
      this.addTrackedEventListener(backToCustomFromExport, "click", () => {
        this.hideCustomExport();
        this.showCustomMenu();
      });
    }
  }

  /**
   * 显示自定义主界面
   */
  showCustomMenu() {
    const menuButtons = document.querySelector(".menu-buttons");
    const customContainer = document.getElementById("custom-container");

    if (menuButtons) menuButtons.style.display = "none";
    if (customContainer) customContainer.classList.remove("hidden");
  }

  /**
   * 隐藏自定义主界面
   */
  hideCustomMenu() {
    const customContainer = document.getElementById("custom-container");
    if (customContainer) customContainer.classList.add("hidden");
  }

  /**
   * 显示自定义炮塔界面（占位）
   */
  showCustomTowers() {
    this.hideCustomMenu();
    const container = document.getElementById("custom-towers-container");
    if (container) container.classList.remove("hidden");
  }

  /**
   * 隐藏自定义炮塔界面
   */
  hideCustomTowers() {
    const container = document.getElementById("custom-towers-container");
    if (container) container.classList.add("hidden");
  }

  /**
   * 显示自定义关卡界面（占位）
   */
  showCustomLevels() {
    this.hideCustomMenu();
    const container = document.getElementById("custom-levels-container");
    if (container) container.classList.remove("hidden");
  }

  /**
   * 隐藏自定义关卡界面
   */
  hideCustomLevels() {
    const container = document.getElementById("custom-levels-container");
    if (container) container.classList.add("hidden");
  }

  /**
   * 显示导出/导入界面（占位）
   */
  showCustomExport() {
    this.hideCustomMenu();
    const container = document.getElementById("custom-export-container");
    if (container) container.classList.remove("hidden");
  }

  /**
   * 隐藏导出/导入界面
   */
  hideCustomExport() {
    const container = document.getElementById("custom-export-container");
    if (container) container.classList.add("hidden");
  }

  /**
   * 渲染主题选择界面
   * 遍历 CONQUEST_THEMES 创建主题卡片，显示解锁状态和进度
   */
  renderThemeSelect() {
    const container = document.getElementById("theme-select-container");
    if (!container) return;

    container.innerHTML = "";

    const themes = levelManager.getThemes();
    const completedLevels = this.game && this.game.completedLevels ? this.game.completedLevels : [];

    for (const theme of themes) {
      const card = document.createElement("div");
      card.className = "theme-card";
      card.style.setProperty('--theme-color', theme.color);

      // 检查主题解锁状态
      const isUnlocked = this.isThemeUnlocked(theme.id, completedLevels);
      const progress = this.getThemeProgress(theme.id, completedLevels);

      // 根据解锁状态设置样式
      if (!isUnlocked) {
        card.classList.add("locked");
      }

      // 构建进度显示
      let progressHtml = `<div class="theme-progress">进度: ${progress.completed}/${progress.total}</div>`;
      if (!isUnlocked && theme.unlockRequirement) {
        const req = theme.unlockRequirement;
        progressHtml = `<div class="theme-progress locked">需完成主题${req.theme}的第${req.level}关</div>`;
      }

      card.innerHTML = `
        <span class="theme-icon">${theme.icon}</span>
        <div class="theme-name">${theme.name}</div>
        <div class="theme-desc">${theme.desc}</div>
        ${progressHtml}
      `;

      // 绑定点击事件：只有解锁的主题才能点击
      if (isUnlocked) {
        const cardClickHandler = () => {
          this.showLevelSelect(theme.id);
        };
        this.addTrackedEventListener(card, "click", cardClickHandler);
      }

      container.appendChild(card);
    }
  }

  /**
   * 渲染关卡选择界面
   * @param {number} themeId - 主题ID
   */
  renderLevelSelect(themeId) {
    const container = document.getElementById("level-list-container");
    if (!container) return;

    const titleEl = container.querySelector(".level-list-title");
    const gridEl = container.querySelector(".level-grid");

    if (!titleEl || !gridEl) return;

    const theme = levelManager.getTheme(themeId);
    const levels = levelManager.getLevelsByTheme(themeId);
    const completedLevels = this.game && this.game.completedLevels ? this.game.completedLevels : [];

    // 保存当前主题ID
    this.currentThemeId = themeId;

    // 设置标题
    titleEl.textContent = theme.name;
    titleEl.style.color = theme.color;

    // 清空并重新填充关卡网格
    gridEl.innerHTML = "";

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      const item = document.createElement("div");
      item.className = "level-item";

      // 检查关卡完成状态
      const isCompleted = completedLevels.includes(level.id);

      // 所有关卡默认解锁
      const isUnlocked = true;

      // 设置样式
      if (isCompleted) {
        item.classList.add("completed");
      }

      item.innerHTML = `
        <span class="level-num">${level.id.split('-')[1]}</span>
        <span class="level-name">${level.name}</span>
      `;

      // 绑定点击事件：所有关卡都可以点击
      const levelClickHandler = () => {
        this.game.startGame(level.id);
      };
      this.addTrackedEventListener(item, "click", levelClickHandler);

      gridEl.appendChild(item);
    }
  }

  /**
   * 显示主题选择界面
   */
  showThemeSelect() {
    const themeSelect = document.getElementById("theme-select-container");
    const levelList = document.getElementById("level-list-container");
    const backBtn = document.getElementById("back-to-menu");
    const backToThemes = document.getElementById("back-to-themes");
    const menuButtons = document.querySelector(".menu-buttons");

    // 隐藏其他面板
    if (levelList) levelList.classList.add("hidden");
    if (backToThemes) backToThemes.classList.add("hidden");
    if (menuButtons) menuButtons.style.display = "none";

    // 显示主题选择
    if (themeSelect) {
      themeSelect.classList.remove("hidden");
      this.renderThemeSelect();
    }

    // 显示返回主菜单按钮
    if (backBtn) {
      backBtn.classList.remove("hidden");
      backBtn.textContent = "主菜单";
    }

    // 重置当前主题
    this.currentThemeId = null;
  }

  /**
   * 显示关卡选择界面
   * @param {number} themeId - 主题ID
   */
  showLevelSelect(themeId) {
    const themeSelect = document.getElementById("theme-select-container");
    const levelList = document.getElementById("level-list-container");
    const backBtn = document.getElementById("back-to-menu");
    const backToThemes = document.getElementById("back-to-themes");

    // 隐藏主题选择
    if (themeSelect) themeSelect.classList.add("hidden");

    // 隐藏征服模式容器
    document.getElementById("conquest-theme-select-container")?.classList.add("hidden");
    document.getElementById("conquest-level-select-container")?.classList.add("hidden");

    // 显示关卡选择
    if (levelList) {
      levelList.classList.remove("hidden");
      this.renderLevelSelect(themeId);
    }

    // 更新按钮显示
    if (backBtn) backBtn.classList.add("hidden");
    if (backToThemes) {
      backToThemes.classList.remove("hidden");
      backToThemes.textContent = "主题选择";
    }
  }

  /**
   * 检查主题是否已解锁
   * @param {number} themeId - 主题ID
   * @param {string[]} completedLevels - 已完成的关卡列表
   * @returns {boolean}
   */
  isThemeUnlocked(themeId, completedLevels) {
    // 所有主题默认解锁
    return true;
  }

  /**
   * 获取主题进度
   * @param {number} themeId - 主题ID
   * @param {string[]} completedLevels - 已完成的关卡列表
   * @returns {Object} { completed, total }
   */
  getThemeProgress(themeId, completedLevels) {
    const levels = levelManager.getLevelsByTheme(themeId);
    const completed = levels.filter(l => completedLevels.includes(l.id)).length;
    return { completed, total: levels.length };
  }

  // ==================== 兼容旧方法 ====================

  /**
   * 填充主题选择界面（兼容旧方法）
   */
  populateThemeSelect() {
    this.renderThemeSelect();
  }

  /**
   * 显示关卡列表（兼容旧方法）
   * @param {number} themeId - 主题ID
   */
  showLevelList(themeId) {
    this.showLevelSelect(themeId);
  }

  /**
   * 填充关卡列表（兼容旧方法）
   * @param {number} themeId - 主题ID
   */
  populateLevelList(themeId) {
    this.renderLevelSelect(themeId);
  }

  setupEventListeners() {
    const mouseMoveHandler = (e) => {
      const result = getGridFromEvent(e, this.canvas);
      if (result) {
        this.hoveredCell = { gx: result.gx, gy: result.gy };
      } else {
        this.hoveredCell = null;
      }
    };
    this.addTrackedEventListener(this.canvas, "mousemove", mouseMoveHandler);

    const mouseLeaveHandler = () => {
      this.hoveredCell = null;
    };
    this.addTrackedEventListener(this.canvas, "mouseleave", mouseLeaveHandler);

    const clickHandler = (e) => {
      // 如果拖拽刚完成，忽略点击
      if (this.dragJustCompleted) return;

      const result = getGridFromEvent(e, this.canvas);
      if (!result) return;

      const { gx, gy } = result;

      if (this.selectedTowerType) {
        const placed = this.game.placeTower(this.selectedTowerType, gx, gy);
        if (placed) {
        }
      } else {
        const tower = this.game.getTowerAt(gx, gy);
        if (tower) {
          this.selectedTower = tower;
          this.showTowerInfo(tower, e.clientX, e.clientY);
        } else {
          this.selectedTower = null;
          this.hideTowerInfo();
        }
      }
    };
    this.addTrackedEventListener(this.canvas, "click", clickHandler);

    const contextMenuHandler = (e) => {
      e.preventDefault();
      this.selectedTowerType = null;
      document
        .querySelectorAll(".tower-select")
        .forEach((t) => t.classList.remove("selected"));
    };
    this.addTrackedEventListener(this.canvas, "contextmenu", contextMenuHandler);

    // === 触摸事件支持 ===
    // 防止触摸时页面滚动
    const touchStartHandler = (e) => {
      e.preventDefault();
    };
    this.addTrackedEventListener(this.canvas, 'touchstart', touchStartHandler, { passive: false });

    const touchMoveHandler = (e) => {
      e.preventDefault();

      // 更新悬停格子位置，用于预选炮塔时的攻击范围预览
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const result = getGridFromEvent(touch, this.canvas);
        if (result) {
          this.hoveredCell = { gx: result.gx, gy: result.gy };
        } else {
          this.hoveredCell = null;
        }
      }
    };
    this.addTrackedEventListener(this.canvas, 'touchmove', touchMoveHandler, { passive: false });

    // 触摸结束处理
    // 注意：touchend 使用 passive: true 以提高滚动性能，因为不需要阻止默认行为
    const touchEndHandler = (e) => {
      if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const result = getGridFromEvent(touch, this.canvas);
        if (!result) return;

        const { gx, gy } = result;

        if (this.selectedTowerType) {
          this.game.placeTower(this.selectedTowerType, gx, gy);
        } else {
          const tower = this.game.getTowerAt(gx, gy);
          if (tower) {
            this.selectedTower = tower;
            this.showTowerInfo(tower, touch.clientX, touch.clientY);
          } else {
            this.selectedTower = null;
            this.hideTowerInfo();
          }
        }
      }
    };
    this.addTrackedEventListener(this.canvas, 'touchend', touchEndHandler, { passive: true });

    // 长按显示炮塔信息（移动端)
    this.longPressTimer = null;
    this.longPressDelay = CONFIG.GAMEPLAY?.longPressDelay || 500; // 长按阈值(ms)

    const longPressTouchStartHandler = (e) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const result = getGridFromEvent(touch, this.canvas);
      if (!result) return;

      const { gx, gy } = result;
      const tower = this.game.getTowerAt(gx, gy);

      if (tower && !this.selectedTowerType) {
        this.longPressTimer = setTimeout(() => {
          this.selectedTower = tower;
          this.showTowerInfo(tower, touch.clientX, touch.clientY);
        }, this.longPressDelay);
      }
    };
    this.addTrackedEventListener(this.canvas, 'touchstart', longPressTouchStartHandler, { passive: false });

    const longPressTouchEndHandler = () => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    };
    this.addTrackedEventListener(this.canvas, 'touchend', longPressTouchEndHandler, { passive: false });

    const longPressTouchMoveHandler = (e) => {
      // 多点触控时清除长按定时器
      if (e.touches.length !== 1 && this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    };
    this.addTrackedEventListener(this.canvas, 'touchmove', longPressTouchMoveHandler, { passive: false });

    // 触摸取消时清理长按定时器
    const longPressTouchCancelHandler = () => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    };
    this.addTrackedEventListener(this.canvas, 'touchcancel', longPressTouchCancelHandler, { passive: false });

    const startWaveBtn = document.getElementById("start-wave");
    if (startWaveBtn) {
      this.addTrackedEventListener(startWaveBtn, "click", () => {
        this.game.startWave();
      });
    }

    const upgradeBtn = document.querySelector(".upgrade-btn");
    if (upgradeBtn) {
      this.addTrackedEventListener(upgradeBtn, "click", () => {
        if (this.selectedTower) {
          const upgraded = this.selectedTower.upgrade();
          if (upgraded) {
          }
          this.showTowerInfo(
            this.selectedTower,
            parseFloat(this.towerInfo.style.left) +
              this.towerInfo.offsetWidth / 2,
            parseFloat(this.towerInfo.style.top) +
              this.towerInfo.offsetHeight / 2,
          );
          this.game.updateUI();
        }
      });
    }

    const sellBtn = document.querySelector(".sell-btn");
    if (sellBtn) {
      this.addTrackedEventListener(sellBtn, "click", () => {
        if (this.selectedTower) {
          this.game.sellTower(this.selectedTower);
          this.selectedTower = null;
          this.hideTowerInfo();
        }
      });
    }

    // === 拖拽融合事件监听 ===
    this.setupDragAndDrop();
  }

  // === 拖拽融合系统 ===
  setupDragAndDrop() {
    const mouseDownHandler = (e) => {
      const result = getGridFromEvent(e, this.canvas);
      if (!result) return;

      const { gx, gy } = result;
      const tower = this.game.getTowerAt(gx, gy);
      if (tower) {
        this.draggingTower = tower;
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.dragCurrentPos = { x: e.clientX, y: e.clientY };
        // 缓存拖拽所需的 canvas 尺寸信息
        this._cacheDragMetrics();
      }
    };
    this.addTrackedEventListener(this.canvas, 'mousedown', mouseDownHandler);

    const dragMouseMoveHandler = (e) => {
      if (this.draggingTower) {
        this.dragCurrentPos = { x: e.clientX, y: e.clientY };

        // 检查是否达到拖拽阈值
        const dist = calculateDragDistance(this.dragStartPos.x, this.dragStartPos.y, this.dragCurrentPos.x, this.dragCurrentPos.y);

        if (checkDragThreshold(dist, this.dragThreshold)) {
          this.isDragging = true;
        }
      }
    };
    this.addTrackedEventListener(this.canvas, 'mousemove', dragMouseMoveHandler);

    const mouseUpHandler = (e) => {
      if (this.draggingTower && this.isDragging) {
        const result = getGridFromEvent(e, this.canvas);
        if (result) {
          const { gx, gy } = result;
          const targetTower = this.game.getTowerAt(gx, gy);
          if (targetTower && targetTower !== this.draggingTower) {
            this.attemptFusion(this.draggingTower, targetTower);
          }
        }

        // 标记拖拽刚完成，防止触发点击事件
        this.dragJustCompleted = true;
        setTimeout(() => { this.dragJustCompleted = false; }, 50);
      }

      // 重置拖拽状态并清理缓存
      this.draggingTower = null;
      this.dragStartPos = null;
      this.dragCurrentPos = null;
      this.isDragging = false;
      this._clearDragCache();
    };
    this.addTrackedEventListener(this.canvas, 'mouseup', mouseUpHandler);

    // 鼠标离开画布时取消拖拽
    const dragMouseLeaveHandler = () => {
      this.draggingTower = null;
      this.dragStartPos = null;
      this.dragCurrentPos = null;
      this.isDragging = false;
      this._clearDragCache();
    };
    this.addTrackedEventListener(this.canvas, 'mouseleave', dragMouseLeaveHandler);

    // === 触摸拖拽支持 ===
    const dragTouchStartHandler = (e) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const result = getGridFromEvent(touch, this.canvas);
      if (!result) return;

      const { gx, gy } = result;
      const tower = this.game.getTowerAt(gx, gy);
      if (tower) {
        this.draggingTower = tower;
        this.dragStartPos = { x: touch.clientX, y: touch.clientY };
        this.dragCurrentPos = { x: touch.clientX, y: touch.clientY };
        this.isDragging = false;
        // 缓存拖拽所需的 canvas 尺寸信息
        this._cacheDragMetrics();
      }
    };
    this.addTrackedEventListener(this.canvas, 'touchstart', dragTouchStartHandler, { passive: false });

    const dragTouchMoveHandler = (e) => {
      // 多点触控时取消拖拽状态
      if (e.touches.length !== 1) {
        this.draggingTower = null;
        this.dragStartPos = null;
        this.dragCurrentPos = null;
        this.isDragging = false;
        return;
      }
      if (this.draggingTower) {
        const touch = e.touches[0];
        this.dragCurrentPos = { x: touch.clientX, y: touch.clientY };

        const dist = calculateDragDistance(this.dragStartPos.x, this.dragStartPos.y, this.dragCurrentPos.x, this.dragCurrentPos.y);

        if (checkDragThreshold(dist, this.dragThreshold)) {
          this.isDragging = true;
        }
      }
    };
    this.addTrackedEventListener(this.canvas, 'touchmove', dragTouchMoveHandler, { passive: false });

    const dragTouchEndHandler = (e) => {
      // 多点触控场景下，如果还有剩余触摸点，不处理拖拽结束
      if (e.touches.length > 0) {
        return;
      }
      if (this.draggingTower && this.isDragging) {
        if (e.changedTouches.length > 0) {
          const touch = e.changedTouches[0];
          const result = getGridFromEvent(touch, this.canvas);
          if (result) {
            const { gx, gy } = result;
            const targetTower = this.game.getTowerAt(gx, gy);
            if (targetTower && targetTower !== this.draggingTower) {
              this.attemptFusion(this.draggingTower, targetTower);
            }
          }
        }

        // 标记拖拽刚完成，防止触发点击事件
        this.dragJustCompleted = true;
        setTimeout(() => { this.dragJustCompleted = false; }, 50);
      }

      this.draggingTower = null;
      this.dragStartPos = null;
      this.dragCurrentPos = null;
      this.isDragging = false;
      this._clearDragCache();
    };
    this.addTrackedEventListener(this.canvas, 'touchend', dragTouchEndHandler, { passive: false });

    // 触摸取消时清理拖拽状态
    const touchCancelHandler = () => {
      this.draggingTower = null;
      this.dragStartPos = null;
      this.dragCurrentPos = null;
      this.isDragging = false;
      this._clearDragCache();
    };
    this.addTrackedEventListener(this.canvas, 'touchcancel', touchCancelHandler, { passive: false });
  }

  attemptFusion(tower1, tower2) {
    const preview = this.game.getFusionPreview(tower1, tower2);
    if (!preview) {
      // 无法融合，显示提示
      this.showFusionFailed();
      return;
    }

    // 显示融合确认弹窗
    this.showFusionConfirm(tower1, tower2, preview);
  }

  showFusionConfirm(tower1, tower2, preview) {
    const canFuse = this.game.canFuse(tower1, tower2);

    let message = `将 ${tower1.char} 和 ${tower2.char} 融合成 ${preview.char}\n`;
    message += `效果: ${preview.desc}\n`;
    message += `费用: ${preview.cost}金\n`;
    if (preview.tier) {
      message += `阶位: T${preview.tier}${preview.isEvolution ? ' (进化)' : ''}\n`;
    }
    if (preview.onPath) {
      message += `约束: 该融合塔必须位于路径格\n`;
    }

    if (!canFuse && !preview.canAfford) {
      message += `\n⚠️ 金币不足!`;
    } else if (!canFuse && preview.canAfford) {
      message += `\n⚠️ 当前组合不满足融合条件（进化白名单或路径限制）`;
    }

    const modal = document.getElementById('modal');
    const titleEl = document.getElementById('modal-title');
    const textEl = document.getElementById('modal-text');
    const btnEl = document.getElementById('modal-btn');

    titleEl.textContent = '融合炮塔';
    textEl.textContent = message;
    btnEl.textContent = canFuse ? '确认融合' : '取消';
    btnEl.disabled = false;
    modal.classList.remove('hidden');

    // 清理之前可能存在的事件监听器
    this._cleanupFusionModalListeners();

    // 保存融合信息
    this.pendingFusion = canFuse ? { tower1, tower2 } : null;
    this._fusionProcessing = false; // 初始化处理标志位

    // 使用 addEventListener 绑定事件，避免覆盖其他处理器
    this._fusionConfirmHandler = () => {
      // 防抖：防止重复处理
      if (this._fusionProcessing) return;
      this._fusionProcessing = true;
      
      // 禁用按钮防止重复点击
      btnEl.disabled = true;
      
      if (this.pendingFusion) {
        this.game.fuseTowers(this.pendingFusion.tower1, this.pendingFusion.tower2);
        this.pendingFusion = null;
        this.selectedTower = null;
        this.hideTowerInfo();
      }
      this.hideModal();
    };
    
    btnEl.addEventListener('click', this._fusionConfirmHandler);
  }

  // 清理融合模态框的事件监听器
  _cleanupFusionModalListeners() {
    const btnEl = document.getElementById('modal-btn');
    if (this._fusionConfirmHandler && btnEl) {
      btnEl.removeEventListener('click', this._fusionConfirmHandler);
      this._fusionConfirmHandler = null;
    }
    this.pendingFusion = null;
    this._fusionProcessing = false; // 重置处理标志位
  }

  showFusionFailed() {
    // 简单的失败提示（可以用更优雅的方式）
    console.log('这两个炮塔无法融合');
  }

  // 绘制拖拽预览（由 Game.draw 调用）
  drawDragPreview(ctx) {
    if (!this.isDragging || !this.draggingTower) return;

    // 使用缓存的 rect 和比例计算，避免每帧重新计算
    const x = (this.dragCurrentPos.x - this._dragRectLeft) * this._dragScaleX;
    const y = (this.dragCurrentPos.y - this._dragRectTop) * this._dragScaleY;

    const rangeInPixels = this.draggingTower.range * CONFIG.CELL_SIZE;
    ctx.beginPath();
    ctx.arc(x, y, rangeInPixels, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 0, 0.3)";
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 255, 0, 0.1)";
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.font = 'bold 28px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.draggingTower.isFusion ? '#888' : '#ffff00';
    ctx.fillText(this.draggingTower.char, x, y);
    ctx.restore();
  }

  // 缓存拖拽所需的 canvas 尺寸信息
  _cacheDragMetrics() {
    const rect = this.canvas.getBoundingClientRect();
    this._dragRectLeft = rect.left;
    this._dragRectTop = rect.top;
    this._dragScaleX = 1 / (rect.width / this.canvas.width);
    this._dragScaleY = 1 / (rect.height / this.canvas.height);
  }

  // 清理拖拽缓存
  _clearDragCache() {
    this._dragRectLeft = null;
    this._dragRectTop = null;
    this._dragScaleX = null;
    this._dragScaleY = null;
  }

  showTowerInfo(tower, x, y) {
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
  }

  hideTowerInfo() {
    // 清理长按定时器，防止隐藏面板后定时器回调仍然执行
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    this.towerInfo.classList.add("hidden");
    for (const t of this.game.towers) {
      t.selected = false;
    }
  }

  showModal(title, text, buttonText = "确定", onBtnClick = null) {
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
  }

  hideModal() {
    this.modal.classList.add("hidden");
    // 清理待处理的融合状态和事件监听器
    this._cleanupFusionModalListeners();
  }

  updateUnlocks(unlockedTypes) {
    this.createTowerSelects();
  }

  // === 事件通知系统 ===
  showEventNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = 'event-notification';
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 10px;
      border: 2px solid #ffd700;
      z-index: 1000;
      min-width: 300px;
      text-align: center;
      font-family: 'Microsoft YaHei', sans-serif;
    `;
    
    notification.innerHTML = `
      <h3 style="color: #ffd700; margin: 0 0 10px 0;">
        ${type === 'success' ? '✨ 成功' : type === 'warning' ? '⚠️ 警告' : 'ℹ️ 信息'}
      </h3>
      <p style="margin: 0 0 15px 0;">${message}</p>
      <button onclick="this.parentElement.remove()" style="
        background: #ffd700;
        color: black;
        border: none;
        padding: 8px 16px;
        margin: 5px;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
      ">确定</button>
    `;
    
    const container = document.getElementById('event-container');
    if (container) {
      container.appendChild(notification);
      
      if (duration > 0) {
        setTimeout(() => {
          if (notification.parentElement) {
            notification.remove();
          }
        }, duration);
      }
    }
  }

  // === 商人事件选择界面 ===
  showMerchantEvent(options) {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.95);
      color: white;
      padding: 30px;
      border-radius: 15px;
      border: 3px solid #ffd700;
      z-index: 1000;
      min-width: 400px;
      text-align: center;
      font-family: 'Microsoft YaHei', sans-serif;
    `;
    
    dialog.innerHTML = `
      <h2 style="color: #ffd700; margin: 0 0 20px 0;">🧙‍♂️ 神秘商人到访！</h2>
      <p style="margin: 0 0 20px 0; font-size: 16px;">选择一项交易：</p>
      <div id="merchant-options"></div>
    `;
    
    const optionsContainer = dialog.querySelector('#merchant-options');
    options.forEach((option, index) => {
      const button = document.createElement('button');
      button.textContent = option.text;
      button.style.cssText = `
        display: block;
        width: 100%;
        margin: 10px 0;
        padding: 12px;
        background: #4ecdc4;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
      `;
      button.onmouseover = () => button.style.background = '#44a3aa';
      button.onmouseout = () => button.style.background = '#4ecdc4';
      button.onclick = () => {
        option.action();
        dialog.remove();
      };
      optionsContainer.appendChild(button);
    });
    
    document.getElementById('event-container').appendChild(dialog);
  }

  // ==================== 征服模式UI方法 ====================

  /**
   * 显示征服模式主题选择界面
   */
  showConquestThemeSelect() {
    const conquestThemeSelect = document.getElementById("conquest-theme-select-container");
    const menuButtons = document.querySelector(".menu-buttons");
    const backBtn = document.getElementById("back-to-menu");

    // 隐藏其他面板
    if (menuButtons) menuButtons.style.display = "none";

    // 隐藏其他容器
    const containers = [
      "theme-select-container",
      "level-list-container",
      "encyclopedia-container",
      "tower-encyclopedia-container",
      "enemy-encyclopedia-container",
      "fusion-encyclopedia-container",
      "conquest-level-select-container"
    ];
    containers.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });

    // 显示征服模式主题选择
    if (conquestThemeSelect) {
      conquestThemeSelect.classList.remove("hidden");
      this.renderConquestThemeSelect();
    }

    // 征服模式主题选择容器内部已有返回按钮，不需要显示通用的返回按钮
    if (backBtn) {
      backBtn.classList.add("hidden");
    }

    // 重置当前主题
    this.currentConquestThemeId = null;
  }

  /**
   * 渲染征服模式主题选择界面
   */
  renderConquestThemeSelect() {
    const grid = document.querySelector("#conquest-theme-select-container .conquest-theme-grid");
    if (!grid) return;

    // 获取进度
    const progress = conquestProgress ? conquestProgress.getProgress() : { completedLevels: [], unlockedThemes: [1] };
    const completedLevels = progress.completedLevels || [];

    // 清空现有内容
    grid.innerHTML = "";

    // 渲染每个主题（所有主题默认解锁）
    CONQUEST_THEMES.forEach(theme => {
      const themeProgress = this.getConquestThemeProgress(theme.id, completedLevels);

      const card = document.createElement("div");
      card.className = "conquest-theme-card";
      card.dataset.theme = theme.id;

      card.innerHTML = `
        <span class="theme-icon">${theme.icon}</span>
        <div class="theme-name">${theme.name}</div>
        <div class="theme-desc">${theme.desc}</div>
        <div class="theme-progress">进度: ${themeProgress.completed}/${themeProgress.total}</div>
      `;

      const cardClickHandler = () => {
        this.showConquestLevelSelect(theme.id);
      };
      this.addTrackedEventListener(card, "click", cardClickHandler);

      grid.appendChild(card);
    });
  }

  /**
   * 检查征服模式主题是否已解锁
   * @param {number} themeId - 主题ID
   * @param {string[]} completedLevels - 已完成的关卡列表
   * @returns {boolean}
   */
  isConquestThemeUnlocked(themeId, completedLevels) {
    // 所有主题默认解锁
    return true;
  }

  /**
   * 获取征服模式主题进度
   * @param {number} themeId - 主题ID
   * @param {string[]} completedLevels - 已完成的关卡列表
   * @returns {Object} { completed, total }
   */
  getConquestThemeProgress(themeId, completedLevels) {
    let completed = 0;
    for (let i = 1; i <= 5; i++) {
      if (completedLevels.includes(`${themeId}-${i}`)) {
        completed++;
      }
    }
    return { completed, total: 5 };
  }

  /**
   * 显示征服模式关卡选择界面
   * @param {number} themeId - 主题ID
   */
  showConquestLevelSelect(themeId) {
    this.currentConquestThemeId = themeId;

    const conquestThemeSelect = document.getElementById("conquest-theme-select-container");
    const conquestLevelSelect = document.getElementById("conquest-level-select-container");
    const backBtn = document.getElementById("back-to-menu");

    // 隐藏征服主题选择
    if (conquestThemeSelect) conquestThemeSelect.classList.add("hidden");

    // 隐藏塔防模式容器
    document.getElementById("theme-select-container")?.classList.add("hidden");
    document.getElementById("level-list-container")?.classList.add("hidden");

    // 显示关卡选择
    if (conquestLevelSelect) {
      conquestLevelSelect.classList.remove("hidden");
      this.renderConquestLevelSelect(themeId);
    }

    // 关卡选择容器内部已有返回按钮，不需要显示通用的返回按钮
    if (backBtn) {
      backBtn.classList.add("hidden");
    }
  }

  /**
   * 渲染征服模式关卡选择界面
   * @param {number} themeId - 主题ID
   */
  renderConquestLevelSelect(themeId) {
    const theme = CONQUEST_THEMES.find(t => t.id === themeId);
    const titleEl = document.getElementById("conquest-current-theme-name");
    const grid = document.querySelector("#conquest-level-select-container .conquest-level-grid");

    if (titleEl && theme) {
      titleEl.textContent = theme.name;
      titleEl.style.color = theme.color;
    }

    if (!grid) return;

    // 获取进度
    const progress = conquestProgress ? conquestProgress.getProgress() : { completedLevels: [] };
    const completedLevels = progress.completedLevels || [];

    // 清空现有内容
    grid.innerHTML = "";

    // 渲染每个关卡（所有关卡默认解锁）
    for (let i = 1; i <= 5; i++) {
      const levelId = `${themeId}-${i}`;
      const isCompleted = completedLevels.includes(levelId);
      // 所有关卡默认解锁
      const isUnlocked = true;

      const item = document.createElement("div");
      item.className = `conquest-level-item ${isCompleted ? "completed" : ""}`;
      item.dataset.level = i;

      item.innerHTML = `
        <span class="level-num">关卡 ${i}</span>
        <span class="level-status">${isCompleted ? "✓" : ""}</span>
      `;

      const levelClickHandler = () => {
        this.startConquestLevel(levelId);
      };
      this.addTrackedEventListener(item, "click", levelClickHandler);

      grid.appendChild(item);
    }
  }

  /**
   * 开始征服模式关卡
   * @param {string} levelId - 关卡ID (格式: "主题-关卡")
   */
  startConquestLevel(levelId) {
    // 保存当前关卡
    if (conquestProgress) {
      conquestProgress.setLastPlayedLevel(levelId);
    }

    // 隐藏菜单
    document.getElementById("main-menu").classList.add("hidden");
    document.getElementById("conquest-level-select-container").classList.add("hidden");

    // 启动征服模式游戏
    if (window.conquestGame) {
      window.conquestGame.startLevel(levelId);
    }
  }

  /**
   * 销毁 UI 对象，清理所有事件监听器并标记为已解绑
   */
  destroy() {
    // 移除所有追踪的事件监听器
    if (this._eventListeners && this._eventListeners.length > 0) {
      for (const { target, type, listener, options } of this._eventListeners) {
        if (target) {
          try {
            target.removeEventListener(type, listener, options);
          } catch (e) {
            console.warn(`移除事件监听器失败: ${type}`, e);
          }
        }
      }
    }

    // 确保 _eventListeners 数组被清空（即使为空数组也重新初始化）
    this._eventListeners = [];

    // 清理长按定时器
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    UI._eventsBound = false;
    console.log('UI 对象已销毁，所有事件监听器已清理');
  }

}
