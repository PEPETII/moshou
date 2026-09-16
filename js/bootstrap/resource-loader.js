// 资源预加载管理器
    window.ResourceLoader = {
      resources: [],
      loaded: 0,
      failed: 0,
      onProgress: null,
      onComplete: null,

      add(url, type = 'script') {
        this.resources.push({ url, type });
        return this;
      },

      load() {
        const total = this.resources.length;
        if (total === 0) {
          this.onComplete && this.onComplete();
          return Promise.resolve();
        }

        const promises = this.resources.map(res => {
          return new Promise((resolve, reject) => {
            if (res.type === 'font') {
              // 字体预加载
              document.fonts.load('1em "Ma Shan Zheng"').then(() => {
                this.loaded++;
                this._reportProgress(total);
                resolve();
              }).catch(() => {
                this.failed++;
                this._reportProgress(total);
                resolve(); // 字体失败不阻塞
              });
            } else if (res.type === 'script') {
              // 脚本通过创建临时 script 标签预加载
              const script = document.createElement('script');
              script.src = res.url;
              script.async = true;
              script.onload = () => {
                this.loaded++;
                this._reportProgress(total);
                resolve();
              };
              script.onerror = () => {
                this.failed++;
                this._reportProgress(total);
                reject(new Error(`Failed to load: ${res.url}`));
              };
              document.head.appendChild(script);
            }
          });
        });

        return Promise.all(promises).then(() => {
          this.onComplete && this.onComplete();
        }).catch(err => {
          console.warn('资源加载失败:', err);
          this.onComplete && this.onComplete();
        });
      },

      _reportProgress(total) {
        const progress = Math.round(((this.loaded + this.failed) / total) * 100);
        this.onProgress && this.onProgress(progress, this.loaded, this.failed, total);
      }
    };
