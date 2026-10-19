// Enemy：构造入口。
// reset / update 在 entities/enemy/misc.js，里程制移动与字形状态在 entities/enemy/motion.js，
// 其余方法见 entities/enemy/ 下各文件（须在本文件之后加载）。
class Enemy {
  constructor(type, path, game) {
    // 支持对象池模式：无参数构造函数
    if (type === undefined) {
      this._pooled = true;
      return;
    }

    this._pooled = false;
    this.reset(type, path, game);
  }
}
