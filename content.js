// 接收来自background script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "showOcrResult") {
    // 移除处理中的通知
    removeNotification('ocr-processing-notification');
    // 显示OCR结果
    showOcrResult(message.result);
  } else if (message.action === "showNotification") {
    // 显示通知消息
    showNotification(message.message, message.notificationId, message.persistent);
  }
});

// 保存按钮启用状态
let floatButtonEnabled = true;

// 首先获取用户设置
function loadUserSettings() {
  chrome.storage.sync.get(['enableFloatButton'], function(data) {
    // 如果设置存在且明确设为false则禁用按钮，否则默认启用
    floatButtonEnabled = data.enableFloatButton !== false;
    
    // 加载设置后再添加按钮
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addOcrButtonsToImages);
    } else {
      addOcrButtonsToImages();
    }
  });
}

// 页面加载后读取设置
loadUserSettings();
window.addEventListener('load', addOcrButtonsToImages);

// 页面动态变化时也添加按钮（使用MutationObserver监听DOM变化）
const observer = new MutationObserver((mutations) => {
  // 如果悬浮按钮被禁用，则不添加按钮
  if (!floatButtonEnabled) return;
  
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      // 检查新添加的节点是否包含图片，如果是则添加OCR按钮
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // 元素节点
          if (node.tagName === 'IMG') {
            addOcrButtonToImage(node);
          } else {
            const images = node.querySelectorAll('img');
            if (images.length > 0) {
              images.forEach(img => addOcrButtonToImage(img));
            }
          }
        }
      });
    }
  });
});

// 开始监听DOM变化
observer.observe(document.body, { childList: true, subtree: true });

// 向页面中所有图片添加OCR按钮
function addOcrButtonsToImages() {
  // 如果悬浮按钮被禁用，则不添加按钮
  if (!floatButtonEnabled) return;
  
  const images = document.querySelectorAll('img');
  images.forEach(img => addOcrButtonToImage(img));
}

// 为单个图片添加OCR按钮
function addOcrButtonToImage(img) {
  // 如果悬浮按钮被禁用，则不添加按钮
  if (!floatButtonEnabled) return;
  
  // 跳过太小的图片（例如小于50x50像素）
  if (img.width < 50 || img.height < 50) {
    return;
  }

  // 检查是否已有OCR按钮
  const existingButton = img.nextElementSibling;
  if (existingButton && existingButton.classList.contains('ocr-float-button')) {
    return;
  }

  // 创建OCR浮动按钮
  const ocrButton = document.createElement('div');
  ocrButton.className = 'ocr-float-button';
  
  // 使用SVG图标
  const svgURL = chrome.runtime.getURL('images/icon.svg');
  ocrButton.innerHTML = `<img src="${svgURL}" class="ocr-icon" alt="OCR">`;
  
  // 添加提示文字元素
  const tooltip = document.createElement('div');
  tooltip.className = 'ocr-tooltip';
  tooltip.textContent = 'OCR识别图片';
  ocrButton.appendChild(tooltip);
  
  // 设置按钮的样式
  ocrButton.style.cssText = `
    position: absolute;
    bottom: 10px;
    left: 10px;
    background-color: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 5px;
    border-radius: 50%;
    font-size: 12px;
    cursor: pointer;
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.3s ease;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // 设置图片容器的相对定位，以便正确放置OCR按钮
  const imgStyle = window.getComputedStyle(img);
  const imgParent = img.parentNode;
  
  // 创建一个包装容器
  const wrapper = document.createElement('div');
  wrapper.className = 'ocr-img-wrapper';
  wrapper.style.cssText = `
    position: relative;
    display: inline-block;
    width: ${img.width}px;
    height: ${img.height}px;
    margin: ${imgStyle.margin};
    padding: ${imgStyle.padding};
  `;

  // 将图片替换为包装的图片和按钮
  imgParent.insertBefore(wrapper, img);
  wrapper.appendChild(img);
  wrapper.appendChild(ocrButton);

  // 鼠标悬停时显示OCR按钮
  wrapper.addEventListener('mouseenter', function() {
    ocrButton.style.opacity = '1';
  });

  wrapper.addEventListener('mouseleave', function() {
    ocrButton.style.opacity = '0';
  });

  // 判断按钮位置并设置tooltip方向
  ocrButton.addEventListener('mouseenter', function() {
    // 获取按钮相对于图片的位置
    const buttonRect = ocrButton.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    
    // 清除所有可能的方向类
    tooltip.classList.remove('tooltip-top', 'tooltip-right', 'tooltip-bottom', 'tooltip-left');
    
    // 判断按钮位置并设置tooltip方向
    // 默认是从底部显示(tooltip-top)，但如果按钮靠近底部，则从顶部显示
    if (buttonRect.top - wrapperRect.top < 40) {
      // 按钮靠近图片顶部，tooltip向下显示
      tooltip.classList.add('tooltip-bottom');
    } else if (wrapperRect.right - buttonRect.right < 40) {
      // 按钮靠近图片右边，tooltip向左显示
      tooltip.classList.add('tooltip-left');
    } else if (buttonRect.right - wrapperRect.left < 40) {
      // 按钮靠近图片左边，tooltip向右显示
      tooltip.classList.add('tooltip-right');
    } else {
      // 默认向上显示
      tooltip.classList.add('tooltip-top');
    }
  });

  // 点击OCR按钮时处理图片
  ocrButton.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    processImage(img.src);
  });
}

// 监听存储变化，实时更新悬浮按钮状态
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (changes.enableFloatButton && namespace === 'sync') {
    const newValue = changes.enableFloatButton.newValue;
    floatButtonEnabled = newValue !== false;
    
    // 如果禁用了按钮，移除所有现有按钮
    if (!floatButtonEnabled) {
      removeAllOcrButtons();
    } else {
      // 如果启用了按钮，重新添加按钮到所有图片
      addOcrButtonsToImages();
    }
  }
});

// 移除所有OCR按钮
function removeAllOcrButtons() {
  // 移除所有OCR包装器和按钮
  const wrappers = document.querySelectorAll('.ocr-img-wrapper');
  wrappers.forEach(wrapper => {
    // 获取图片元素
    const img = wrapper.querySelector('img');
    if (img) {
      // 将图片移回原位置
      wrapper.parentNode.insertBefore(img, wrapper);
    }
    // 移除包装器
    wrapper.parentNode.removeChild(wrapper);
  });
}

// 处理图片OCR
function processImage(imageUrl) {
  // 显示持续性加载中通知
  showNotification('正在识别图片中的文字...', 'ocr-processing-notification', true);
  
  // 发送消息到background script处理OCR
  chrome.runtime.sendMessage({
    action: "processImage",
    imageUrl: imageUrl
  });
}

// 显示OCR结果
function showOcrResult(text) {
  // 移除之前的结果框
  removeExistingResultBox();
  
  // 创建结果显示框
  const resultBox = document.createElement('div');
  resultBox.id = 'ocr-result-box';
  resultBox.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 300px;
    max-height: 400px;
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 5px;
    padding: 15px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    overflow-y: auto;
    font-family: Arial, sans-serif;
  `;
  
  // 添加标题
  const title = document.createElement('h3');
  title.textContent = 'OCR识别结果';
  title.style.cssText = `
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 16px;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
  `;
  resultBox.appendChild(title);
  
  // 添加关闭按钮
  const closeButton = document.createElement('span');
  closeButton.textContent = '×';
  closeButton.style.cssText = `
    position: absolute;
    top: 10px;
    right: 15px;
    font-size: 18px;
    cursor: pointer;
    color: #999;
  `;
  closeButton.addEventListener('click', () => {
    document.body.removeChild(resultBox);
  });
  resultBox.appendChild(closeButton);
  
  // 添加复制按钮
  const copyButton = document.createElement('button');
  copyButton.textContent = '复制文本';
  copyButton.style.cssText = `
    background-color: #4285f4;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    margin-bottom: 10px;
    font-size: 12px;
  `;
  copyButton.addEventListener('click', () => {
    navigator.clipboard.writeText(text)
      .then(() => {
        copyButton.textContent = '已复制!';
        setTimeout(() => {
          copyButton.textContent = '复制文本';
        }, 2000);
      })
      .catch(err => {
        console.error('复制失败: ', err);
      });
  });
  resultBox.appendChild(copyButton);
  
  // 添加文本内容
  const textContent = document.createElement('div');
  
  // 处理文本显示
  if (!text || text === '(未识别到文本)') {
    textContent.textContent = '(未识别到文本)';
  } else {
    // 显示识别的文本内容
    textContent.textContent = text;
    
    // 如果是验证码类型，添加特殊样式
    if (text.length < 10) {
      textContent.style.fontSize = '24px';
      textContent.style.fontWeight = 'bold';
      textContent.style.textAlign = 'center';
      textContent.style.letterSpacing = '2px';
    }
  }
  
  textContent.style.cssText += `
    margin-top: 10px;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 300px;
    overflow-y: auto;
    font-size: 14px;
    background-color: #f9f9f9;
    padding: 8px;
    border-radius: 4px;
  `;
  resultBox.appendChild(textContent);
  
  // 添加到页面
  document.body.appendChild(resultBox);
  
  // 允许拖动结果框
  makeElementDraggable(resultBox, title);
}

// 移除已存在的结果框
function removeExistingResultBox() {
  const existingBox = document.getElementById('ocr-result-box');
  if (existingBox) {
    document.body.removeChild(existingBox);
  }
}

// 显示通知消息
function showNotification(message, notificationId = null, persistent = false) {
  // 如果提供了ID且通知已存在，则更新内容
  const existingNotification = notificationId ? document.getElementById(notificationId) : null;
  
  if (existingNotification) {
    existingNotification.textContent = message;
    return;
  }
  
  const notification = document.createElement('div');
  
  // 如果提供了ID，设置元素ID
  if (notificationId) {
    notification.id = notificationId;
  }
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 10px 20px;
    background-color: #333;
    color: white;
    border-radius: 4px;
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  `;
  
  if (persistent) {
    // 为持续性通知添加加载动画
    const spinnerElement = document.createElement('div');
    spinnerElement.className = 'ocr-spinner';
    spinnerElement.style.cssText = `
      display: inline-block;
      width: 12px;
      height: 12px;
      margin-right: 8px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: ocr-spin 1s linear infinite;
    `;
    
    notification.appendChild(spinnerElement);
    
    const textElement = document.createElement('span');
    textElement.textContent = message;
    notification.appendChild(textElement);
  } else {
    notification.textContent = message;
  }
  
  document.body.appendChild(notification);
  
  // 如果不是持续显示的通知，设置自动消失
  if (!persistent) {
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 500);
    }, 3000);
  }
}

// 移除特定ID的通知
function removeNotification(notificationId) {
  const notification = document.getElementById(notificationId);
  if (notification) {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 500);
  }
}

// 使元素可拖动
function makeElementDraggable(element, dragHandle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  dragHandle.style.cursor = 'move';
  dragHandle.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // 获取鼠标光标的起始位置
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // 当鼠标移动时调用函数
    document.onmousemove = elementDrag;
  }
  
  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // 计算新位置
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // 设置元素的新位置
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }
  
  function closeDragElement() {
    // 停止移动
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// 添加自定义样式到页面
function addCustomStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .ocr-img-wrapper {
      position: relative;
      display: inline-block;
    }
    .ocr-float-button {
      position: absolute;
      bottom: 10px;
      left: 10px;
      background-color: rgba(0, 0, 0, 0.6);
      color: white;
      padding: 5px;
      border-radius: 50%;
      cursor: pointer;
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.3s ease;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ocr-float-button:hover {
      background-color: rgba(0, 0, 0, 0.8);
    }
    .ocr-img-wrapper:hover .ocr-float-button {
      opacity: 1;
    }
    .ocr-icon {
      width: 16px;
      height: 16px;
      filter: invert(1);
    }
    .ocr-tooltip {
      position: absolute;
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      visibility: hidden;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
    }
    .ocr-float-button:hover .ocr-tooltip {
      visibility: visible;
      opacity: 1;
    }
    
    /* 向上显示的tooltip（默认） */
    .ocr-tooltip.tooltip-top {
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 5px;
    }
    .ocr-tooltip.tooltip-top::after {
      content: "";
      position: absolute;
      top: 100%;
      left: 50%;
      margin-left: -5px;
      border-width: 5px;
      border-style: solid;
      border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
    }
    
    /* 向右显示的tooltip */
    .ocr-tooltip.tooltip-right {
      left: 100%;
      top: 50%;
      transform: translateY(-50%);
      margin-left: 5px;
    }
    .ocr-tooltip.tooltip-right::after {
      content: "";
      position: absolute;
      top: 50%;
      right: 100%;
      margin-top: -5px;
      border-width: 5px;
      border-style: solid;
      border-color: transparent rgba(0, 0, 0, 0.8) transparent transparent;
    }
    
    /* 向下显示的tooltip */
    .ocr-tooltip.tooltip-bottom {
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-top: 5px;
    }
    .ocr-tooltip.tooltip-bottom::after {
      content: "";
      position: absolute;
      bottom: 100%;
      left: 50%;
      margin-left: -5px;
      border-width: 5px;
      border-style: solid;
      border-color: transparent transparent rgba(0, 0, 0, 0.8) transparent;
    }
    
    /* 向左显示的tooltip */
    .ocr-tooltip.tooltip-left {
      right: 100%;
      top: 50%;
      transform: translateY(-50%);
      margin-right: 5px;
    }
    .ocr-tooltip.tooltip-left::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 100%;
      margin-top: -5px;
      border-width: 5px;
      border-style: solid;
      border-color: transparent transparent transparent rgba(0, 0, 0, 0.8);
    }
    
    /* 添加加载动画 */
    @keyframes ocr-spin {
      to { transform: rotate(360deg); }
    }
    .ocr-spinner {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: ocr-spin 1s linear infinite;
    }
  `;
  document.head.appendChild(styleElement);
}

// 添加自定义样式
addCustomStyles();
