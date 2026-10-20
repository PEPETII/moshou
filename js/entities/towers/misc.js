// Tower：重置、出售、更新与受击震动
//
// 2026-10-20 清理：32 座下架塔的旧数值字段（光环、连锁、中毒、冻结、召唤、经济、
// 引爆等 70 余项）与对应分支一并删除。现役四塔是字形塔，攻击节奏与数值由
// GlyphTower（js/glyph/glyph-tower.js）接管；本文件只保留对象池所需的最小状态。
Tower.prototype.reset = function(type, gx, gy, game) {
    this.type = type;
    this.gx = gx;
    this.gy = gy;
    this.game = game;

    const config = CONFIG.TOWERS[type];
    this.char = config.char;
    this.cost = config.cost;
    // 格；glyphs.js 会按 GLYPH_SCALE 复核，供射程圈与信息面板复用
    this.range = config.range || 0;

    // 旧伤害/攻速/减速不再生效，字形塔的数值全在 gl 里（信息面板据此不显示它们）
    this.damage = 0;
    this.cooldown = 0;
    this.slow = 0;

    // 路径塔专用：现役四塔均为 0，保留字段供敌人侧受击与爆炸结算判断
    this.hp = config.hp || 0;
    this.maxHp = this.hp;
    this.onPath = config.onPath || false;

    const pos = gridToPixel(gx, gy);
    this.x = pos.x;
    this.y = pos.y;

    this.selected = false;

    // 敌人施加的状态（工单 08、10）：缚丝（蛛）、梦魇（魇）、封笔（天劫）。塔被出售或融合后状态随塔消失
    this.webT = 0;
    this.webMul = 1;
    this.webLockT = 0;
    this.dreadT = 0;
    this.dreadMul = 1;
    this.sealT = 0;
    this.sealLockT = 0;

    // 受击震动（字形塔由 GlyphFX 承担打击反馈，这里只服务路径塔）
    this.shakeOffset = { x: 0, y: 0 };
    this.shakeEndTime = 0;
    this.shakeDuration = CONFIG.GAMEPLAY?.shakeDuration || 150;
    this.shakeMagnitude = 4;

    // 字形塔：笔画、蓄力、招式全部由 GlyphTower 组件接管（工单 05、20）
    this.gl = null;
    if (typeof GlyphTower !== 'undefined' && GlyphTower.has(type)) {
      GlyphTower.init(this);
    }
};

Tower.prototype.getSellValue = function() {
    return Math.floor(this.cost * 0.7);
};

Tower.prototype.update = function(now, deltaTime) {
    // 字形塔：旧的攻击与投射物管线已删除，只走字形组件
    if (this.gl) {
      GlyphTower.update(this, deltaTime / 1000);
      return;
    }
    this.updateShake();
};

Tower.prototype.updateShake = function() {
    if (Date.now() < this.shakeEndTime) {
      const progress = 1 - (this.shakeEndTime - Date.now()) / this.shakeDuration;
      const currentMagnitude = this.shakeMagnitude * (1 - progress);
      // 使用基于时间的正弦波替代随机，避免高频抖动
      const time = Date.now() / 1000;
      this.shakeOffset.x = Math.sin(time * 10) * currentMagnitude;
      this.shakeOffset.y = Math.cos(time * 8) * currentMagnitude;
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
    }
};

Tower.prototype.triggerShake = function() {
    if (typeof GlyphFX !== 'undefined' && !GlyphFX.shakeEnabled) return; // 战斗设置「震动」关闭
    this.shakeEndTime = Date.now() + this.shakeDuration;
};
