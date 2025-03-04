document.addEventListener('DOMContentLoaded', function() {
  // 加载保存的设置
  chrome.storage.sync.get(['apiUrl', 'customCookie', 'enableFloatButton'], function(data) {
    if (data.apiUrl) {
      document.getElementById('apiUrl').value = data.apiUrl;
    }
    if (data.customCookie) {
      document.getElementById('customCookie').value = data.customCookie;
    }
    
    // 设置悬浮按钮启用状态
    const enableFloatButton = document.getElementById('enableFloatButton');
    if (data.enableFloatButton !== undefined) {
      enableFloatButton.checked = data.enableFloatButton;
    } else {
      // 默认启用
      enableFloatButton.checked = true;
    }
  });

  // 保存设置按钮点击事件
  document.getElementById('saveSettings').addEventListener('click', function() {
    const apiUrl = document.getElementById('apiUrl').value;
    const customCookie = document.getElementById('customCookie').value;
    const enableFloatButton = document.getElementById('enableFloatButton').checked;
    
    chrome.storage.sync.set({
      apiUrl: apiUrl,
      customCookie: customCookie,
      enableFloatButton: enableFloatButton
    }, function() {
      const savedMessage = document.getElementById('savedMessage');
      savedMessage.classList.remove('hidden');
      
      // 通知所有标签页更新悬浮按钮状态
      chrome.tabs.query({}, function(tabs) {
        tabs.forEach(function(tab) {
          chrome.tabs.sendMessage(tab.id, { 
            action: "updateFloatButtonStatus", 
            enabled: enableFloatButton 
          }).catch(err => {
            // 忽略无法发送的标签页错误
            console.log("无法发送到标签页:", tab.id);
          });
        });
      });
      
      setTimeout(() => {
        savedMessage.classList.add('hidden');
      }, 2000);
    });
  });
});
