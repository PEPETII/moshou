/**
 * 镜头（Camera）：视口 960×432 在更宽的世界地图上横向滚动。
 *
 * 坐标约定（全仓库统一）：
 *   - 屏幕/画布坐标 sx：0 ~ VIEW_W，HUD 层使用；
 *   - 世界坐标 wx = sx + camera.x：路径、网格、塔、敌人、弹道、地面效果使用。
 *   所有把鼠标/触点换算成格子的地方都走 utils.js 的 getGridFromEvent / clientToWorld，
 *   它们读取 canvas.camera（由 Camera.attach 挂上），不要自己再写 getBoundingClientRect。
 *
 * 输入：滚轮、键盘（A/D/←/→）、空白处拖拽（超过阈值才算平移，避免与点击冲突）、
 * 拖着卡片靠近视口左右边缘时自动滚动。
 */
class Camera {
  /**
   * @param {Object} opts
   * @param {HTMLCanvasElement} opts.canvas
   * @param {number} opts.worldW 世界宽（px）
   * @param {Function} [opts.hitTower] (clientX, clientY, isTouch) => 该点是否落在炮塔上（炮塔上按下不平移）
   * @param {Function} [opts.getDragPoint] () => {clientX, clientY} | null  卡片/炮塔拖拽中的指针位置
   * @param {Function} [opts.onScroll] 镜头被用户滚动时回调（用于收起悬浮的炮塔信息面板，它不随镜头移动）
   */
  constructor(opts) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.CAMERA) || {};
    this.cfg = Object.assign({
      SMOOTH: 14, KEY_SPEED: 720, WHEEL_SCALE: 1, PAN_THRESHOLD: 8, EDGE_ZONE: 48, EDGE_SPEED: 640,
    }, cfg);
    this.canvas = opts.canvas;
    this.viewW = (opts.viewW || (opts.canvas && opts.canvas.width) || 960);
    this.viewH = (opts.viewH || (opts.canvas && opts.canvas.height) || 432);
    this.worldW = opts.worldW || this.viewW;
    this.hitTower = opts.hitTower || null;
    this.getDragPoint = opts.getDragPoint || null;
    this.onScroll = opts.onScroll || null;

    this.x = 0;
    this.targetX = 0;
    this._lastT = null;
    this._panEndAt = -1e9;
    this._pan = null;
    this._keys = { left: false, right: false };
    this._listeners = [];
    this._moveTick = 0; // 最近一次滚动的时间戳，用于提示条淡入淡出
    if (this.canvas) this.canvas.camera = this;
  }

  get minX() { return 0; }
  get maxX() { return Math.max(0, this.worldW - this.viewW); }
  get scrollable() { return this.maxX > 0; }

  _clamp(x) { return Math.min(this.maxX, Math.max(this.minX, x)); }

  setWorldWidth(w) {
    this.worldW = w;
    this.x = this._clamp(this.x);
    this.targetX = this._clamp(this.targetX);
  }

  /** 直接跳到某处（开局定位用），不做平滑 */
  jumpTo(x) {
    this.x = this.targetX = this._clamp(x);
    this._pan = null;
  }

  /** 平滑滚动 dx 像素 */
  scrollBy(dx) {
    const before = this.targetX;
    this.targetX = this._clamp(this.targetX + dx);
    this._moveTick = performance.now();
    if (this.targetX !== before && this.onScroll) this.onScroll();
  }

  screenToWorld(sx) { return sx + this.x; }
  worldToScreen(wx) { return wx - this.x; }

  /** 刚结束一次平移？click 处理器据此吞掉平移松手时合成的点击 */
  wasJustPanned() {
    return performance.now() - this._panEndAt < 120;
  }

  isPanning() {
    return !!(this._pan && this._pan.moved);
  }

  /** 每帧调用：键盘/边缘滚动 + 平滑插值。now 为 rAF 时间戳（毫秒） */
  update(now) {
    const t = typeof now === 'number' ? now : performance.now();
    const dt = this._lastT === null ? 0 : Math.min(Math.max((t - this._lastT) / 1000, 0), 0.05);
    this._lastT = t;

    const k = this._keys;
    const keyDir = (k.right ? 1 : 0) - (k.left ? 1 : 0);
    if (keyDir) this.scrollBy(keyDir * this.cfg.KEY_SPEED * dt);

    const edge = this._edgeDirection();
    if (edge) this.scrollBy(edge * this.cfg.EDGE_SPEED * dt);

    if (this.isPanning()) {
      this.x = this.targetX; // 手指/鼠标拖拽时 1:1 跟手
      return;
    }
    const diff = this.targetX - this.x;
    if (Math.abs(diff) < 0.5) {
      this.x = this.targetX;
    } else {
      this.x += diff * (1 - Math.exp(-this.cfg.SMOOTH * dt));
      this._moveTick = t;
    }
    this.x = this._clamp(this.x);
  }

  /** 拖卡片/炮塔靠近左右边缘时返回 -1/+1（越靠边越快，最大 1.5），否则 0 */
  _edgeDirection() {
    if (!this.getDragPoint || !this.scrollable || !this.canvas) return 0;
    const p = this.getDragPoint();
    if (!p) return 0;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return 0;
    if (p.clientY < rect.top || p.clientY > rect.bottom) return 0;
    const cx = (p.clientX - rect.left) * (this.viewW / rect.width);
    const zone = this.cfg.EDGE_ZONE;
    if (cx < zone) return -Math.min(1.5, (zone - cx) / zone + 0.15);
    if (cx > this.viewW - zone) return Math.min(1.5, (cx - (this.viewW - zone)) / zone + 0.15);
    return 0;
  }

  // ---------------- 输入绑定 ----------------

  _isActive() {
    const c = this.canvas;
    return !!(c && c.getClientRects && c.getClientRects().length > 0);
  }

  _on(target, type, fn, options) {
    if (!target || !target.addEventListener) return;
    target.addEventListener(type, fn, options);
    this._listeners.push({ target, type, fn, options });
  }

  /** 绑定滚轮、键盘、鼠标拖拽、触摸拖拽 */
  bindInput() {
    const canvas = this.canvas;
    if (!canvas || this._bound) return;
    this._bound = true;
    const self = this;

    this._on(canvas, 'wheel', function (e) {
      if (!self.scrollable) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? self.viewW : 1;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      self.scrollBy(d * unit * self.cfg.WHEEL_SCALE);
    }, { passive: false });

    const typing = function (e) {
      const el = e.target;
      return !!(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable));
    };
    const keyOf = function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return null;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') return 'left';
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') return 'right';
      return null;
    };
    this._on(document, 'keydown', function (e) {
      const dir = keyOf(e);
      if (!dir || typing(e) || !self._isActive()) return;
      self._keys[dir] = true;
      e.preventDefault();
    });
    this._on(document, 'keyup', function (e) {
      const dir = keyOf(e);
      if (dir) self._keys[dir] = false;
    });
    this._on(window, 'blur', function () { self._keys.left = self._keys.right = false; });

    // 鼠标拖拽平移
    this._on(canvas, 'mousedown', function (e) {
      if (e.button !== 0 || self._pan || (self.getDragPoint && self.getDragPoint())) return;
      self._beginPan('mouse', e.clientX, e.clientY, false);
    });
    this._on(document, 'mousemove', function (e) {
      if (self._pan && self._pan.kind === 'mouse') self._movePan(e.clientX, e.clientY);
    });
    this._on(document, 'mouseup', function () {
      if (self._pan && self._pan.kind === 'mouse') self._endPan();
    });

    // 触摸拖拽平移（只处理单指；放置/移塔由原有处理器负责，互不抢事件）
    this._on(canvas, 'touchstart', function (e) {
      if (e.touches.length !== 1) { self._pan = null; return; }
      const t = e.touches[0];
      self._beginPan('touch', t.clientX, t.clientY, true, t.identifier);
    }, { passive: true });
    this._on(canvas, 'touchmove', function (e) {
      const p = self._pan;
      if (!p || p.kind !== 'touch' || e.touches.length !== 1) { if (p && e.touches.length !== 1) self._pan = null; return; }
      self._movePan(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    const touchEnd = function () { if (self._pan && self._pan.kind === 'touch') self._endPan(); };
    this._on(canvas, 'touchend', touchEnd, { passive: true });
    this._on(canvas, 'touchcancel', touchEnd, { passive: true });
  }

  unbindInput() {
    for (const l of this._listeners) {
      try { l.target.removeEventListener(l.type, l.fn, l.options); } catch (e) { /* ignore */ }
    }
    this._listeners = [];
    this._bound = false;
  }

  _beginPan(kind, cx, cy, isTouch, id) {
    if (!this.scrollable) return;
    let onTower = false;
    if (this.hitTower) {
      try { onTower = !!this.hitTower(cx, cy, isTouch); } catch (e) { onTower = false; }
    }
    this._pan = {
      kind, id, startX: cx, startClientY: cy, startCam: this.targetX,
      moved: false, blocked: onTower,
    };
  }

  _movePan(cx, cy) {
    const p = this._pan;
    if (!p || p.blocked) return;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width) return;
    const slop = p.kind === 'touch'
      ? Math.max(this.cfg.PAN_THRESHOLD, (window.DeviceProfile && window.DeviceProfile.slop) || 0)
      : this.cfg.PAN_THRESHOLD;
    const dxClient = cx - p.startX;
    if (!p.moved) {
      if (Math.hypot(dxClient, cy - p.startClientY) <= slop) return;
      p.moved = true;
    }
    const scale = this.viewW / rect.width;
    this.targetX = this._clamp(p.startCam - dxClient * scale);
    this.x = this.targetX;
    this._moveTick = performance.now();
    if (this.onScroll) this.onScroll();
  }

  _endPan() {
    const p = this._pan;
    this._pan = null;
    if (p && p.moved) this._panEndAt = performance.now();
  }

  // ---------------- 屏幕提示（HUD 层，不随镜头平移） ----------------

  drawHints(ctx) {
    if (!this.scrollable) return;
    const w = this.viewW;
    const h = this.viewH;
    const fadeW = 40;
    ctx.save();
    if (this.x > 1) {
      const g = ctx.createLinearGradient(0, 0, fadeW, 0);
      g.addColorStop(0, 'rgba(28,26,23,0.20)');
      g.addColorStop(1, 'rgba(28,26,23,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, fadeW, h);
    }
    if (this.x < this.maxX - 1) {
      const g = ctx.createLinearGradient(w - fadeW, 0, w, 0);
      g.addColorStop(0, 'rgba(28,26,23,0)');
      g.addColorStop(1, 'rgba(28,26,23,0.20)');
      ctx.fillStyle = g;
      ctx.fillRect(w - fadeW, 0, fadeW, h);
    }
    // 位置条：底边居中，滑块宽 = 视口 / 世界
    const trackW = 132;
    const trackX = (w - trackW) / 2;
    const trackY = h - 9;
    const thumbW = Math.max(14, trackW * (this.viewW / this.worldW));
    const thumbX = trackX + (trackW - thumbW) * (this.maxX ? this.x / this.maxX : 0);
    ctx.fillStyle = 'rgba(28,26,23,0.14)';
    ctx.fillRect(trackX, trackY, trackW, 3);
    ctx.fillStyle = 'rgba(138,41,32,0.65)';
    ctx.fillRect(thumbX, trackY - 1, thumbW, 5);
    ctx.restore();
  }
}

if (typeof window !== 'undefined') window.Camera = Camera;
