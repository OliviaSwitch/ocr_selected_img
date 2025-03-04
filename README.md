# OCR Selected Image - Chrome 插件

这是一个Chrome插件，用于识别网页上选中图片中的文字。

## 功能

- 右键点击网页上的图片，选择"OCR识别此图片"
- 图片左下角显示悬浮OCR按钮，鼠标悬停时显示，点击可直接识别
- 将图片URL发送到指定的OCR API进行文字识别
- 在页面上显示识别结果
- 支持复制识别的文字
- 支持自定义OCR API地址和Cookie认证

## 安装方法

1. 下载或克隆此代码库到本地
2. 打开Chrome浏览器，进入"扩展程序"页面
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择包含本插件代码的文件夹

## 使用方法

1. 安装插件后，点击插件图标进行设置
2. 输入OCR API地址（默认已填写）和自定义Cookie
3. 在网页上使用任意以下方式进行OCR识别:
   - 右键点击图片，选择"OCR识别此图片"选项
   - 将鼠标悬停在图片上，点击左下角出现的OCR按钮
4. 几秒钟后会在页面右上角显示识别结果
5. 可以直接复制识别文本或关闭结果框

## OCR API说明

本插件已适配 [ocr-based-qwen](https://github.com/Cunninger/ocr-based-qwen) 项目。

该项目提供了基于通义千问的OCR识别服务，可以识别图片中的文本内容。请参考该项目的说明文档进行部署和获取Cookie值。

## 常见问题

**Q: 插件无法正常工作**
A: 请确认已正确设置API地址，且自定义Cookie是有效的。

**Q: 识别结果不准确**
A: OCR识别准确度取决于所使用的OCR API服务以及图片质量。

**Q: 如何获取自定义Cookie?**
A: 请参考 [ocr-based-qwen](https://github.com/Cunninger/ocr-based-qwen) 项目说明获取有效的Cookie值。

**Q: 如何禁用悬浮OCR按钮?**
A: 在插件设置中取消勾选"启用图片悬浮OCR按钮"选项。

## 隐私说明

本插件会将所选图片的URL发送到您指定的OCR API服务。插件本身不会收集或存储您的图片内容。请确保您使用的API服务符合您的隐私要求。

## 许可证

MIT
