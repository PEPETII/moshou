// 关卡长卷：关卡节点与石碑题记共用真实关卡数据。
UI.prototype.renderLevelSelect = function(themeId) {
  const container = document.getElementById('level-list-container');
  const grid = container?.querySelector('.level-grid');
  const theme = levelManager.getTheme(themeId);
  if (!grid || !theme) return;

  const levels = levelManager.getLevelsByTheme(themeId);
  const completed = this.game?.completedLevels || [];
  const inscription = document.getElementById('level-inscription');
  const enter = document.getElementById('enter-level');
  this.currentThemeId = themeId;
  container.querySelector('.level-list-title').textContent = `${theme.name} · 山河卷`;
  grid.innerHTML = '';
  inscription.classList.add('hidden');

  const selectLevel = (level, item) => {
    grid.querySelectorAll('.level-item').forEach(node => {
      node.classList.toggle('selected', node === item);
      node.setAttribute('aria-pressed', node === item ? 'true' : 'false');
    });

    const enemies = [...new Set(level.waves.flatMap(wave =>
      wave.enemies.map(enemy => CONFIG.ENEMIES[enemy.type]?.char || enemy.type)
    ))].join(' · ');
    const unlocks = level.unlocks?.map(type => CONFIG.TOWERS[type]?.char || type).join(' · ');
    document.getElementById('level-inscription-number').textContent = `第 ${level.id.split('-')[1]} 境`;
    document.getElementById('level-inscription-name').textContent = level.name;
    document.getElementById('level-inscription-note').textContent =
      `${theme.desc}  ·  ${level.waves.length} 阵  ·  来敌 ${enemies}${unlocks ? `  ·  新悟 ${unlocks}` : ''}`;
    enter.onclick = () => this.game.startGame(level.id);
    inscription.classList.remove('hidden');
  };

  levels.forEach((level, index) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'level-item';
    item.setAttribute('aria-pressed', 'false');
    if (completed.includes(level.id)) item.classList.add('completed');
    item.innerHTML = `<span class="level-num">${String(index + 1).padStart(2, '0')}</span><span class="level-name">${level.name}</span>`;
    this.addTrackedEventListener(item, 'click', () => selectLevel(level, item));
    grid.appendChild(item);
  });

  if (levels.length) selectLevel(levels[0], grid.firstElementChild);
};
