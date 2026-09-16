// Game：运行控制
Game.prototype.start = function() {
    this.lastTime = performance.now();

    const gameLoop = (timestamp) => {
      this.update(timestamp);
      this.draw();
      this.animationId = requestAnimationFrame(gameLoop);
    };

    this.animationId = requestAnimationFrame(gameLoop);
  
};
/**
   * 设置游戏暂停状态
   */
Game.prototype.setPaused = function(paused) {
    this.isPaused = paused;
    if (!paused) {
      this.lastTime = performance.now();
    }
  
};
Game.prototype.stop = function() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  
};
