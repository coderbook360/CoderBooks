# 章节写作指导：图像绘制与处理

## 1. 章节信息

- **章节标题**: 图像绘制与处理
- **文件名**: drawing/image-drawing.md
- **所属部分**: 第二部分：图形绘制详解
- **预计阅读时间**: 30分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 掌握 drawImage() 方法的三种调用形式
- 理解可作为图像源的对象类型
- 掌握图像的缩放、裁剪和绘制
- 理解图像加载的异步特性

### 技能目标
- 能够在 Canvas 上绑制各种图像源
- 能够实现图像的缩放和裁剪
- 能够正确处理图像加载时机
- 能够实现 Sprite Sheet 动画

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **drawImage** | 详解三种参数形式：3参、5参、9参 |
| **CanvasImageSource** | 可用作图像源的类型：img, video, canvas, ImageBitmap 等 |
| **源矩形与目标矩形** | 9参数形式中的源区域和目标区域 |
| **异步加载** | 图像加载完成后才能绘制 |

### 关键知识点

- drawImage(image, dx, dy)：基本绘制
- drawImage(image, dx, dy, dWidth, dHeight)：缩放绘制
- drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)：裁剪绘制
- 图像加载事件：onload, onerror
- 使用 Image 对象动态加载图像
- 使用其他 Canvas 作为图像源

### 边界与限制

- 跨域图像的安全限制
- 图像未加载完成时绘制的问题
- 大图像的内存占用
- 视频帧作为图像源的时机

## 4. 写作要求

### 开篇方式
从实际需求引入：在游戏开发或应用中，我们经常需要在 Canvas 上显示图片、播放精灵动画，或者将用户上传的照片进行处理。这些都依赖于 drawImage() 方法。

### 结构组织

```
1. drawImage 基础
   - 基本用法（3参数）
   - 图像定位
   
2. 图像缩放
   - 缩放绘制（5参数）
   - 保持宽高比
   - 缩放算法与质量
   
3. 图像裁剪
   - 裁剪绘制（9参数）
   - 参数含义详解
   - 源矩形与目标矩形
   
4. 图像源类型
   - HTMLImageElement
   - HTMLCanvasElement
   - HTMLVideoElement
   - ImageBitmap
   - OffscreenCanvas
   
5. 图像加载处理
   - 使用 onload 事件
   - Promise 封装
   - 错误处理
   
6. 实践应用
   - Sprite Sheet 精灵动画
   - 图像预加载器
   - 缩略图生成
   
7. 本章小结
```

### 代码示例

1. **三种 drawImage 形式对比**
2. **等比例缩放图像**
3. **图像裁剪显示**
4. **Promise 封装图像加载**
5. **Sprite Sheet 动画播放**
6. **多图像预加载器**

### 图表需求

- **9参数示意图**：展示源矩形和目标矩形的对应关系
- **Sprite Sheet 示意图**：展示如何从精灵表中提取单帧

## 5. 技术细节

### 实现要点

```javascript
// 基本绘制
const img = new Image();
img.onload = () => {
  ctx.drawImage(img, 0, 0);
};
img.src = 'image.png';

// Promise 封装图像加载
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// 等比例缩放
function drawImageContain(ctx, img, x, y, maxWidth, maxHeight) {
  const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
  const width = img.width * ratio;
  const height = img.height * ratio;
  ctx.drawImage(img, x, y, width, height);
}

// Sprite Sheet 动画
class SpriteAnimation {
  constructor(image, frameWidth, frameHeight, frameCount) {
    this.image = image;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.frameCount = frameCount;
    this.currentFrame = 0;
  }
  
  draw(ctx, x, y) {
    const sx = this.currentFrame * this.frameWidth;
    ctx.drawImage(
      this.image,
      sx, 0, this.frameWidth, this.frameHeight,
      x, y, this.frameWidth, this.frameHeight
    );
  }
  
  nextFrame() {
    this.currentFrame = (this.currentFrame + 1) % this.frameCount;
  }
}

// 多图像预加载
function preloadImages(sources) {
  return Promise.all(sources.map(loadImage));
}
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 图像不显示 | 确保在 onload 事件后绑制 |
| 图像模糊 | 检查缩放比例和 imageSmoothingEnabled |
| 跨域图像无法操作像素 | 设置 crossOrigin 属性并确保服务器支持 CORS |
| 视频帧不更新 | 每帧都需要重新调用 drawImage |

## 6. 风格指导

### 语气语调
- 实践导向，注重实际应用场景
- 强调异步处理的重要性

### 类比方向
- 9参数类比"从杂志上剪下一块贴到画布上"
- 图像加载类比"网络请求"

## 7. 与其他章节的关系

### 前置依赖
- 第3章：绘制上下文与状态管理

### 后续章节铺垫
- 为第10章"图像处理算法"提供图像绑制基础
- 为第30章"离屏 Canvas 与缓存优化"提供 Canvas 作为图像源的概念

## 8. 章节检查清单

- [ ] 目标明确：读者能正确绘制和处理图像
- [ ] 术语统一：图像源、源矩形、目标矩形等术语定义清晰
- [ ] 最小实现：提供图像加载、缩放、动画的实用函数
- [ ] 边界处理：说明加载时机和跨域问题
- [ ] 性能与权衡：提及大图像内存问题
- [ ] 图示与代码：参数示意图与代码对应
- [ ] 总结与练习：提供图像处理练习
