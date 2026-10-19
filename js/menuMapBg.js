/**
 * 全屏界面地图底图
 * ------------------------------------------------------------------
 * 主菜单、关卡选择、图鉴、设置等界面共用一张「无路径」的地图底纹。
 * 画布随视口尺寸重绘（防抖），只渲染一次，不参与每帧循环。
 */
class MenuMapBackground {
  constructor() {
    this.canvas = document.getElementById('menu-map-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.timer = null;
    this.lastKey = '';

    this._onResize = () => this.schedule();
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onResize);

    if (document.readyState === 'complete') {
      this.render();
    } else {
      window.addEventListener('load', () => this.render(), { once: true });
    }
  }

  schedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.render(), 160);
  }

  render() {
    if (!this.ctx || !window.MapBackground) return;

    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    if (!w || !h) return;

    const key = `${w}x${h}@${this.dpr}`;
    if (key === this.lastKey) return;
    this.lastKey = key;

    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);

    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    MapBackground.drawScreen(ctx, w, h);
  }
}
