// 纸纹共享（工单 P6）：DOM 页面与战场画布用同一张宣纸。
// 启动时由 MapBackground 的同一套算法各生成一次：
//   --tex-paper-fiber  可平铺的纸纤维（透明底，叠在任意纸色上）
//   --tex-scroll-foot  卷底远山带（透明底，与地图底边远山同源）
// 生成失败（例如画布不可用）时变量保持 tokens.css 中的 none，页面回退到 SVG 噪点纸纹。
(function initPaperTexture() {
  if (!window.MapBackground || !MapBackground.paperTile) return;
  const root = document.documentElement;
  const TILE = 320;
  try {
    const t0 = performance.now();
    const tile = MapBackground.paperTile(TILE).toDataURL('image/png');
    const foot = MapBackground.scrollFoot(960, 120).toDataURL('image/png');
    root.style.setProperty('--tex-paper-fiber', `url("${tile}")`);
    root.style.setProperty('--tex-scroll-foot', `url("${foot}")`);
    root.style.setProperty('--paper-tile', `${TILE}px`);
    // 供巡检脚本读取：生成耗时与数据体积
    window.__paperTextureStats = {
      ms: Math.round((performance.now() - t0) * 10) / 10,
      tileKB: Math.round(tile.length / 1024),
      footKB: Math.round(foot.length / 1024),
    };
  } catch (_) { /* 回退到 SVG 噪点纸纹 */ }
})();
