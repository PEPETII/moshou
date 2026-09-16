// 移动端适配
    (function() {
        // 游戏原始尺寸
        const GAME_WIDTH = 960;  // 画布宽度960px (20列 x 48px)
        const GAME_HEIGHT = 480;
        const SIDE_PANEL_WIDTH = 280;
        const GAP = 24;
        const TOTAL_GAME_WIDTH = SIDE_PANEL_WIDTH + GAP + GAME_WIDTH; // 1264px

        // 响应式断点定义（与 CSS 保持一致）
        // 移动端：max-width: 768px
        // 平板：min-width: 769px and max-width: 1024px
        // 桌面：min-width: 1025px
        const BREAKPOINTS = {
            MOBILE: 768,
            TABLET: 1024
        };

        // 根据屏幕宽度获取设备类型（与 CSS 媒体查询保持一致）
        function getDeviceType() {
            const width = window.innerWidth;
            if (width <= BREAKPOINTS.MOBILE) {
                return 'mobile';
            } else if (width >= 769 && width <= BREAKPOINTS.TABLET) {
                return 'tablet';
            }
            return 'desktop';
        }

        // 计算并应用缩放
        function applyScale() {
            const container = document.getElementById('scale-container');
            if (!container) return;

            const wrapperWidth = window.innerWidth;
            const wrapperHeight = window.innerHeight;

            // 使用与 CSS 一致的断点检测设备类型
            const deviceType = getDeviceType();
            const isMobile = deviceType === 'mobile';
            const isTablet = deviceType === 'tablet';

            // 检测是否为横屏（宽度大于高度）
            const isLandscape = wrapperWidth > wrapperHeight;

            // 计算最大允许缩放（考虑边距）
            const padding = isMobile ? 10 : 20;
            const maxScaleX = (wrapperWidth - padding * 2) / TOTAL_GAME_WIDTH;
            const maxScaleY = (wrapperHeight - padding * 2) / GAME_HEIGHT;

            // 移动端和平板允许更小的缩放比例，确保内容可见
            // 横屏时进一步降低最小缩放比例
            let minScale;
            if (isMobile && isLandscape) {
                minScale = 0.3; // 手机横屏时允许更小缩放
            } else if (isMobile) {
                minScale = 0.4;
            } else if (isTablet) {
                minScale = 0.45;
            } else {
                minScale = 0.5;
            }

            let scale = Math.min(maxScaleX, maxScaleY, 1);
            scale = Math.max(scale, minScale); // 确保最小缩放

            container.style.transform = 'scale(' + scale + ')';

            // 移动端和平板优化：调整容器位置
            if (isMobile || isTablet) {
                container.style.transformOrigin = 'center center';
            }

            // 调试信息仅在 ?debug=1 时输出，避免移动端默认产生日志开销。
            if (new URLSearchParams(window.search).get('debug') === '1') {
                console.log('Scale:', scale, 'Device:', deviceType, 'Landscape:', isLandscape, 'Available:', wrapperWidth, 'x', wrapperHeight);
            }
        }

        // 横屏检测 - 使用与 CSS 一致的断点
        function checkOrientation() {
            const wrapperWidth = window.innerWidth;
            const wrapperHeight = window.innerHeight;
            const deviceType = getDeviceType();
            
            // 根据设备类型设置最小宽度阈值
            // 移动端：768px, 平板：769px, 桌面：800px
            const minWidth = deviceType === 'mobile' ? BREAKPOINTS.MOBILE : 
                            (deviceType === 'tablet' ? 769 : 800);
            
            if (wrapperHeight > wrapperWidth && wrapperWidth < minWidth) {
                document.body.classList.add('show-rotate-tip');
            } else {
                document.body.classList.remove('show-rotate-tip');
                setTimeout(applyScale, 100);
            }
        }

        // 初始化
        function init() {
            applyScale();
        }

        window.addEventListener('load', function() {
            init();
            checkOrientation();
        });
        window.addEventListener('resize', function() {
            checkOrientation();
        });
        window.addEventListener('orientationchange', function() {
            setTimeout(function() {
                checkOrientation();
            }, 200); // 增加延迟确保方向变化完成
        });
        
        // 添加触摸事件支持
        document.addEventListener('touchstart', function() {}, {passive: true});
    })();
