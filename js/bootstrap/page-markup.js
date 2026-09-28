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
        <canvas id="menu-ink-canvas"></canvas>
        <h1 aria-label="墨守成规"><span class="title-ink">墨</span><span class="title-script">守 成 规</span></h1>
        <span class="menu-seal" aria-hidden="true">守</span>
        <div id="game-version" class="game-version"></div>
        <div class="menu-buttons">
            <button class="menu-btn" id="btn-levels"><span class="menu-glyph">守</span><span>塔 防</span></button>
            <button class="menu-btn" id="btn-conquest"><span class="menu-glyph">征</span><span>征 服</span></button>
            <button class="menu-btn" id="btn-encyclopedia"><span class="menu-glyph">谱</span><span>图 鉴</span></button>
            <button class="menu-btn" id="btn-custom"><span class="menu-glyph">作</span><span>自 定</span></button>
            <button class="menu-btn" id="btn-settings"><span class="menu-glyph">设</span><span>设 置</span></button>
        </div>
        <div id="settings-container" class="hidden">
            <h2>设 · 墨卷</h2>
            <button id="ink-motion-toggle" type="button" aria-pressed="false">墨迹动效 · 开</button>
            <p>减少动效时，书页与印章仍会清晰呈现。</p>
            <button id="back-to-menu-from-settings" type="button">返回墨卷</button>
        </div>
        <div id="theme-select-container" class="hidden"></div>
        <div id="level-list-container" class="hidden">
            <div class="level-list-header">
                <span class="level-list-title"></span>
            </div>
            <div class="level-grid"></div>
            <div id="level-inscription" class="hidden" aria-live="polite">
                <span id="level-inscription-number"></span>
                <strong id="level-inscription-name"></strong>
                <span id="level-inscription-note"></span>
                <button id="enter-level" type="button">入 境</button>
            </div>
            <button id="back-to-themes">主题</button>
        </div>
        
        <!-- 图鉴主界面 -->
        <div id="encyclopedia-container" class="hidden">
            <div class="encyclopedia-title">图鉴</div>
            <div class="encyclopedia-buttons">
                <div class="encyclopedia-card" id="btn-tower-encyclopedia">
                    <span class="encyclopedia-icon">塔</span>
                    <div class="encyclopedia-card-name">炮塔志</div>
                    <div class="encyclopedia-card-desc">查看所有防御塔详细信息</div>
                </div>
                <div class="encyclopedia-card" id="btn-enemy-encyclopedia">
                    <span class="encyclopedia-icon">鬼</span>
                    <div class="encyclopedia-card-name">妖异录</div>
                    <div class="encyclopedia-card-desc">查看所有敌人详细信息</div>
                </div>
                <div class="encyclopedia-card" id="btn-fusion-encyclopedia">
                    <span class="encyclopedia-icon">合</span>
                    <div class="encyclopedia-card-name">合字谱</div>
                    <div class="encyclopedia-card-desc">查看所有融合配方和属性</div>
                </div>
            </div>
            <button id="back-to-menu-from-encyclopedia">主菜单</button>
        </div>
        
        <!-- 炮塔图鉴界面 -->
        <div id="tower-encyclopedia-container" class="hidden">
            <div class="encyclopedia-header">
                <span class="encyclopedia-title">炮塔图鉴</span>
                <div class="filter-tabs">
                    <button class="filter-tab active" data-filter="all">全部</button>
                    <button class="filter-tab" data-filter="basic">基础</button>
                    <button class="filter-tab" data-filter="element">元素</button>
                    <button class="filter-tab" data-filter="support">辅助</button>
                    <button class="filter-tab" data-filter="path">路径</button>
                    <button class="filter-tab" data-filter="special">特殊</button>
                </div>
            </div>
            <div class="encyclopedia-grid" id="tower-encyclopedia-grid"></div>
            <button id="back-to-encyclopedia-from-towers">图鉴</button>
        </div>
        
        <!-- 怪物图鉴界面 -->
        <div id="enemy-encyclopedia-container" class="hidden">
            <div class="encyclopedia-header">
                <span class="encyclopedia-title">怪物图鉴</span>
            </div>
            <div class="encyclopedia-grid" id="enemy-encyclopedia-grid"></div>
            <button id="back-to-encyclopedia-from-enemies">图鉴</button>
        </div>
        
        <!-- 炮塔详情面板 -->
        <div id="tower-detail-panel" class="hidden">
            <div class="detail-content">
                <div class="detail-header">
                    <span class="detail-char" id="tower-detail-char"></span>
                    <span class="detail-name" id="tower-detail-name"></span>
                </div>
                <div class="detail-stats" id="tower-detail-stats"></div>
                <div class="detail-desc" id="tower-detail-desc"></div>
                <button class="detail-close-btn" id="close-tower-detail">关闭</button>
            </div>
        </div>
        
        <!-- 怪物详情面板 -->
        <div id="enemy-detail-panel" class="hidden">
            <div class="detail-content">
                <div class="detail-header">
                    <span class="detail-char" id="enemy-detail-char"></span>
                    <span class="detail-name" id="enemy-detail-name"></span>
                </div>
                <div class="detail-stats" id="enemy-detail-stats"></div>
                <div class="detail-desc" id="enemy-detail-desc"></div>
                <button class="detail-close-btn" id="close-enemy-detail">关闭</button>
            </div>
        </div>
        
        <!-- 融合图鉴界面 -->
        <div id="fusion-encyclopedia-container" class="hidden">
            <div class="encyclopedia-header">
                <span class="encyclopedia-title">融合图鉴</span>
                <button id="btn-fusion-guide" class="guide-btn">融合指南</button>
            </div>
            <div class="encyclopedia-grid" id="fusion-encyclopedia-grid"></div>
            <button id="back-to-encyclopedia-from-fusion">图鉴</button>
        </div>
        
        <!-- 融合配方详情面板 -->
        <div id="fusion-detail-panel" class="hidden">
            <div class="detail-content fusion-detail-content">
                <div class="detail-header">
                    <span class="detail-char" id="fusion-detail-char"></span>
                    <div class="fusion-title-group">
                        <span class="detail-name" id="fusion-detail-name"></span>
                        <span class="fusion-rarity" id="fusion-detail-rarity"></span>
                    </div>
                </div>
                <div class="fusion-materials" id="fusion-detail-materials"></div>
                <div class="fusion-comparison" id="fusion-detail-comparison"></div>
                <div class="detail-desc" id="fusion-detail-desc"></div>
                <button class="detail-close-btn" id="close-fusion-detail">关闭</button>
            </div>
        </div>
        
        <!-- 融合指南面板 -->
        <div id="fusion-guide-panel" class="hidden">
            <div class="guide-content">
                <div class="guide-header">
                    <span class="guide-title">融合指南</span>
                </div>
                <div class="guide-steps">
                    <div class="guide-step">
                        <span class="step-number">1</span>
                        <div class="step-content">
                            <div class="step-title">选择材料</div>
                            <div class="step-desc">在战场上放置两个可以融合的炮塔</div>
                        </div>
                    </div>
                    <div class="guide-step">
                        <span class="step-number">2</span>
                        <div class="step-content">
                            <div class="step-title">拖拽融合</div>
                            <div class="step-desc">按住并拖拽一个炮塔到另一个炮塔上</div>
                        </div>
                    </div>
                    <div class="guide-step">
                        <span class="step-number">3</span>
                        <div class="step-content">
                            <div class="step-title">确认融合</div>
                            <div class="step-desc">消耗墨水确认融合操作</div>
                        </div>
                    </div>
                    <div class="guide-step">
                        <span class="step-number">4</span>
                        <div class="step-content">
                            <div class="step-title">获得新炮塔</div>
                            <div class="step-desc">融合成功，获得强大的融合炮塔</div>
                        </div>
                    </div>
                </div>
                <div class="guide-notices">
                    <div class="notice-title">注意事项</div>
                    <ul class="notice-list">
                        <li>融合后材料炮塔会消失，请谨慎选择</li>
                        <li>融合炮塔无法再次进行融合</li>
                        <li>需要足够的墨水才能进行融合</li>
                        <li>并非所有炮塔组合都可以融合</li>
                        <li>融合后的炮塔继承材料炮塔的位置</li>
                    </ul>
                </div>
                <button class="detail-close-btn" id="close-fusion-guide">关闭</button>
            </div>
        </div>
        
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
        <div id="conquest-theme-select-container" class="hidden">
            <div class="conquest-theme-header">
                <span class="conquest-theme-title">征服模式 - 选择主题</span>
            </div>
            <div class="conquest-theme-grid">
                <div class="conquest-theme-card" data-theme="1">
                    <span class="theme-icon">火</span>
                    <div class="theme-name">烈焰试炼</div>
                    <div class="theme-progress">进度: 0/5</div>
                </div>
                <div class="conquest-theme-card" data-theme="2">
                    <span class="theme-icon">水</span>
                    <div class="theme-name">寒霜之路</div>
                    <div class="theme-progress">进度: 0/5</div>
                </div>
                <div class="conquest-theme-card" data-theme="3">
                    <span class="theme-icon">山</span>
                    <div class="theme-name">山岳考验</div>
                    <div class="theme-progress">进度: 0/5</div>
                </div>
                <div class="conquest-theme-card" data-theme="4">
                    <span class="theme-icon">风</span>
                    <div class="theme-name">风暴中心</div>
                    <div class="theme-progress">进度: 0/5</div>
                </div>
                <div class="conquest-theme-card" data-theme="5">
                    <span class="theme-icon">合</span>
                    <div class="theme-name">终极挑战</div>
                    <div class="theme-progress">进度: 0/5</div>
                </div>
            </div>
            <button id="back-to-menu-from-conquest-theme">主菜单</button>
        </div>
        
        <!-- 征服模式关卡选择 -->
        <div id="conquest-level-select-container" class="hidden">
            <div class="conquest-level-header">
                <span class="conquest-level-title" id="conquest-current-theme-name">主题名称</span>
            </div>
            <div class="conquest-level-grid">
                <div class="conquest-level-item" data-level="1">
                    <span class="level-num">关卡 1</span>
                    <span class="level-status"></span>
                </div>
                <div class="conquest-level-item" data-level="2">
                    <span class="level-num">关卡 2</span>
                    <span class="level-status"></span>
                </div>
                <div class="conquest-level-item" data-level="3">
                    <span class="level-num">关卡 3</span>
                    <span class="level-status"></span>
                </div>
                <div class="conquest-level-item locked" data-level="4">
                    <span class="level-num">关卡 4</span>
                    <span class="level-status">未悟</span>
                </div>
                <div class="conquest-level-item locked" data-level="5">
                    <span class="level-num">关卡 5</span>
                    <span class="level-status">未悟</span>
                </div>
            </div>
            <button id="back-to-conquest-themes">主题列表</button>
        </div>
    </div>

    <!-- 游戏缩放容器 -->
    <div id="game-wrapper">
        <div id="scale-container">
            <div id="main-container" class="hidden">
                <div id="game-container">
                    <div id="top-bar">
                        <div class="stat">
                            <span class="label">墨</span>
                            <span id="ink" class="value">300</span>
                        </div>
                        <div class="stat">
                            <span class="label">阵</span>
                            <span id="wave" class="value">0/3</span>
                        </div>
                        <div class="stat">
                            <span class="label">尸</span>
                            <span id="enemies" class="value">0</span>
                        </div>
                        <div class="stat core-stat">
                            <span class="label">守</span>
                            <span id="core-hp" class="value">20/20</span>
                        </div>
                        <div id="wave-btn-small">
                            <button id="start-wave">波次</button>
                        </div>
                        <div class="stat">
                            <button id="fusion-encyclopedia-btn" title="融合图鉴">合字谱</button>
                        </div>
                        <div class="stat">
                            <button id="back-to-menu-btn" title="主菜单">归卷</button>
                        </div>
                    </div>

                    <div id="game-area">
                        <canvas id="game-canvas"></canvas>
                    </div>

                    <div id="bottom-bar">
                        <div class="tower-select" data-type="fire">
                            <span class="tower-char">火</span>
                            <span class="tower-cost">120</span>
                        </div>
                        <div class="tower-select" data-type="water">
                            <span class="tower-char">水</span>
                            <span class="tower-cost">90</span>
                        </div>
                        <div class="tower-select" data-type="mountain">
                            <span class="tower-char">山</span>
                            <span class="tower-cost">140</span>
                        </div>
                        <div class="tower-select locked" data-type="wood">
                            <span class="tower-char">木</span>
                            <span class="tower-cost">100</span>
                        </div>
                        <div class="tower-select locked" data-type="gold">
                            <span class="tower-char">金</span>
                            <span class="tower-cost">180</span>
                        </div>
                        <div class="tower-select locked" data-type="earth">
                            <span class="tower-char">土</span>
                            <span class="tower-cost">220</span>
                        </div>
                        <div class="tower-select locked" data-type="xinZhongYan">
                            <span class="tower-char"><span>心中</span><span>炎</span></span>
                            <span class="tower-cost">250</span>
                        </div>
                        <div class="tower-select locked" data-type="ruFengSiZhen">
                            <span class="tower-char"><span>如风</span><span>似真</span></span>
                            <span class="tower-cost">300</span>
                        </div>
                    </div>
                </div>
            </div>
            <!-- 征服模式容器 -->
            <div id="conquest-container" class="hidden">
                <div id="conquest-side-panel">
                    <div class="conquest-title">征服模式</div>
                    <div class="summon-section">
                        <button id="conquest-summon-btn" class="summon-btn">召唤</button>
                        <div class="summon-cost">80墨</div>
                    </div>
                    <div class="conquest-divider"></div>
                    <div class="conquest-stats">
                        <div class="conquest-stat">
                            <span class="conquest-label">墨水</span>
                            <span id="conquest-ink" class="conquest-value">300</span>
                        </div>
                        <div class="conquest-stat">
                            <span class="conquest-label">波次</span>
                            <span id="conquest-wave" class="conquest-value">0/3</span>
                        </div>
                        <div class="conquest-stat">
                            <span class="conquest-label">现存敌人</span>
                            <span id="conquest-enemies" class="conquest-value">0</span>
                        </div>
                    </div>
                    <div class="conquest-divider"></div>
                    <button id="conquest-fusion-encyclopedia-btn" title="融合图鉴">合字谱</button>
                    <button id="conquest-wave-btn" class="conquest-wave-btn">开始波次</button>
                    <button id="conquest-menu-btn" class="conquest-menu-btn">菜单</button>
                    <div class="conquest-rules">
                        <div class="rules-title">规则</div>
                        <div class="rules-text">外圈为敌人循环路径</div>
                        <div class="rules-text">内圈可放置炮塔</div>
                        <div class="rules-text">召唤随机生成炮塔</div>
                        <div class="rules-text">场上50怪即失败</div>
                    </div>
                </div>
                <div id="conquest-game-container">
                    <canvas id="conquest-canvas"></canvas>
                </div>
            </div>
        </div>
    </div>

    <!-- 事件通知容器 -->
    <div id="event-container"></div>

    <div id="modal" class="hidden">
        <div id="modal-content">
            <div id="modal-ritual" aria-hidden="true"><span id="ritual-left"></span><span id="ritual-right"></span><span id="ritual-result"></span></div>
            <h2 id="modal-title"></h2>
            <p id="modal-text"></p>
            <span id="modal-seal" aria-hidden="true">印</span>
            <button id="modal-btn">确定</button>
        </div>
    </div>
    <div id="fusion-ink-feedback" class="hidden" aria-live="polite"><span class="fusion-feedback-word"></span><span class="fusion-feedback-seal">合</span></div>

    <!-- 游戏内融合图鉴模态窗口 -->
    <div id="game-fusion-encyclopedia-modal" class="hidden">
        <div class="game-fusion-modal-content">
            <div class="game-fusion-modal-header">
                <h2>融合图鉴</h2>
                <button class="close-modal-btn" id="close-game-fusion-modal">×</button>
            </div>
            <div class="game-fusion-modal-body">
                <div class="game-fusion-grid" id="game-fusion-grid"></div>
            </div>
        </div>
    </div>

    <!-- 游戏内融合详情面板 -->
    <div id="game-fusion-detail-panel" class="hidden">
        <div class="game-fusion-detail-content">
            <div class="game-fusion-detail-header">
                <span class="game-fusion-detail-char" id="game-fusion-detail-char"></span>
                <div class="game-fusion-title-group">
                    <span class="game-fusion-detail-name" id="game-fusion-detail-name"></span>
                    <span class="game-fusion-rarity" id="game-fusion-detail-rarity"></span>
                </div>
            </div>
            <div class="game-fusion-materials" id="game-fusion-detail-materials"></div>
            <div class="game-fusion-detail-stats" id="game-fusion-detail-stats"></div>
            <div class="game-fusion-detail-desc" id="game-fusion-detail-desc"></div>
            <button class="game-fusion-detail-close-btn" id="close-game-fusion-detail">关闭</button>
        </div>
    </div>

    <div id="tower-info" class="hidden">
        <div class="info-header">
            <span class="info-char"></span>
            <span class="info-level"></span>
        </div>
        <div class="info-stats"></div>
        <div class="info-actions">
            <button class="upgrade-btn">升级</button>
            <button class="sell-btn">出售</button>
        </div>
    </div>

    <div id="conquest-tower-info" class="hidden">
        <div class="info-header">
            <span class="info-char"></span>
            <span class="info-level"></span>
        </div>
        <div class="info-stats"></div>
        <div class="info-actions">
            <button class="upgrade-btn">升级</button>
            <button class="sell-btn">出售</button>
        </div>
    </div>

`;
  document.body.insertAdjacentHTML("afterbegin", markup);
})();
