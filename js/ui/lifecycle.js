// UI：UI 生命周期
/**
   * 销毁 UI 对象，清理所有事件监听器并标记为已解绑
   */
UI.prototype.destroy = function() {
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
  
};
