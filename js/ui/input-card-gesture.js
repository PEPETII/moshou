// UI：塔卡触摸手势
//
// 底栏 38 张塔卡既要横向滑动浏览，又要能把卡片拖到战场放置。
// 旧实现靠 touch-action: pan-x 让浏览器接管横滑：只要起手方向偏横，
// 浏览器就会发 pointercancel，放置拖拽直接中断（实测向右上拖卡会失败）。
//
// 现在塔卡 touch-action: none，由这里自行判定起手方向：
//   - 偏横（|dx| > 1.5·|dy|）→ 手动滚动底栏，松手带惯性；
//   - 其余（向上、斜向）→ 开始放置拖拽，后续交给 setupPlacementDragEvents。
// 鼠标/触控笔不经过这里，仍然按下即开始拖拽。
(function initCardGesture() {
  'use strict';

  var DECIDE_PX = 8;
  var HORIZONTAL_BIAS = 1.5;
  var FRICTION = 0.94;
  var MIN_VELOCITY = 0.02; // px/ms

  function uiScale() {
    var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'));
    return isFinite(v) && v > 0 ? v : 1;
  }

  UI.prototype.cancelCardGesture = function () {
    var g = this._cardGesture;
    if (!g) return;
    document.removeEventListener('pointermove', g.onMove, true);
    document.removeEventListener('pointerup', g.onEnd, true);
    document.removeEventListener('pointercancel', g.onEnd, true);
    this._cardGesture = null;
  };

  UI.prototype.stopCardMomentum = function () {
    if (this._cardMomentumId) {
      cancelAnimationFrame(this._cardMomentumId);
      this._cardMomentumId = null;
    }
  };

  UI.prototype.startCardMomentum = function (bar, velocity) {
    var self = this;
    var last = performance.now();
    var v = velocity;
    this.stopCardMomentum();
    function tick(now) {
      var dt = Math.min(now - last, 40);
      last = now;
      bar.scrollLeft += v * dt;
      v *= Math.pow(FRICTION, dt / 16);
      if (Math.abs(v) > MIN_VELOCITY) {
        self._cardMomentumId = requestAnimationFrame(tick);
      } else {
        self._cardMomentumId = null;
      }
    }
    this._cardMomentumId = requestAnimationFrame(tick);
  };

  UI.prototype.beginCardGesture = function (e, el, type) {
    if (e.isPrimary === false) return;
    this.cancelCardGesture();
    this.stopCardMomentum();

    var self = this;
    var bar = document.getElementById('bottom-bar');
    var g = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      scroll0: bar ? bar.scrollLeft : 0,
      mode: null,
      samples: [{ t: performance.now(), x: e.clientX }],
    };

    g.onMove = function (ev) {
      if (ev.pointerId !== g.id) return;
      var dx = ev.clientX - g.x0;
      var dy = ev.clientY - g.y0;

      if (!g.mode) {
        if (Math.hypot(dx, dy) < DECIDE_PX) return;
        g.mode = Math.abs(dx) > HORIZONTAL_BIAS * Math.abs(dy) ? 'scroll' : 'place';
        if (g.mode === 'place') {
          self.cancelCardGesture();
          self.beginPlacementDrag({
            pointerId: ev.pointerId,
            pointerType: 'touch',
            button: 0,
            isPrimary: true,
            clientX: ev.clientX,
            clientY: ev.clientY,
            currentTarget: el,
            preventDefault: function () {},
          }, type);
          self.updatePlacementDrag(ev);
          return;
        }
      }

      if (g.mode === 'scroll' && bar) {
        bar.scrollLeft = g.scroll0 - dx / uiScale();
        var now = performance.now();
        g.samples.push({ t: now, x: ev.clientX });
        while (g.samples.length > 2 && now - g.samples[0].t > 100) g.samples.shift();
      }
    };

    g.onEnd = function (ev) {
      if (ev.pointerId !== g.id) return;
      var mode = g.mode;
      var samples = g.samples;
      self.cancelCardGesture();

      if (mode === 'scroll' && bar && ev.type === 'pointerup' && samples.length > 1) {
        var a = samples[0];
        var b = samples[samples.length - 1];
        var dt = b.t - a.t;
        if (dt > 0 && performance.now() - b.t < 80) {
          var v = -((b.x - a.x) / dt) / uiScale();
          if (Math.abs(v) > MIN_VELOCITY) self.startCardMomentum(bar, v);
        }
      } else if (!mode && ev.type === 'pointerup') {
        // 轻点：沿用原来的「墨水不足」提示
        var config = CONFIG.TOWERS[type];
        if (config && self.game.ink < config.cost) {
          self.showToast('墨水不足（需 ' + config.cost + ' 墨）', 'warning');
          self.refreshTowerSelectAffordability();
        }
      }
    };

    this._cardGesture = g;
    document.addEventListener('pointermove', g.onMove, true);
    document.addEventListener('pointerup', g.onEnd, true);
    document.addEventListener('pointercancel', g.onEnd, true);
  };
})();
