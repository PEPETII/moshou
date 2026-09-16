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
}

