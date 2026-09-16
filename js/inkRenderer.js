/**
 * 水墨渲染工具类 - InkRenderer
 * 提供手绘水墨风格的渲染效果
 */
class InkRenderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.roughness = CONFIG.INK?.brushRoughness || 0.3;
    this.bleed = CONFIG.INK?.inkBleed || 0.15;
    
    // 颜色缓存，避免重复解析 hex 颜色
    this._colorCache = new Map();
    this._maxCacheSize = 50;
  }

  /**
   * 获取缓存的 RGB 颜色值
   * @param {string} color - hex 颜色值
   * @returns {object} {r, g, b}
   */
  _getCachedColor(color) {
    let rgb = this._colorCache.get(color);
    
    if (!rgb) {
      rgb = {
        r: parseInt(color.slice(1, 3), 16),
        g: parseInt(color.slice(3, 5), 16),
        b: parseInt(color.slice(5, 7), 16)
      };
      
      // 限制缓存大小
      if (this._colorCache.size >= this._maxCacheSize) {
        const firstKey = this._colorCache.keys().next().value;
        this._colorCache.delete(firstKey);
      }
      
      this._colorCache.set(color, rgb);
    }
    
    return rgb;
  }

  /**
   * 生成枯笔效果的路径点
   * @param {number} x1 起点x
   * @param {number} y1 起点y
   * @param {number} x2 终点x
   * @param {number} y2 终点y
   * @returns {Array} 带随机偏移的路径点
   */
  generateRoughLine(x1, y1, x2, y2) {
    const points = [];
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const steps = Math.max(3, Math.floor(dist / 5));
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const baseX = x1 + (x2 - x1) * t;
      const baseY = y1 + (y2 - y1) * t;
      
      // 添加随机偏移模拟枯笔
      const offsetX = (Math.random() - 0.5) * this.roughness * 4;
      const offsetY = (Math.random() - 0.5) * this.roughness * 4;
      
      points.push({
        x: baseX + offsetX,
        y: baseY + offsetY
      });
    }
    
    return points;
  }

  /**
   * 绘制枯笔线条
   */
  drawRoughLine(x1, y1, x2, y2, color, width = 2) {
    const points = this.generateRoughLine(x1, y1, x2, y2);
    
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    // 绘制主线
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.stroke();
    
    // 绘制飞白效果（更细的线条）
    if (Math.random() > 0.5) {
      this.ctx.lineWidth = width * 0.3;
      this.ctx.globalAlpha = 0.4;
      this.ctx.beginPath();
      const flyX = (Math.random() - 0.5) * width;
      const flyY = (Math.random() - 0.5) * width;
      this.ctx.moveTo(points[0].x + flyX, points[0].y + flyY);
      for (let i = 1; i < points.length; i++) {
        this.ctx.lineTo(points[i].x + flyX, points[i].y + flyY);
      }
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  /**
   * 绘制墨晕效果（渐变圆形）
   */
  drawInkWash(x, y, radius, color, intensity = 0.3) {
    if (isNaN(x) || isNaN(y) || isNaN(radius)) return;
    const gradient = this.ctx.createRadialGradient(
      x, y, 0,
      x, y, radius
    );
    
    // 使用缓存的颜色值，避免重复解析 hex
    const { r, g, b } = this._getCachedColor(color);
    
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${intensity})`);
    gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${intensity * 0.5})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    
    this.ctx.save();
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  /**
   * 绘制墨点飞溅效果
   */
  drawInkSplash(x, y, count = 8, color = '#2a2a2a', spread = 30) {
    if (isNaN(x) || isNaN(y)) return;
    this.ctx.save();
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const distance = Math.random() * spread;
      const size = Math.random() * 3 + 1;
      const opacity = Math.random() * 0.5 + 0.3;
      
      const px = x + Math.cos(angle) * distance;
      const py = y + Math.sin(angle) * distance;
      
      this.ctx.fillStyle = color;
      this.ctx.globalAlpha = opacity;
      this.ctx.beginPath();
      this.ctx.arc(px, py, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  /**
   * 绘制水墨风格的矩形（带墨晕边缘）
   */
  drawInkRect(x, y, width, height, color, inkBleed = 5) {
    if (isNaN(x) || isNaN(y)) return;
    // 绘制墨晕背景
    this.drawInkWash(x + width/2, y + height/2, Math.max(width, height)/2 + inkBleed, color, 0.2);
    
    // 绘制主体
    this.ctx.save();
    this.ctx.fillStyle = color;
    
    // 添加轻微随机变形
    const jitter = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x + Math.random() * jitter, y + Math.random() * jitter);
    this.ctx.lineTo(x + width + Math.random() * jitter, y + Math.random() * jitter);
    this.ctx.lineTo(x + width + Math.random() * jitter, y + height + Math.random() * jitter);
    this.ctx.lineTo(x + Math.random() * jitter, y + height + Math.random() * jitter);
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.restore();
  }

  /**
   * 绘制水墨风格的圆形
   */
  drawInkCircle(x, y, radius, color, withWash = true) {
    if (isNaN(x) || isNaN(y)) return;
    if (withWash) {
      this.drawInkWash(x, y, radius * 1.3, color, 0.25);
    }
    
    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    
    // 不规则圆形
    const points = 12;
    for (let i = 0; i <= points; i++) {
      const angle = (Math.PI * 2 * i) / points;
      const r = radius + (Math.random() - 0.5) * this.roughness * 3;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      
      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();
  }

  /**
   * 绘制水墨风格的文字
   */
  drawInkText(text, x, y, fontSize = 24, color = '#e8e8e8', withShadow = true) {
    if (isNaN(x) || isNaN(y)) return;
    this.ctx.save();
    
    // 墨晕阴影
    if (withShadow) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.font = `${fontSize}px "Ma Shan Zheng", cursive`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(text, x + 2, y + 2);
    }
    
    // 主文字
    this.ctx.fillStyle = color;
    this.ctx.font = `${fontSize}px "Ma Shan Zheng", cursive`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y);
    
    // 飞白高光
    if (Math.random() > 0.7) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      this.ctx.fillText(text, x - 1, y - 1);
    }
    
    this.ctx.restore();
  }

  /**
   * 绘制石板路纹理
   */
  drawStonePath(x, y, width, height) {
    this.ctx.save();
    
    // 基础色
    this.ctx.fillStyle = CONFIG.COLORS.path;
    this.ctx.fillRect(x, y, width, height);
    
    // 石板纹理线条
    this.ctx.strokeStyle = CONFIG.COLORS.pathLine;
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.5;
    
    // 水平纹理
    for (let i = y + 5; i < y + height; i += 8) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + 2, i);
      this.ctx.lineTo(x + width - 2, i);
      this.ctx.stroke();
    }
    
    // 随机墨点
    this.ctx.fillStyle = CONFIG.COLORS.inkSplash;
    for (let i = 0; i < 5; i++) {
      const px = x + Math.random() * width;
      const py = y + Math.random() * height;
      const size = Math.random() * 2 + 0.5;
      this.ctx.beginPath();
      this.ctx.arc(px, py, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  /**
   * 绘制枯树装饰
   */
  drawWitheredTree(x, y, scale = 1) {
    this.ctx.save();
    this.ctx.strokeStyle = '#1a1a1a';
    this.ctx.lineWidth = 2 * scale;
    this.ctx.lineCap = 'round';
    
    // 主干
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.quadraticCurveTo(x - 5 * scale, y - 20 * scale, x - 2 * scale, y - 40 * scale);
    this.ctx.stroke();
    
    // 分支
    const branches = [
      { dx: -15, dy: -30, len: 20 },
      { dx: 10, dy: -35, len: 15 },
      { dx: -5, dy: -50, len: 12 },
    ];
    
    branches.forEach(b => {
      this.ctx.beginPath();
      this.ctx.moveTo(x - 2 * scale, y - 40 * scale);
      this.ctx.quadraticCurveTo(
        x + b.dx * scale * 0.5, 
        y - 45 * scale, 
        x + b.dx * scale, 
        y - (40 + b.len) * scale
      );
      this.ctx.stroke();
    });
    
    this.ctx.restore();
  }

  /**
   * 绘制远山背景
   */
  drawDistantMountains(yBase) {
    this.ctx.save();
    
    const mountains = [
      { x: 0, width: 200, height: 60, opacity: 0.15 },
      { x: 150, width: 250, height: 80, opacity: 0.12 },
      { x: 400, width: 200, height: 50, opacity: 0.18 },
      { x: 600, width: 200, height: 70, opacity: 0.1 },
    ];
    
    mountains.forEach(m => {
      this.ctx.fillStyle = `rgba(40, 40, 40, ${m.opacity})`;
      this.ctx.beginPath();
      this.ctx.moveTo(m.x, yBase);
      this.ctx.quadraticCurveTo(
        m.x + m.width / 2, 
        yBase - m.height, 
        m.x + m.width, 
        yBase
      );
      this.ctx.fill();
    });
    
    this.ctx.restore();
  }

  /**
   * 绘制墨线拖影（用于移动物体）
   */
  drawInkTrail(x, y, prevPositions, color = CONFIG.COLORS.inkTrail) {
    if (isNaN(x) || isNaN(y)) return;
    if (!prevPositions || prevPositions.length < 2) return;
    
    this.ctx.save();
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    for (let i = 0; i < prevPositions.length - 1; i++) {
      const pos = prevPositions[i];
      const nextPos = prevPositions[i + 1];
      const alpha = (i + 1) / prevPositions.length * 0.4;
      
      this.ctx.strokeStyle = color;
      this.ctx.globalAlpha = alpha;
      this.ctx.lineWidth = 3 - (i * 0.3);
      
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
      this.ctx.lineTo(nextPos.x, nextPos.y);
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }
}

// InkRenderer 是全局类，在纯前端环境中直接使用
// 如需模块化支持，可取消下面的导出注释
// if (typeof module !== 'undefined' && module.exports) {
//   module.exports = InkRenderer;
// }