// 接收来自background script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "showOcrResult") {
    // 显示OCR结果
    showOcrResult(message.result);
  } else if (message.action === "showNotification") {
    // 显示通知消息
    showNotification(message.message);
  }
});

// 当页面加载完成后，添加悬浮OCR按钮到所有图片
document.addEventListener('DOMContentLoaded', addOcrButtonsToImages);
window.addEventListener('load', addOcrButtonsToImages);

// 页面动态变化时也添加按钮（使用MutationObserver监听DOM变化）
const observer = new MutationObserver((mutations) => {
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
  const images = document.querySelectorAll('img');
  images.forEach(img => addOcrButtonToImage(img));
}

// 为单个图片添加OCR按钮
function addOcrButtonToImage(img) {
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

  // 点击OCR按钮时处理图片
  ocrButton.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    processImage(img.src);
  });
}

// 处理图片OCR
function processImage(imageUrl) {
  // 显示加载中通知
  showNotification('正在识别图片中的文字...');
  
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
function showNotification(message) {
  const notification = document.createElement('div');
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
  notification.textContent = message;
  document.body.appendChild(notification);
  
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
  `;
  document.head.appendChild(styleElement);
}

// 添加自定义样式
addCustomStyles();
