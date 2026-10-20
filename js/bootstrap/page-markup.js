(function mountPageMarkup() {
  const markup = String.raw`    <!-- 加载进度界面 -->
    <div id="loading-container">
        <div id="loading-text">墨守成规</div>
        <div id="loading-bar">
            <div id="loading-progress"></div>
        </div>
        <div id="loading-percent">0%</div>
    </div>

    <!-- 横屏提示 -->
    <div class="rotate-tip">
        <div class="rotate-icon">转</div>
        <div class="rotate-text">请旋转至横屏</div>
    </div>

    <!-- 主菜单 -->
    <div id="main-menu">
        <canvas id="menu-map-canvas"></canvas>
        <canvas id="menu-ink-canvas"></canvas>
        <div class="menu-stage">
            <div class="menu-hero">
                <h1 id="main-menu-title" class="menu-title" aria-label="墨守成规">墨守成规</h1>
                <span class="menu-seal" aria-hidden="true">守</span>
                <div id="game-version" class="game-version"></div>
            </div>
            <div class="menu-buttons">
                <button class="menu-btn" id="btn-levels" type="button"><span class="menu-glyph">守</span><span class="menu-btn__text"><span class="menu-btn__name">塔防</span><span class="menu-btn__note">塔防模式</span></span></button>
                <button class="menu-btn" id="btn-conquest" type="button"><span class="menu-glyph">征</span><span class="menu-btn__text"><span class="menu-btn__name">征服</span><span class="menu-btn__note">征服模式</span></span></button>
                <button class="menu-btn" id="btn-encyclopedia" type="button"><span class="menu-glyph">谱</span><span class="menu-btn__text"><span class="menu-btn__name">图鉴</span><span class="menu-btn__note">炮塔与敌人图鉴</span></span></button>
                <button class="menu-btn" id="btn-custom" hidden style="display:none" aria-hidden="true" tabindex="-1"><span class="menu-glyph">作</span><span class="menu-btn__text"><span class="menu-btn__name">自定</span></span></button>
                <button class="menu-btn" id="btn-settings" type="button"><span class="menu-glyph">设</span><span class="menu-btn__text"><span class="menu-btn__name">设置</span><span class="menu-btn__note">画面与声音</span></span></button>
            </div>
        </div>

        <!-- 设置（P3：与战斗暂停设置共用 js/ui/settings-panel.js） -->
        <section id="settings-container" class="ink-page hidden" aria-labelledby="settings-title">
            <header class="ink-page__bar">
                <button id="back-to-menu-from-settings" class="ink-back" type="button">主菜单</button>
                <h2 id="settings-title" class="ink-page__title">设置</h2>
                <div class="ink-page__aside"></div>
            </header>
            <div class="ink-page__body"><div data-settings-host="menu"></div></div>
        </section>

        <!-- 塔防 · 择卷 / 长卷（P3：与征服共用 js/ui/level-scroll.js） -->
        <section id="theme-select-container" class="ink-page hidden" aria-labelledby="td-theme-title">
            <header class="ink-page__bar">
                <button id="back-to-menu" class="ink-back" type="button">主菜单</button>
                <h2 id="td-theme-title" class="ink-page__title">塔防</h2>
                <div class="ink-page__aside">择一卷入境</div>
            </header>
            <div class="ink-page__body ink-page__body--fill"><div class="scroll-shelf" id="td-theme-shelf"></div></div>
        </section>
        <section id="level-list-container" class="ink-page hidden" aria-labelledby="td-level-title">
            <header class="ink-page__bar">
                <button id="back-to-themes" class="ink-back" type="button">塔防</button>
                <h2 id="td-level-title" class="ink-page__title level-list-title"></h2>
                <div class="ink-page__aside" id="td-level-progress"></div>
            </header>
            <div class="ink-page__body ink-page__body--fill"><div class="level-scroll-host" id="td-level-scroll"></div></div>
        </section>
        
        <!-- 图鉴主界面（P2：三段骨架，入口卡占满内容区） -->
        <section id="encyclopedia-container" class="ink-page codex-page hidden" aria-labelledby="codex-title">
            <header class="ink-page__bar">
                <button id="back-to-menu-from-encyclopedia" class="ink-back" type="button">主菜单</button>
                <h2 id="codex-title" class="ink-page__title">图鉴</h2>
                <div class="ink-page__aside" id="codex-tally"></div>
            </header>
            <div class="ink-page__body ink-page__body--fill">
                <div class="codex-entries">
                    <button class="codex-entry" id="btn-tower-encyclopedia" type="button">
                        <span class="codex-entry__glyph">塔</span>
                        <span class="codex-entry__name">炮塔志</span>
                        <span class="codex-entry__count" id="codex-count-towers"></span>
                    </button>
                    <button class="codex-entry" id="btn-enemy-encyclopedia" type="button">
                        <span class="codex-entry__glyph">敌</span>
                        <span class="codex-entry__name">妖异录</span>
                        <span class="codex-entry__count" id="codex-count-enemies"></span>
                    </button>
                    <button class="codex-entry" id="btn-fusion-encyclopedia" type="button">
                        <span class="codex-entry__glyph">合</span>
                        <span class="codex-entry__name">合字图鉴</span>
                        <span class="codex-entry__count" id="codex-count-fusion"></span>
                    </button>
                </div>
            </div>
        </section>

        <!-- 炮塔志：左列表、右详情常驻双栏 -->
        <section id="tower-encyclopedia-container" class="ink-page codex-page hidden" aria-labelledby="tower-codex-title">
            <header class="ink-page__bar">
                <button id="back-to-encyclopedia-from-towers" class="ink-back" type="button">图鉴</button>
                <h2 id="tower-codex-title" class="ink-page__title">炮塔志</h2>
                <div class="ink-page__aside">
                    <button id="tower-codex-home" class="ink-btn ink-btn--ghost codex-home" type="button">主菜单</button>
                </div>
            </header>
            <div class="ink-page__body ink-page__body--fill">
                <div class="ink-split codex-split">
                    <div id="tower-encyclopedia-grid" class="codex-list" role="listbox" aria-label="炮塔"></div>
                    <article id="tower-detail-panel" class="ink-panel codex-detail" aria-live="polite"></article>
                </div>
            </div>
        </section>

        <!-- 妖异录：同上 -->
        <section id="enemy-encyclopedia-container" class="ink-page codex-page hidden" aria-labelledby="enemy-codex-title">
            <header class="ink-page__bar">
                <button id="back-to-encyclopedia-from-enemies" class="ink-back" type="button">图鉴</button>
                <h2 id="enemy-codex-title" class="ink-page__title">妖异录</h2>
                <div class="ink-page__aside">
                    <button id="enemy-codex-home" class="ink-btn ink-btn--ghost codex-home" type="button">主菜单</button>
                </div>
            </header>
            <div class="ink-page__body ink-page__body--fill">
                <div class="ink-split codex-split">
                    <div id="enemy-encyclopedia-grid" class="codex-list" role="listbox" aria-label="妖异"></div>
                    <article id="enemy-detail-panel" class="ink-panel codex-detail" aria-live="polite"></article>
                </div>
            </div>
        </section>
        
        <!-- 合字图鉴：同上；全部合字开放 -->
        <section id="fusion-encyclopedia-container" class="ink-page codex-page hidden" aria-labelledby="fusion-codex-title">
            <header class="ink-page__bar">
                <button id="back-to-encyclopedia-from-fusion" class="ink-back" type="button">图鉴</button>
                <h2 id="fusion-codex-title" class="ink-page__title">合字图鉴</h2>
                <div class="ink-page__aside">
                    <button id="fusion-codex-home" class="ink-btn ink-btn--ghost codex-home" type="button">主菜单</button>
                </div>
            </header>
            <div class="ink-page__body ink-page__body--fill">
                <div class="ink-split codex-split">
                    <div id="fusion-encyclopedia-grid" class="codex-list" role="listbox" aria-label="合字"></div>
                    <article id="fusion-detail-panel" class="ink-panel codex-detail" aria-live="polite"></article>
                </div>
            </div>
        </section>

        <button id="back-to-menu" class="hidden">主菜单</button>

        <!-- 自定义主界面 -->
        <div id="custom-container" class="hidden">
            <div class="custom-title">自定义</div>
            <div class="custom-buttons">
                <div class="custom-card" id="btn-custom-towers">
                    <span class="custom-icon">塔</span>
                    <div class="custom-card-name">自定义炮塔</div>
                    <div class="custom-card-desc">创建和编辑自定义炮塔</div>
                </div>
                <div class="custom-card" id="btn-custom-levels">
                    <span class="custom-icon">境</span>
                    <div class="custom-card-name">自定义关卡</div>
                    <div class="custom-card-desc">设计和保存自定义关卡</div>
                </div>
                <div class="custom-card" id="btn-custom-export">
                    <span class="custom-icon">卷</span>
                    <div class="custom-card-name">导出/导入</div>
                    <div class="custom-card-desc">分享你的自定义内容</div>
                </div>
            </div>
            <button id="back-to-menu-from-custom">主菜单</button>
        </div>

        <!-- 自定义炮塔界面（占位） -->
        <div id="custom-towers-container" class="hidden">
            <div class="custom-sub-header">
                <span class="custom-sub-title">自定义炮塔</span>
            </div>
            <div class="custom-placeholder">
                <div class="placeholder-icon">塔</div>
                <div class="placeholder-text">自定义炮塔功能开发中...</div>
                <div class="placeholder-desc">此功能将允许您创建和编辑自定义炮塔</div>
            </div>
            <button id="back-to-custom-from-towers">自定义</button>
        </div>

        <!-- 自定义关卡界面（占位） -->
        <div id="custom-levels-container" class="hidden">
            <div class="custom-sub-header">
                <span class="custom-sub-title">自定义关卡</span>
            </div>
            <div class="custom-placeholder">
                <div class="placeholder-icon">境</div>
                <div class="placeholder-text">自定义关卡功能开发中...</div>
                <div class="placeholder-desc">此功能将允许您设计和保存自定义关卡</div>
            </div>
            <button id="back-to-custom-from-levels">自定义</button>
        </div>

        <!-- 导出/导入界面（占位） -->
        <div id="custom-export-container" class="hidden">
            <div class="custom-sub-header">
                <span class="custom-sub-title">导出/导入</span>
            </div>
            <div class="custom-placeholder">
                <div class="placeholder-icon">卷</div>
                <div class="placeholder-text">导出/导入功能开发中...</div>
                <div class="placeholder-desc">此功能将允许您分享自定义内容</div>
            </div>
            <button id="back-to-custom-from-export">自定义</button>
        </div>

        <!-- 征服模式主题选择 -->
        <section id="conquest-theme-select-container" class="ink-page hidden" aria-labelledby="cq-theme-title">
            <header class="ink-page__bar">
                <button id="back-to-menu-from-conquest-theme" class="ink-back" type="button">主菜单</button>
                <h2 id="cq-theme-title" class="ink-page__title">征服</h2>
                <div class="ink-page__aside">择一卷入境</div>
            </header>
            <div class="ink-page__body ink-page__body--fill"><div class="scroll-shelf" id="cq-theme-shelf"></div></div>
        </section>
        <section id="conquest-level-select-container" class="ink-page hidden" aria-labelledby="conquest-current-theme-name">
            <header class="ink-page__bar">
                <button id="back-to-conquest-themes" class="ink-back" type="button">征服</button>
                <h2 id="conquest-current-theme-name" class="ink-page__title"></h2>
                <div class="ink-page__aside" id="cq-level-progress"></div>
            </header>
            <div class="ink-page__body ink-page__body--fill"><div class="level-scroll-host" id="cq-level-scroll"></div></div>
        </section>
    </div>

    <!-- 游戏缩放容器 -->
    <div id="game-wrapper">
        <div id="scale-container">
            <div id="main-container" class="hidden">
                <div id="game-container">
                    <!-- P4：画布占满；P7：数值并入右侧卡槽，画布上方不再有任何叠层 -->
                    <div id="game-area">
                        <canvas id="game-canvas"></canvas>
                    </div>
                    <aside class="battle-dock battle-dock--left battle-dock--cards" aria-label="塔卡">
                        <div id="bottom-bar"></div>
                    </aside>
                    <aside class="battle-dock" aria-label="战况">
                        <button id="pause-btn" class="dock-pause" type="button" title="暂停" aria-label="暂停">停</button>
                        <div id="top-bar" class="dock-stats">
                            <div class="stat core-stat"><span class="label">守</span><span id="core-hp" class="value">20/20</span></div>
                            <div class="stat dock-stat"><span class="label">墨</span><span id="ink" class="value">300</span></div>
                            <div class="stat dock-stat"><span class="label">时间</span><span id="hold-time" class="value">--:--</span></div>
                            <div class="stat dock-stat"><span class="label">尸</span><span id="enemies" class="value">0</span></div>
                        </div>
                    </aside>
                </div>
            </div>
            <!-- 征服模式容器 -->
            <div id="conquest-container" class="hidden">
                <div id="conquest-game-container">
                    <canvas id="conquest-canvas"></canvas>
                </div>
                <aside id="conquest-side-panel" class="battle-dock battle-dock--left" aria-label="征服">
                    <button id="conquest-summon-btn" class="summon-btn" type="button">召<span id="conquest-summon-cost" class="summon-cost">50墨</span></button>
                    <div class="dock-stat"><span class="label">墨</span><span id="conquest-ink" class="value">300</span></div>
                    <div class="dock-stat"><span class="label">时间</span><span id="conquest-hold" class="value">--:--</span></div>
                    <div class="dock-stat dock-stat--danger"><span class="label">危</span><span id="conquest-danger" class="value">0 / 200</span></div>
                    <button id="conquest-menu-btn" class="conquest-menu-btn" type="button" title="返回选关" aria-label="返回选关">退</button>
                </aside>
            </div>
        </div>
    </div>


    <!-- 战斗暂停菜单（暂停按钮打开） -->
    <div id="battle-pause" class="battle-layer ink-veil hidden" role="dialog" aria-label="暂停菜单">
        <div class="battle-layer-panel ink-scroll">
            <h2>暂 停</h2>
            <p id="hud-level" class="pause-level"></p>
            <button id="pause-resume" class="ink-btn ink-btn--primary" type="button">继续</button>
            <button id="pause-settings" class="ink-btn" type="button">设置</button>
            <button id="pause-return" class="ink-btn ink-btn--ghost" type="button">返回主菜单</button>
        </div>
    </div>

    <!-- 战斗设置弹窗（暂停菜单的「设置」打开） -->
    <div id="battle-settings" class="battle-layer ink-veil hidden" role="dialog" aria-label="战斗设置">
        <div class="battle-layer-panel ink-scroll settings-layer-panel">
            <h2>设置</h2>
            <div data-settings-host="battle"></div>
            <button id="settings-back" class="ink-back" type="button">暂停</button>
        </div>
    </div>

    <!-- 卷轴弹窗（P5）：内容由 js/ui/ink-modal.js 渲染 -->
    <div id="modal" class="ink-veil hidden" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div id="modal-content" class="ink-scroll">
            <span id="modal-seal" aria-hidden="true">印</span>
            <h2 id="modal-title"></h2>
            <p id="modal-text"></p>
            <div id="modal-stars" class="modal-stars" hidden></div>
            <div id="modal-actions" class="modal-actions"></div>
        </div>
    </div>

    <div id="tower-info" class="hidden">
        <div class="info-header">
            <span class="info-char"></span>
            <span class="info-desc"></span>
        </div>
        <div class="info-stats"></div>
        <div class="info-fusion" hidden></div>
        <div class="info-actions">
            <button class="sell-btn">出售</button>
        </div>
    </div>

    <div id="conquest-tower-info" class="hidden">
        <div class="info-header">
            <span class="info-char"></span>
            <span class="info-desc"></span>
        </div>
        <div class="info-stats"></div>
        <div class="info-fusion" hidden></div>
        <div class="info-actions">
            <button class="sell-btn">出售</button>
        </div>
    </div>

`;
  document.body.insertAdjacentHTML("afterbegin", markup);
})();
