// 字形弹道的全局调度（工单 05）
//
// 弹道列表 game.glyphShots（对应原型 Towers.shots）由这里推进和绘制，与塔实例解耦：
// 塔被出售后，已发出的弹道继续完成，只是不再写回笔画。
// 绘制顺序（世界层内）：地面效果 → 敌人 → 塔 → 弹道与大招 → 粒子 → 伤害数字；墨渍层在背景之上、敌人之下；连斩与朱印在 HUD 层。
const GlyphSystem = {
  reset(game) {
    game.glyphShots = [];
    game.glyphUltCd = 0;
    GlyphFX.reset(GlyphWorld.bounds(game));
  },

  // 每帧开头：全局大招间隔倒计时（秒）
  tick(game, dt) {
    if (game.glyphUltCd > 0) game.glyphUltCd = Math.max(0, game.glyphUltCd - dt);
  },

  // 任意两次大招之间至少隔 ULT_GLOBAL_GAP 秒，避免多座塔同帧爆发
  canCast(game) { return !(game.glyphUltCd > 0); },
  noteCast(game) { game.glyphUltCd = CONFIG.ULT_GLOBAL_GAP; },

  push(game, shot) {
    if (!game.glyphShots) game.glyphShots = [];
    shot.game = game;
    game.glyphShots.push(shot);
    return shot;
  },

  update(game, dt) {
    const shots = game.glyphShots;
    if (shots && shots.length) {
      // 招式在更新中可能追加新弹道（焚落地 → 焦土），所以按动态长度遍历
      for (let i = 0; i < shots.length; i++) {
        const s = shots[i];
        GlyphTower.impl(s.tower.type).updateShot(s, dt);
      }
      let w = 0;
      for (let i = 0; i < shots.length; i++) if (!shots[i].done) shots[w++] = shots[i];
      shots.length = w;
    }
    GlyphFX.update(dt);
  },

  drawGround(ctx, game) {
    const shots = game.glyphShots;
    if (!shots) return;
    for (const s of shots) if (s.ground) GlyphTower.impl(s.tower.type).drawShot(ctx, s);
  },

  drawShots(ctx, game) {
    const shots = game.glyphShots;
    if (!shots) return;
    for (const s of shots) if (!s.ground) GlyphTower.impl(s.tower.type).drawShot(ctx, s);
  },

  // 墨渍层：世界层，背景之上、敌人之下
  drawStain(ctx) { GlyphFX.drawStain(ctx); },

  drawFX(ctx) { GlyphFX.draw(ctx); },

  // HUD 层：连斩与朱印，不随镜头和震屏
  drawHud(ctx) { GlyphFX.drawHud(ctx, ctx.canvas ? ctx.canvas.width : 960); },

  // 世界层震屏偏移（暂停、结算不抖）
  shakeOffset(game) { return GlyphFX.shakeOffset(game); },

  // 顿帧：把帧时间（毫秒）换算成游戏时间
  scaleFrame(deltaTime) { return deltaTime * GlyphFX.frameScale(deltaTime / 1000); },

  release() { GlyphFX.release(); },
};
