// UI：择卷与长卷选关（工单 P3）。塔防与征服共用同一套渲染：
//   择卷页  renderThemeShelf  —— 主题卡居中，题字 · 名称 · 简介 · 进度
//   长卷页  renderLevelScroll —— 关卡节点沿墨线均匀分布，底部信息条 +「入境」
// 战后返回走 showLevelSelect / showConquestLevelSelect（Game.returnToLevelSelect 依赖这两个名字）。

const LEVEL_SCROLL_NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

// themes: [{ id, icon, name, desc, done, total }]
UI.prototype.renderThemeShelf = function(shelf, themes, onPick) {
    if (!shelf) return;
    shelf.innerHTML = '';
    shelf.classList.toggle('scroll-shelf--few', themes.length <= 2);
    // 4 个主题卷轴在 960 宽的画面下要一屏放下，不折行
    shelf.classList.toggle('scroll-shelf--many', themes.length >= 4);
    themes.forEach((theme) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'scroll-theme';
      card.dataset.theme = theme.id;
      const ratio = theme.total ? theme.done / theme.total : 0;
      card.innerHTML = `
        <span class="scroll-theme__icon">${theme.icon}</span>
        <span class="scroll-theme__name">${theme.name}</span>
        <span class="scroll-theme__desc">${theme.desc || ''}</span>
        <span class="scroll-theme__progress" style="--done:${ratio}">
          <span class="scroll-theme__bar"></span>
          <span class="scroll-theme__count">已守 ${theme.done} / ${theme.total}</span>
        </span>`;
      this.addTrackedEventListener(card, 'click', () => onPick(theme.id));
      shelf.appendChild(card);
    });
};

// levels: [{ id, num, name, meta: [文字…], done }]；opts: { enterId, onEnter(level) }
UI.prototype.renderLevelScroll = function(host, levels, opts) {
    if (!host) return;
    host.innerHTML = `
      <div class="level-scroll">
        <div class="level-scroll__track" role="listbox" aria-label="关卡"></div>
        <div class="level-scroll__info" aria-live="polite">
          <span class="scroll-info__num"></span>
          <strong class="scroll-info__name"></strong>
          <span class="scroll-info__meta"></span>
          <button id="${opts.enterId}" class="ink-btn ink-btn--primary scroll-info__enter" type="button">入境</button>
          <p class="scroll-info__desc"></p>
        </div>
      </div>`;
    const track = host.querySelector('.level-scroll__track');
    const enter = host.querySelector('.scroll-info__enter');
    let current = null;

    const select = (level, node) => {
      current = level;
      track.querySelectorAll('.scroll-node').forEach((other) => {
        const on = other === node;
        other.classList.toggle('is-selected', on);
        other.setAttribute('aria-selected', String(on));
        other.tabIndex = on ? 0 : -1;
      });
      host.querySelector('.scroll-info__num').textContent = `第 ${level.num} 境`;
      host.querySelector('.scroll-info__name').textContent = level.name;
      host.querySelector('.scroll-info__meta').innerHTML =
        level.meta.map((m) => `<span>${m}</span>`).join('');
      host.querySelector('.scroll-info__desc').textContent = level.desc || '';
    };

    levels.forEach((level) => {
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'scroll-node' + (level.done ? ' is-done' : '');
      node.setAttribute('role', 'option');
      node.setAttribute('aria-selected', 'false');
      node.tabIndex = -1;
      node.innerHTML = `
        <span class="scroll-node__seal">${LEVEL_SCROLL_NUMERALS[level.num - 1] || level.num}${level.boss ? '<i class="scroll-node__boss" title="关底首领">首</i>' : ''}</span>
        <span class="scroll-node__name">${level.name}</span>`;
      this.addTrackedEventListener(node, 'click', () => select(level, node));
      track.appendChild(node);
    });

    this.addTrackedEventListener(track, 'keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const nodes = [...track.querySelectorAll('.scroll-node')];
      const next = nodes[nodes.indexOf(document.activeElement) + (e.key === 'ArrowRight' ? 1 : -1)];
      if (next) { e.preventDefault(); next.focus(); next.click(); }
    });
    this.addTrackedEventListener(enter, 'click', () => { if (current) opts.onEnter(current); });

    // 默认选中第一处未守成的关；全部守成则选第一关
    const first = Math.max(0, levels.findIndex((l) => !l.done));
    if (levels.length) select(levels[first], track.children[first]);
};

UI.prototype.setMenuPage = function(id, visible) {
    const page = document.getElementById(id);
    if (page) page.classList.toggle('hidden', !visible);
};

// ==================== 塔防 ====================
UI.prototype.isThemeUnlocked = function() {
    return true; // 所有主题默认解锁
};
UI.prototype.getThemeProgress = function(themeId, completedLevels) {
    const levels = levelManager.getLevelsByTheme(themeId);
    const completed = levels.filter((l) => completedLevels.includes(l.id)).length;
    return { completed, total: levels.length };
};

UI.prototype.renderThemeSelect = function() {
    const completed = (this.game && this.game.completedLevels) || [];
    const themes = levelManager.getThemes().map((theme) => {
      const progress = this.getThemeProgress(theme.id, completed);
      return { id: theme.id, icon: theme.icon, name: theme.name, desc: theme.desc,
        done: progress.completed, total: progress.total };
    });
    this.renderThemeShelf(document.getElementById('td-theme-shelf'), themes, (id) => this.showLevelSelect(id));
};

UI.prototype.showThemeSelect = function() {
    this.setMainMenuButtonsVisible(false);
    this.setMenuPage('level-list-container', false);
    this.setMenuPage('theme-select-container', true);
    this.renderThemeSelect();
    this.currentThemeId = null;
};

UI.prototype.renderLevelSelect = function(themeId) {
    const theme = levelManager.getTheme(themeId);
    if (!theme) return;
    const completed = (this.game && this.game.completedLevels) || [];
    const levels = levelManager.getLevelsByTheme(themeId).map((level, i) => {
      const done = completed.includes(level.id);
      return {
        id: level.id, num: i + 1, name: level.name, done, desc: level.desc,
        boss: level.boss ? CONFIG.ENEMIES[level.boss.type].name : null,
        meta: [`坚守 ${level.holdSeconds || CONFIG.HOLD_SECONDS} 秒`, `初墨 ${level.startInk}`,
          `核心 ${level.coreHp}`].concat(level.boss ? [`首领 ${CONFIG.ENEMIES[level.boss.type].name}`] : [], [done ? '已守成' : '未守']),
      };
    });
    this.currentThemeId = themeId;
    document.getElementById('td-level-title').textContent = theme.name;
    const progress = this.getThemeProgress(themeId, completed);
    document.getElementById('td-level-progress').textContent = `已守 ${progress.completed} / ${progress.total}`;
    this.renderLevelScroll(document.getElementById('td-level-scroll'), levels,
      { enterId: 'enter-level', onEnter: (level) => this.game.startGame(level.id) });
};

UI.prototype.showLevelSelect = function(themeId) {
    this.setMainMenuButtonsVisible(false);
    ['theme-select-container', 'conquest-theme-select-container', 'conquest-level-select-container']
      .forEach((id) => this.setMenuPage(id, false));
    this.setMenuPage('level-list-container', true);
    this.renderLevelSelect(themeId);
};

// 兼容旧方法名
UI.prototype.populateThemeSelect = function() { this.renderThemeSelect(); };
UI.prototype.showLevelList = function(themeId) { this.showLevelSelect(themeId); };
UI.prototype.populateLevelList = function(themeId) { this.renderLevelSelect(themeId); };
