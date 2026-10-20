// 岩石格（工单 05，specialTerrain）：不能建造的浓墨山石。
//
// 画进静态地形缓存（StaticCanvasLayer），不每帧绘制；每格的形状由坐标派生，同一关每次进入画面一致。
// 一格画三团叠起的墨石、几道皴擦线和一抹落影，比普通背景的淡墨山石更浓，让玩家一眼看出「这里不能放塔」。
const MapRocks = {
  _hash(x, y) {
    let h = (x * 73856093) ^ (y * 19349663);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  },

  // cells: [{ x, y, type: 'rock' }]；cell 为格边长（像素）
  draw(ctx, cells, cell) {
    if (!cells || !cells.length) return;
    ctx.save();
    for (const c of cells) {
      if (c.type !== 'rock') continue;
      const cx = c.x * cell + cell / 2;
      const cy = c.y * cell + cell / 2;
      const r1 = this._hash(c.x, c.y);
      const r2 = this._hash(c.y + 7, c.x + 3);
      // 落影
      ctx.fillStyle = 'rgba(30,27,22,0.12)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + cell * 0.32, cell * 0.42, cell * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // 三团叠起的墨石
      const blobs = [
        [-0.16 + r1 * 0.08, 0.08, 0.26 + r2 * 0.05, 0.2, 0.5],
        [0.14 - r2 * 0.06, 0.12, 0.22 + r1 * 0.05, 0.17, 0.42],
        [-0.02 + r1 * 0.06, -0.12, 0.2 + r2 * 0.04, 0.17, 0.36],
      ];
      for (const [dx, dy, rx, ry, a] of blobs) {
        ctx.fillStyle = `rgba(36,32,27,${a})`;
        ctx.beginPath();
        ctx.ellipse(cx + dx * cell, cy + dy * cell, rx * cell, ry * cell, (r1 - 0.5) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // 皴擦
      ctx.strokeStyle = 'rgba(20,18,15,0.38)';
      ctx.lineWidth = 1.1;
      for (let k = 0; k < 3; k++) {
        const sx = cx + (-0.2 + k * 0.18 + r1 * 0.05) * cell;
        const sy = cy + (-0.14 + (k % 2) * 0.12) * cell;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + cell * 0.1, sy + cell * (0.12 + 0.05 * r2));
        ctx.stroke();
      }
    }
    ctx.restore();
  },
};

if (typeof window !== 'undefined') window.MapRocks = MapRocks;
