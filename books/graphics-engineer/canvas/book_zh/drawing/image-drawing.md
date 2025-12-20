# 图像绘制与处理

在前面的章节中，我们学会了绘制基础图形、路径和文本。但在实际应用中，我们还需要处理一个重要的内容类型：图像。无论是游戏角色的精灵图、照片编辑器中的图片，还是数据可视化中的图标，都需要我们掌握图像的绘制技术。

思考一下这些场景：如何在 Canvas 上显示一张照片？如何实现游戏中的精灵动画？如何裁剪图像的特定区域？这些都依赖于一个核心方法：`drawImage()`。

本章将从实际需求出发，逐步解答以下核心问题：
- `drawImage()` 有哪几种调用方式？它们的区别是什么？
- 如何缩放图像而不失真？如何保持宽高比？
- 如何裁剪图像的特定区域？9个参数分别代表什么？
- 哪些对象可以作为图像源？Canvas、Video 也可以吗？
- 如何正确处理图像加载？异步加载有什么坑？

---

## drawImage 基础：三种调用形式

首先要问一个问题：**`drawImage()` 有哪些调用方式？**

`drawImage()` 方法有三种参数形式，从简单到复杂，功能逐步增强：

### 形式一：基本绘制（3参数）

```javascript
ctx.drawImage(image, dx, dy);
```

这是最简单的形式，将图像绘制到指定位置：
- `image`：图像源对象
- `dx, dy`：图像左上角在 Canvas 上的坐标

```javascript
const img = new Image();
img.onload = () => {
  ctx.drawImage(img, 50, 50);
};
img.src = 'photo.jpg';
```

图像会以原始尺寸绘制，左上角位于 (50, 50)。

### 形式二：缩放绘制（5参数）

```javascript
ctx.drawImage(image, dx, dy, dWidth, dHeight);
```

在基本形式上增加了目标宽高，可以缩放图像：
- `dWidth, dHeight`：图像在 Canvas 上的宽度和高度

```javascript
img.onload = () => {
  // 将图像缩放到 200x150
  ctx.drawImage(img, 50, 50, 200, 150);
};
```

如果目标尺寸与原始尺寸比例不同，图像会被拉伸或压缩。

### 形式三：裁剪绘制（9参数）

```javascript
ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
```

这是最强大的形式，可以裁剪图像的一部分并绘制：
- `sx, sy`：源图像裁剪区域的左上角坐标
- `sWidth, sHeight`：源图像裁剪区域的宽高
- `dx, dy`：目标位置的左上角坐标
- `dWidth, dHeight`：目标区域的宽高

```javascript
img.onload = () => {
  // 从原图 (100, 100) 位置裁剪 200x200 区域
  // 绘制到 Canvas 的 (50, 50) 位置，缩放为 150x150
  ctx.drawImage(img, 100, 100, 200, 200, 50, 50, 150, 150);
};
```

这就像"从杂志上剪下一块，贴到画布上"。

---

## 图像缩放：保持宽高比

现在我要问第二个问题：**如何缩放图像而不失真？**

直接指定目标宽高可能导致图像变形。在实践中，我们通常需要**保持宽高比**缩放。

### 等比例缩放：contain 模式

类似 CSS 的 `object-fit: contain`，图像完整显示在目标区域内：

```javascript
function drawImageContain(ctx, img, x, y, maxWidth, maxHeight) {
  // 计算缩放比例（取较小值，确保完整显示）
  const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
  const width = img.width * ratio;
  const height = img.height * ratio;
  
  // 居中绘制
  const offsetX = (maxWidth - width) / 2;
  const offsetY = (maxHeight - height) / 2;
  
  ctx.drawImage(img, x + offsetX, y + offsetY, width, height);
}

// 使用
img.onload = () => {
  drawImageContain(ctx, img, 0, 0, 400, 300);
};
```

### 等比例缩放：cover 模式

类似 CSS 的 `object-fit: cover`，图像填满目标区域，可能被裁剪：

```javascript
function drawImageCover(ctx, img, x, y, width, height) {
  // 计算缩放比例（取较大值，确保填满）
  const ratio = Math.max(width / img.width, height / img.height);
  const scaledWidth = img.width * ratio;
  const scaledHeight = img.height * ratio;
  
  // 计算居中裁剪的源区域
  const sx = (img.width - width / ratio) / 2;
  const sy = (img.height - height / ratio) / 2;
  const sWidth = width / ratio;
  const sHeight = height / ratio;
  
  ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, width, height);
}

// 使用
img.onload = () => {
  drawImageCover(ctx, img, 0, 0, 400, 300);
};
```

### 图像缩放质量

Canvas 提供了 `imageSmoothingEnabled` 属性控制缩放算法：

```javascript
// 启用平滑缩放（默认）
ctx.imageSmoothingEnabled = true;

// 禁用平滑缩放（像素风格）
ctx.imageSmoothingEnabled = false;

ctx.drawImage(img, 0, 0, 200, 200);
```

禁用平滑缩放适合像素艺术风格的游戏，启用则适合照片缩放。

---

## 图像裁剪：精确控制源区域

现在我要问第三个问题：**如何裁剪图像的特定区域？**

9参数形式的 `drawImage()` 可以精确控制从源图像裁剪哪一部分，以及如何绘制到目标位置。

### 参数详解

```
drawImage(
  image,
  sx, sy, sWidth, sHeight,  // 源矩形
  dx, dy, dWidth, dHeight   // 目标矩形
);
```

- **源矩形**：在原始图像上的裁剪区域
- **目标矩形**：在 Canvas 上的绘制区域

### 实现圆形头像裁剪

结合裁剪路径，实现圆形头像效果：

```javascript
function drawCircularAvatar(ctx, img, cx, cy, radius) {
  ctx.save();
  
  // 创建圆形裁剪路径
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  
  // 计算图像裁剪区域（居中正方形）
  const size = Math.min(img.width, img.height);
  const sx = (img.width - size) / 2;
  const sy = (img.height - size) / 2;
  
  // 绘制图像
  ctx.drawImage(
    img,
    sx, sy, size, size,
    cx - radius, cy - radius, radius * 2, radius * 2
  );
  
  ctx.restore();
  
  // 添加圆形描边
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#ecf0f1';
  ctx.lineWidth = 4;
  ctx.stroke();
}

// 使用
img.onload = () => {
  drawCircularAvatar(ctx, img, 150, 150, 100);
};
```

---

## 图像源类型：不只是 Image

现在我要问第四个问题：**哪些对象可以作为 `drawImage()` 的图像源？**

Canvas 支持多种类型的图像源（`CanvasImageSource`）：

### HTMLImageElement

最常用的图像源，通过 `new Image()` 或 `document.querySelector('img')` 获取：

```javascript
const img = new Image();
img.onload = () => {
  ctx.drawImage(img, 0, 0);
};
img.src = 'photo.jpg';
```

### HTMLCanvasElement

一个 Canvas 可以作为另一个 Canvas 的图像源：

```javascript
const offCanvas = document.createElement('canvas');
const offCtx = offCanvas.getContext('2d');
offCanvas.width = 200;
offCanvas.height = 200;

// 在离屏 Canvas 上绘制
offCtx.fillStyle = '#3498db';
offCtx.fillRect(0, 0, 200, 200);
offCtx.fillStyle = 'white';
offCtx.font = 'bold 48px Arial';
offCtx.textAlign = 'center';
offCtx.textBaseline = 'middle';
offCtx.fillText('Hello', 100, 100);

// 将离屏 Canvas 作为图像源
ctx.drawImage(offCanvas, 50, 50);
```

这在缓存复杂图形时非常有用。

### HTMLVideoElement

视频元素也可以作为图像源，获取当前帧：

```javascript
const video = document.querySelector('video');

function drawFrame() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  requestAnimationFrame(drawFrame);
}

video.addEventListener('play', () => {
  drawFrame();
});
```

这可以实现视频滤镜、截图等功能。

### ImageBitmap

`ImageBitmap` 是一种优化的图像格式，适合高性能渲染：

```javascript
const img = new Image();
img.onload = async () => {
  const bitmap = await createImageBitmap(img);
  ctx.drawImage(bitmap, 0, 0);
};
img.src = 'photo.jpg';
```

### OffscreenCanvas

在 Worker 中使用的离屏 Canvas：

```javascript
const offscreen = new OffscreenCanvas(200, 200);
const offCtx = offscreen.getContext('2d');
offCtx.fillStyle = '#e74c3c';
offCtx.fillRect(0, 0, 200, 200);

ctx.drawImage(offscreen, 0, 0);
```

---

## 图像加载处理：异步的艺术

现在我要问第五个问题：**如何正确处理图像加载？**

图像加载是**异步**的，必须等待加载完成才能绘制。

### 使用 onload 事件

```javascript
const img = new Image();

img.onload = () => {
  console.log('图像加载成功');
  ctx.drawImage(img, 0, 0);
};

img.onerror = () => {
  console.error('图像加载失败');
};

img.src = 'photo.jpg';
```

### Promise 封装

将图像加载封装为 Promise，方便使用：

```javascript
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

// 使用 async/await
async function drawPhoto() {
  try {
    const img = await loadImage('photo.jpg');
    ctx.drawImage(img, 0, 0);
  } catch (error) {
    console.error(error);
  }
}

drawPhoto();
```

### 多图像预加载

游戏或应用启动时，通常需要预加载多张图像：

```javascript
function preloadImages(sources) {
  return Promise.all(sources.map(loadImage));
}

// 使用
async function init() {
  const images = await preloadImages([
    'character.png',
    'background.jpg',
    'item1.png',
    'item2.png'
  ]);
  
  console.log('所有图像加载完成');
  // 开始渲染
  render(images);
}

init();
```

### 带进度的预加载器

```javascript
function preloadImagesWithProgress(sources, onProgress) {
  let loaded = 0;
  const total = sources.length;
  
  const promises = sources.map(src => {
    return loadImage(src).then(img => {
      loaded++;
      if (onProgress) {
        onProgress(loaded / total, loaded, total);
      }
      return img;
    });
  });
  
  return Promise.all(promises);
}

// 使用
preloadImagesWithProgress(
  ['img1.png', 'img2.png', 'img3.png'],
  (progress, loaded, total) => {
    console.log(`加载进度: ${Math.round(progress * 100)}% (${loaded}/${total})`);
  }
).then(images => {
  console.log('全部加载完成');
});
```

---

## 实践应用：Sprite Sheet 精灵动画

精灵图（Sprite Sheet）将多帧动画图像合并到一张图中，通过裁剪不同区域实现动画效果。

### 简单的精灵动画

```javascript
class SpriteAnimation {
  constructor(image, frameWidth, frameHeight, frameCount) {
    this.image = image;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.frameCount = frameCount;
    this.currentFrame = 0;
  }
  
  draw(ctx, x, y) {
    // 计算当前帧在精灵图中的位置
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
  
  setFrame(index) {
    this.currentFrame = index % this.frameCount;
  }
}

// 使用
const spriteImg = await loadImage('character-walk.png');
const sprite = new SpriteAnimation(spriteImg, 64, 64, 8);

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  sprite.draw(ctx, 100, 100);
  sprite.nextFrame();
  setTimeout(() => requestAnimationFrame(animate), 100);
}

animate();
```

### 二维精灵图

当精灵图有多行时：

```javascript
class Sprite2D {
  constructor(image, frameWidth, frameHeight, cols, rows) {
    this.image = image;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.cols = cols;
    this.rows = rows;
  }
  
  drawFrame(ctx, frameIndex, x, y) {
    const col = frameIndex % this.cols;
    const row = Math.floor(frameIndex / this.cols);
    
    const sx = col * this.frameWidth;
    const sy = row * this.frameHeight;
    
    ctx.drawImage(
      this.image,
      sx, sy, this.frameWidth, this.frameHeight,
      x, y, this.frameWidth, this.frameHeight
    );
  }
}

// 使用
const sprite = new Sprite2D(spriteImg, 32, 32, 10, 5);
sprite.drawFrame(ctx, 23, 100, 100);  // 绘制第24帧
```

---

## 工程实践：图像加载的错误处理与安全性

在实际项目中，图像加载不总是顺利的。网络问题、跨域限制、文件不存在等都可能导致失败。让我们学习如何编写健壮的图像加载代码。

### 实战案例1：完善的图像加载

#### 问题
简单的`img.onload`无法处理加载失败、超时等情况。

#### 生产级实现

```javascript
/**
 * 加载单张图像（Promise版本）
 * @param {string} src - 图像URL
 * @param {number} timeout - 超时时间（毫秒）
 * @return {Promise<HTMLImageElement>}
 */
function loadImage(src, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let timeoutId = null;
    
    // 成功回调
    const onLoad = () => {
      clearTimeout(timeoutId);
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
      resolve(img);
    };
    
    // 失败回调
    const onError = (event) => {
      clearTimeout(timeoutId);
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
      reject(new Error(`Failed to load image: ${src}`));
    };
    
    // 超时处理
    timeoutId = setTimeout(() => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
      reject(new Error(`Image load timeout: ${src}`));
    }, timeout);
    
    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
    img.src = src;
  });
}

// 使用示例
async function drawImageSafely(ctx, src, x, y) {
  try {
    const img = await loadImage(src, 5000);
    ctx.drawImage(img, x, y);
    console.log('Image loaded successfully');
  } catch (error) {
    console.error('Image load failed:', error.message);
    // 绘制占位图
    drawPlaceholder(ctx, x, y, 200, 150);
  }
}

// 占位图绘制
function drawPlaceholder(ctx, x, y, width, height) {
  ctx.save();
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(x, y, width, height);
  
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y + height);
  ctx.moveTo(x + width, y);
  ctx.lineTo(x, y + height);
  ctx.stroke();
  
  ctx.fillStyle = '#666';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('加载失败', x + width / 2, y + height / 2);
  ctx.restore();
}
```

---

### 实战案例2：跨域图像处理

#### 问题
当Canvas包含跨域图像时，`getImageData()`会抛出安全错误。

#### 原因分析

浏览器的同源策略：一旦Canvas绘制了跨域图像，就被"污染"（tainted），无法读取像素数据。

```javascript
// ❌ 错误示例
const img = new Image();
img.src = 'https://other-domain.com/image.png';
img.onload = () => {
  ctx.drawImage(img, 0, 0);
  
  // 抛出错误：SecurityError
  const imageData = ctx.getImageData(0, 0, 100, 100);
};
```

#### 解决方案

**方案1：CORS（推荐）**

```javascript
/**
 * 加载启用CORS的图像
 * @param {string} src - 图像URL（需要服务器支持CORS）
 * @param {boolean} withCredentials - 是否携带凭证
 * @return {Promise<HTMLImageElement>}
 */
function loadImageWithCORS(src, withCredentials = false) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // 关键：启用CORS
    img.crossOrigin = withCredentials ? 'use-credentials' : 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

// 使用
try {
  const img = await loadImageWithCORS('https://other-domain.com/image.png');
  ctx.drawImage(img, 0, 0);
  
  // 现在可以安全地读取像素
  const imageData = ctx.getImageData(0, 0, 100, 100);
} catch (error) {
  console.error(error);
}
```

**注意**：服务器必须设置正确的CORS头：
```
Access-Control-Allow-Origin: *
# 或指定域名
Access-Control-Allow-Origin: https://your-domain.com
```

**方案2：服务器代理**

```javascript
/**
 * 通过服务器代理加载图像
 * @param {string} externalUrl - 外部图像URL
 * @return {Promise<HTMLImageElement>}
 */
function loadImageViaProxy(externalUrl) {
  // 通过自己的服务器代理
  const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(externalUrl)}`;
  return loadImage(proxyUrl);
}

// 服务器端（Node.js示例）
app.get('/api/proxy-image', async (req, res) => {
  const imageUrl = req.query.url;
  const response = await fetch(imageUrl);
  const buffer = await response.buffer();
  res.setHeader('Content-Type', response.headers.get('content-type'));
  res.send(buffer);
});
```

**方案3：检测Canvas状态**

```javascript
/**
 * 安全地获取图像数据
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y  
 * @param {number} w
 * @param {number} h
 * @return {ImageData|null}
 */
function safeGetImageData(ctx, x, y, w, h) {
  try {
    return ctx.getImageData(x, y, w, h);
  } catch (e) {
    if (e.name === 'SecurityError') {
      console.warn('Canvas被跨域图像污染，无法读取像素数据');
      return null;
    }
    throw e;
  }
}

// 使用
const imageData = safeGetImageData(ctx, 0, 0, 100, 100);
if (imageData) {
  // 处理像素数据
  processPixels(imageData);
} else {
  // 禁用需要像素读取的功能
  showWarning('部分功能不可用：图像来自外部域名');
}
```

---

### 实战案例3：批量图像加载与进度

#### 需求
预加载多张图像，显示加载进度。

#### 实现

```javascript
/**
 * 批量加载图像
 * @param {string[]} urls - 图像URL数组
 * @param {Function} onProgress - 进度回调(loaded, total)
 * @return {Promise<Map<string, HTMLImageElement>>}
 */
async function loadMultipleImages(urls, onProgress) {
  const images = new Map();
  let loaded = 0;
  const total = urls.length;
  
  const promises = urls.map(url => 
    loadImage(url)
      .then(img => {
        images.set(url, img);
        loaded++;
        if (onProgress) {
          onProgress(loaded, total);
        }
      })
      .catch(error => {
        console.error(`Failed to load ${url}:`, error);
        loaded++;
        if (onProgress) {
          onProgress(loaded, total);
        }
      })
  );
  
  await Promise.all(promises);
  return images;
}

// 使用示例
const urls = [
  'img1.jpg',
  'img2.jpg',
  'img3.jpg',
  'https://cdn.example.com/img4.jpg'
];

const images = await loadMultipleImages(urls, (loaded, total) => {
  const percent = Math.floor((loaded / total) * 100);
  console.log(`加载进度: ${percent}%`);
  updateProgressBar(percent);
});

// 所有图像加载完成
images.forEach((img, url) => {
  if (img) {
    ctx.drawImage(img, x, y);
    x += 220;
  }
});
```

---

### 实战案例4：图像加载重试机制

#### 实现

```javascript
/**
 * 带重试的图像加载
 * @param {string} src - 图像URL
 * @param {number} maxRetries - 最大重试次数
 * @param {number} retryDelay - 重试延迟（毫秒）
 * @return {Promise<HTMLImageElement>}
 */
async function loadImageWithRetry(src, maxRetries = 3, retryDelay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retrying image load (${attempt}/${maxRetries}): ${src}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
      
      return await loadImage(src);
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) {
        throw new Error(`Failed to load after ${maxRetries} retries: ${src}`);
      }
    }
  }
}

// 使用
try {
  const img = await loadImageWithRetry('unstable-api.com/image.jpg', 3);
  ctx.drawImage(img, 0, 0);
} catch (error) {
  console.error(error.message);
  drawPlaceholder(ctx, 0, 0, 200, 150);
}
```

---

### 最佳实践总结

**图像加载清单**：
- ✅ 始终处理`onerror`事件
- ✅ 设置合理的超时时间
- ✅ 跨域图像设置`crossOrigin`
- ✅ 提供加载失败的占位图
- ✅ 批量加载时显示进度
- ✅ 关键图像实现重试机制
- ✅ 清理事件监听器，避免内存泄漏

**性能优化**：
- 图像预加载（在需要前提前加载）
- 使用CDN加速
- 合理使用图像压缩
- 考虑使用WebP等现代格式
- 大图使用懒加载

**安全考虑**：
- 验证图像来源
- 使用HTTPS传输
- 正确配置CORS
- 用户上传图像需要验证和清洗

---

## 本章小结

本章我们深入探讨了 Canvas 的图像绘制技术，核心内容包括：

**drawImage 三种形式**：
- 3参数：基本绘制
- 5参数：缩放绘制
- 9参数：裁剪+缩放绘制

**图像缩放**：
- contain 模式：保持宽高比，完整显示
- cover 模式：保持宽高比，填满区域
- `imageSmoothingEnabled` 控制缩放质量

**图像源类型**：
- HTMLImageElement（最常用）
- HTMLCanvasElement（Canvas 作为图像源）
- HTMLVideoElement（视频帧）
- ImageBitmap（高性能）
- OffscreenCanvas（Worker 中使用）

**异步加载**：
- 必须等待 `onload` 事件
- Promise 封装提升可用性
- 预加载器管理多图像加载

**精灵动画**：
- 使用9参数裁剪精灵图的不同区域
- 逐帧切换实现动画效果

掌握这些技术，你已经可以在 Canvas 上实现复杂的图像处理和动画效果。在下一章，我们将学习更高级的图像处理算法，如滤镜、卷积等。

**思考题**：
1. 如何实现图像的镜像翻转效果？
2. 如何将 Canvas 内容导出为图像文件？
3. 如何实现图像的淡入淡出过渡效果？

这些问题的答案，会在后续章节中逐步揭晓。
