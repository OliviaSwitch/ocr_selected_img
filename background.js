// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "ocrSelectedImage",
    title: "OCR识别此图片",
    contexts: ["image"]
  });
});

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "ocrSelectedImage") {
    // 在处理图片前先发送持续性通知消息
    chrome.tabs.sendMessage(tab.id, {
      action: "showNotification",
      message: "正在识别图片中的文字...",
      notificationId: "ocr-processing-notification",
      persistent: true
    });
    // 直接发送图片URL到background处理
    processImageUrl(info.srcUrl, tab.id);
  }
});

// 处理图片URL
async function processImageUrl(imageUrl, tabId) {
  chrome.storage.sync.get(['apiUrl', 'customCookie'], async function(data) {
    if (!data.apiUrl) {
      // 如果没有设置API URL，显示提示并移除处理中通知
      chrome.tabs.sendMessage(tabId, {
        action: "showNotification",
        message: "请先在插件设置中配置OCR API地址",
        notificationId: "ocr-processing-notification",
        persistent: false
      });
      return;
    }

    if (!data.customCookie) {
      // 如果没有设置Cookie，显示提示并移除处理中通知
      chrome.tabs.sendMessage(tabId, {
        action: "showNotification",
        message: "请先在插件设置中配置自定义Cookie",
        notificationId: "ocr-processing-notification",
        persistent: false
      });
      return;
    }

    try {
      // 准备发送数据
      const requestData = {
        imageUrl: imageUrl
      };
      
      // 设置请求头
      const headers = {
        'Content-Type': 'application/json',
        'x-custom-cookie': data.customCookie
      };

      // 发送请求到OCR API
      const response = await fetch(data.apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        // 增加调试信息，显示请求的URL
        throw new Error(`API错误: ${response.status} (请求URL: ${data.apiUrl})`);
      }

      const result = await response.json();
      
      // 处理新的响应格式
      let textResult;
      if (result.success && result.result) {
        // 如果是成功且有result字段，使用result字段的值
        textResult = result.result;
      } else if (result.text) {
        // 兼容之前假设的格式
        textResult = result.text;
      } else {
        // 无法解析的格式，显示完整JSON
        textResult = JSON.stringify(result);
      }
      
      // 发送结果回content script (会自动移除处理中通知)
      chrome.tabs.sendMessage(tabId, {
        action: "showOcrResult",
        result: textResult
      });
    } catch (error) {
      console.error("OCR处理错误:", error);
      // 显示错误并移除处理中通知
      chrome.tabs.sendMessage(tabId, {
        action: "showNotification",
        message: `OCR处理错误: ${error.message}`,
        notificationId: "ocr-processing-notification",
        persistent: false
      });
    }
  });
}

// 接收来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "processImage" && message.imageUrl) {
    // 处理来自悬浮按钮的OCR请求
    processImageUrl(message.imageUrl, sender.tab.id);
  }
  // 处理其他可能的消息类型
  return true;
});
