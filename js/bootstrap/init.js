// 资源预加载和初始化
    (function() {
        const loadingContainer = document.getElementById('loading-container');
        const loadingProgress = document.getElementById('loading-progress');
        const loadingPercent = document.getElementById('loading-percent');

        // 配置要预加载的资源
        // 注意：config.js, utils.js, runtime.js 已通过常规 script 标签加载
        // 这里只预加载字体，避免重复加载脚本
        ResourceLoader
            .add('', 'font'); // 预加载字体

        // 进度回调
        ResourceLoader.onProgress = (progress, loaded, failed, total) => {
            loadingProgress.style.width = progress + '%';
            loadingPercent.textContent = progress + '%';
        };

        // 完成回调
        ResourceLoader.onComplete = () => {
            // 延迟一点让用户看到 100%
            setTimeout(() => {
                loadingContainer.classList.add('hidden');
                // 初始化游戏
                if (typeof window.initGame === 'function') {
                    window.initGame();
                }
            }, 300);
        };

        // 开始加载
        ResourceLoader.load();
    })();
