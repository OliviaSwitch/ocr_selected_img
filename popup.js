document.addEventListener('DOMContentLoaded', function() {
  // 从存储中加载设置
  chrome.storage.sync.get(['apiUrl', 'customCookie', 'enableFloatButton'], function(data) {
    if (data.apiUrl) {
      document.getElementById('apiUrl').value = data.apiUrl;
    }
    if (data.customCookie) {
      document.getElementById('customCookie').value = data.customCookie;
    }
    
    // 设置悬浮按钮复选框状态
    const enableFloatButton = document.getElementById('enableFloatButton');
    // 如果设置明确为false则不勾选，否则默认勾选
    enableFloatButton.checked = data.enableFloatButton !== false;
  });

  // 保存设置
  document.getElementById('saveSettings').addEventListener('click', function() {
    const apiUrl = document.getElementById('apiUrl').value;
    const customCookie = document.getElementById('customCookie').value;
    const enableFloatButton = document.getElementById('enableFloatButton').checked;

    // 保存到存储
    chrome.storage.sync.set({
      apiUrl: apiUrl,
      customCookie: customCookie,
      enableFloatButton: enableFloatButton
    }, function() {
      // 显示保存成功信息
      const savedMessage = document.getElementById('savedMessage');
      savedMessage.classList.remove('hidden');
      setTimeout(function() {
        savedMessage.classList.add('hidden');
      }, 2000);
    });
  });
});
