document.addEventListener('DOMContentLoaded', function() {
  // 加载保存的设置
  chrome.storage.sync.get(['apiUrl', 'customCookie'], function(data) {
    if (data.apiUrl) {
      document.getElementById('apiUrl').value = data.apiUrl;
    }
    if (data.customCookie) {
      document.getElementById('customCookie').value = data.customCookie;
    }
  });

  // 保存设置按钮点击事件
  document.getElementById('saveSettings').addEventListener('click', function() {
    const apiUrl = document.getElementById('apiUrl').value;
    const customCookie = document.getElementById('customCookie').value;
    
    chrome.storage.sync.set({
      apiUrl: apiUrl,
      customCookie: customCookie
    }, function() {
      const savedMessage = document.getElementById('savedMessage');
      savedMessage.classList.remove('hidden');
      setTimeout(() => {
        savedMessage.classList.add('hidden');
      }, 2000);
    });
  });
});
