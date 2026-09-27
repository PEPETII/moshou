// UI：通知和商人事件
// === 事件通知系统 ===
UI.prototype.showEventNotification = function(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = 'event-notification';
    notification.dataset.type = type;
    const title = document.createElement('h3');
    title.textContent = type === 'success' ? '成 · 已成' : type === 'warning' ? '戒 · 留意' : '知 · 墨报';
    const body = document.createElement('p');
    body.textContent = message;
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '收起';
    close.addEventListener('click', () => notification.remove());
    notification.append(title, body, close);
    
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
    dialog.className = 'merchant-inscription';
    const title = document.createElement('h2');
    title.textContent = '商 · 行旅至此';
    const note = document.createElement('p');
    note.textContent = '择一项交易：';
    const optionsContainer = document.createElement('div');
    optionsContainer.id = 'merchant-options';
    dialog.append(title, note, optionsContainer);
    options.forEach(option => {
      const button = document.createElement('button');
      button.textContent = option.text;
      button.type = 'button';
      button.onclick = () => {
        option.action();
        dialog.remove();
      };
      optionsContainer.appendChild(button);
    });
    
    document.getElementById('event-container').appendChild(dialog);
  
};
