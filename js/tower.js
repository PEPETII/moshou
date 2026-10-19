class Tower {
  constructor(type, gx, gy, game) {
    // 支持对象池模式：无参数构造函数
    if (type === undefined) {
      this._pooled = true;
      return;
    }

    this.reset(type, gx, gy, game);
  
  }

  // reset / getSellValue / update / updateShake / triggerShake / findTarget
  // 统一定义在 js/entities/towers/misc.js（Tower.prototype），本文件只保留构造器，避免两处重复
}
