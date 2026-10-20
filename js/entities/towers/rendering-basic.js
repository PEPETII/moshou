// Tower：绘制入口
//
// 2026-10-20 清理：32 座下架塔的塔体绘制（drawFireTower…drawWheelTower、墨晕底座、
// 弹道/光束/冲击波/召唤物绘制）已随旧攻击链删除。现役四塔的塔身、选中环、蓄力圆相
// 全部由 GlyphTower.draw 负责（见 js/glyph/glyph-tower.js）。
Tower.prototype.draw = function(ctx, timestamp) {
    if (this.gl) GlyphTower.draw(ctx, this);
};
