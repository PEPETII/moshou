// UI：通知和商人事件
// === 事件通知系统 ===
UI.prototype.showEventNotification = function(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = 'event-notification';
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 10px;
      border: 2px solid #a67c00;
      z-index: 1000;
      min-width: 300px;
      text-align: center;
      font-family: 'Microsoft YaHei', sans-serif;
    `;
    
    notification.innerHTML = `
      <h3 style="color: #a67c00; margin: 0 0 10px 0;">
        ${type === 'success' ? '✨ 成功' : type === 'warning' ? '⚠️ 警告' : 'ℹ️ 信息'}
      </h3>
      <p style="margin: 0 0 15px 0;">${message}</p>
      <button onclick="this.parentElement.remove()" style="
        background: #a67c00;
        color: black;
        border: none;
        padding: 8px 16px;
        margin: 5px;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
      ">确定</button>
    `;
    
    const container = document.getElementById('event-container');
    if (container) {
      container.appendChild(notification);
      
      if (duration > 0) {
        setTimeout(() => {
          if (notification.parentElement) {
            notification.remove();
          }
        }, duration);
      }
    }
  
};
// === 商人事件选择界面 ===
UI.prototype.showMerchantEvent = function(options) {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.95);
      color: white;
      padding: 30px;
      border-radius: 15px;
      border: 3px solid #a67c00;
      z-index: 1000;
      min-width: 400px;
      text-align: center;
      font-family: 'Microsoft YaHei', sans-serif;
    `;
    
    dialog.innerHTML = `
      <h2 style="color: #a67c00; margin: 0 0 20px 0;">🧙‍♂️ 神秘商人到访！</h2>
      <p style="margin: 0 0 20px 0; font-size: 16px;">选择一项交易：</p>
      <div id="merchant-options"></div>
    `;
    
    const optionsContainer = dialog.querySelector('#merchant-options');
    options.forEach((option, index) => {
      const button = document.createElement('button');
      button.textContent = option.text;
      button.style.cssText = `
        display: block;
        width: 100%;
        margin: 10px 0;
        padding: 12px;
        background: #4ecdc4;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
      `;
      button.onmouseover = () => button.style.background = '#44a3aa';
      button.onmouseout = () => button.style.background = '#4ecdc4';
      button.onclick = () => {
        option.action();
        dialog.remove();
      };
      optionsContainer.appendChild(button);
    });
    
    document.getElementById('event-container').appendChild(dialog);
  
};
