# 图像处理算法

在上一章，我们学习了像素数据的基础知识和读写操作。现在让我们将这些知识应用到实际的图像处理中，实现各种经典的图像处理效果。

本章将回答以下问题：
- 如何实现灰度化、反色、亮度调整等基础效果？
- 如何实现对比度、饱和度等高级调整？
- 如何实现高斯模糊、边缘检测等卷积算法？
- 如何封装生产级图像处理器？
- 如何优化性能和处理跨域安全问题？

---

## 基础图像处理算法

### 1. 灰度化处理

将彩色图像转换为灰度图像。最简单的方法是对 RGB 三通道取平均值：

```javascript
/**
 * 简单灰度化：RGB 平均值法
 * @param {ImageData} imageData - 要处理的图像数据
 * @returns {ImageData} 处理后的图像数据
 */
function grayscale(imageData) {
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // 简单平均法
    const gray = (r + g + b) / 3;
    
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    // Alpha 通道保持不变
  }
  
  return imageData;
}

// 使用示例
const img = new Image();
img.crossOrigin = 'anonymous';
img.src = 'photo.jpg';
img.onload = () => {
  ctx.drawImage(img, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  grayscale(imageData);
  ctx.putImageData(imageData, 0, 0);
};
```

**改进版本（加权平均，符合人眼感知）**：

根据 [ITU-R BT.601](https://en.wikipedia.org/wiki/Rec._601) 标准，人眼对绿色最敏感，对蓝色最不敏感。使用加权公式可以得到更符合人类视觉感知的灰度图像：

```javascript
/**
 * 标准灰度化：BT.601 加权法
 * 权重来源：ITU-R BT.601 亮度转换标准
 * @param {ImageData} imageData - 要处理的图像数据
 * @returns {ImageData} 处理后的图像数据
 */
function grayscaleWeighted(imageData) {
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    // BT.601 标准权重：红29.9%，绿58.7%，蓝11.4%
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  
  return imageData;
}
```

**性能对比**：两种方法的性能几乎相同，但加权法的视觉效果更好，推荐使用。

### 2. 反色处理（色彩反转）

将每个颜色通道的值反转（255 - value），产生"底片"效果：

```javascript
/**
 * 反色处理：将颜色值反转
 * @param {ImageData} imageData - 要处理的图像数据
 * @returns {ImageData} 处理后的图像数据
 */
function invert(imageData) {
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];         // R
    data[i + 1] = 255 - data[i + 1]; // G
    data[i + 2] = 255 - data[i + 2]; // B
    // Alpha 通道保持不变
  }
  
  return imageData;
}
```

**应用场景**：
- 创建"底片"效果
- 提高暗色背景上的可读性
- 艺术效果处理

### 3. 亮度调整

增加或减少整体亮度：

```javascript
/**
 * 调整图像亮度
 * @param {ImageData} imageData - 要处理的图像数据
 * @param {number} amount - 亮度调整量（-255 到 255）
 *                          正值增亮，负值变暗
 * @returns {ImageData} 处理后的图像数据
 */
function adjustBrightness(imageData, amount) {
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    // Uint8ClampedArray 会自动将结果限制在 0-255
    data[i] += amount;         // R
    data[i + 1] += amount;     // G
    data[i + 2] += amount;     // B
    // Alpha 通道不变
  }
  
  return imageData;
}

// 使用示例
adjustBrightness(imageData, 50);  // 增亮 50
adjustBrightness(imageData, -30); // 变暗 30
```

**工程提示**：利用 Uint8ClampedArray 的自动截断特性，无需手动使用 `Math.min(255, Math.max(0, value))`，代码更简洁高效。

---

## 高级图像处理算法

### 1. 对比度调整

```javascript
/**
 * 调整图像对比度
 * @param {ImageData} imageData - 图像数据
 * @param {number} contrast - 对比度系数（-100 到 100）
 *                            0 = 无变化，正值增强对比度，负值降低对比度
 * @returns {ImageData} 处理后的图像数据
 * 
 * 算法原理：
 * 1. 将对比度系数转换为缩放因子 factor
 * 2. 对每个像素应用公式：newValue = factor * (oldValue - 128) + 128
 * 3. 128 是中间灰度值，以此为中心进行缩放
 */
function adjustContrast(imageData, contrast) {
  const data = imageData.data;
  // 将 -100~100 转换为 0~2 的缩放因子
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = factor * (data[i] - 128) + 128;
    data[i + 1] = factor * (data[i + 1] - 128) + 128;
    data[i + 2] = factor * (data[i + 2] - 128) + 128;
    // Uint8ClampedArray 自动截断
  }
  
  return imageData;
}
```

### 2. 饱和度调整

```javascript
/**
 * 调整图像饱和度
 * @param {ImageData} imageData - 图像数据
 * @param {number} saturation - 饱和度系数（-100 到 100）
 *                              0 = 无变化，-100 = 完全去饱和（灰度），100 = 饱和度翻倍
 * @returns {ImageData} 处理后的图像数据
 * 
 * 算法原理：
 * 1. 计算每个像素的灰度值（亮度）
 * 2. 在彩色值和灰度值之间进行插值
 * 3. saturation 控制插值比例
 */
function adjustSaturation(imageData, saturation) {
  const data = imageData.data;
  const factor = (saturation + 100) / 100; // -100~100 -> 0~2
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // 计算灰度值（使用 BT.601 标准）
    const gray = r * 0.299 + g * 0.587 + b * 0.114;
    
    // 在灰度值和原始颜色之间插值
    data[i] = gray + factor * (r - gray);
    data[i + 1] = gray + factor * (g - gray);
    data[i + 2] = gray + factor * (b - gray);
  }
  
  return imageData;
}
```

### 3. 高斯模糊（简化版）

```javascript
/**
 * 简单的 3×3 高斯模糊
 * @param {ImageData} imageData - 图像数据
 * @returns {ImageData} 处理后的图像数据
 * 
 * 算法原理：
 * 使用 3×3 高斯核对每个像素进行卷积
 * 高斯核权重：
 *   [1, 2, 1]
 *   [2, 4, 2]  / 16
 *   [1, 2, 1]
 * 
 * 注意：这是简化实现，生产环境应使用可分离卷积优化
 */
function gaussianBlur(imageData) {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data);
  
  // 高斯核权重
  const kernel = [
    1, 2, 1,
    2, 4, 2,
    1, 2, 1
  ];
  const kernelSum = 16;
  
  // 遍历每个像素（跳过边缘）
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0;
      
      // 应用 3×3 卷积核
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixelX = x + kx;
          const pixelY = y + ky;
          const pixelIndex = (pixelY * width + pixelX) * 4;
          const weight = kernel[(ky + 1) * 3 + (kx + 1)];
          
          r += data[pixelIndex] * weight;
          g += data[pixelIndex + 1] * weight;
          b += data[pixelIndex + 2] * weight;
        }
      }
      
      const outputIndex = (y * width + x) * 4;
      output[outputIndex] = r / kernelSum;
      output[outputIndex + 1] = g / kernelSum;
      output[outputIndex + 2] = b / kernelSum;
      output[outputIndex + 3] = data[outputIndex + 3]; // 保留 Alpha
    }
  }
  
  imageData.data.set(output);
  return imageData;
}
```

### 4. 边缘检测（Sobel 算子）

```javascript
/**
 * 使用 Sobel 算子进行边缘检测
 * @param {ImageData} imageData - 图像数据
 * @returns {ImageData} 处理后的图像数据（边缘以白色显示）
 * 
 * 算法原理：
 * 1. 先转换为灰度图像
 * 2. 应用 Sobel 算子计算梯度
 * 3. 计算梯度幅值 sqrt(Gx^2 + Gy^2)
 */
function edgeDetection(imageData) {
  const { width, height, data } = imageData;
  
  // 先转换为灰度
  const gray = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    gray[idx] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }
  
  // Sobel 算子
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  
  const output = new Uint8ClampedArray(data.length);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      
      // 应用 Sobel 算子
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixelIndex = (y + ky) * width + (x + kx);
          const kernelIndex = (ky + 1) * 3 + (kx + 1);
          const pixelValue = gray[pixelIndex];
          
          gx += pixelValue * sobelX[kernelIndex];
          gy += pixelValue * sobelY[kernelIndex];
        }
      }
      
      // 计算梯度幅值
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const outputIndex = (y * width + x) * 4;
      
      output[outputIndex] = magnitude;
      output[outputIndex + 1] = magnitude;
      output[outputIndex + 2] = magnitude;
      output[outputIndex + 3] = 255;
    }
  }
  
  data.set(output);
  return imageData;
}
```

**算法性能对比**（以 1M 像素为基准）：
- 灰度化/反色/亮度：O(n)，约 1-5ms
- 对比度/饱和度：O(n)，约 2-8ms
- 高斯模糊（3×3）：O(9n)，约 10-30ms
- 边缘检测：O(9n)，约 15-40ms

**优化建议**：
1. 对于大图像，考虑使用 Web Worker
2. 高斯模糊可以用可分离卷积优化到 O(6n)
3. 使用 WebGL 可以将性能提升 10-100 倍

---

## 生产级图像处理器封装

下面是一个完整的图像处理器类，展示了企业级应用的最佳实践：

```javascript
/**
 * 图像处理器类
 * 提供加载图像、应用滤镜、恢复原图等功能
 */
class ImageProcessor {
  /**
   * @param {HTMLCanvasElement} canvas - Canvas 元素
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.originalImageData = null;
  }
  
  /**
   * 加载图像到 Canvas
   * @param {string} src - 图像 URL
   * @returns {Promise<void>}
   */
  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // 处理跨域
      
      img.onload = () => {
        // 调整 Canvas 尺寸以匹配图像
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        
        // 绘制图像
        this.ctx.drawImage(img, 0, 0);
        
        // 保存原始像素数据用于恢复
        this.originalImageData = this.ctx.getImageData(
          0, 0, img.width, img.height
        );
        
        resolve();
      };
      
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }
  
  /**
   * 恢复原始图像
   */
  reset() {
    if (this.originalImageData) {
      this.ctx.putImageData(this.originalImageData, 0, 0);
    }
  }
  
  /**
   * 应用滤镜函数
   * @param {Function} filterFn - 滤镜函数，接收 ImageData 作为参数
   */
  apply(filterFn) {
    const imageData = this.ctx.getImageData(
      0, 0, this.canvas.width, this.canvas.height
    );
    filterFn(imageData);
    this.ctx.putImageData(imageData, 0, 0);
  }
  
  /**
   * 应用灰度化滤镜
   */
  grayscale() {
    this.apply(grayscaleWeighted);
  }
  
  /**
   * 应用反色滤镜
   */
  invert() {
    this.apply(invert);
  }
  
  /**
   * 调整亮度
   * @param {number} amount - 亮度调整量
   */
  brightness(amount) {
    this.apply(data => adjustBrightness(data, amount));
  }
  
  /**
   * 调整对比度
   * @param {number} contrast - 对比度系数（-100 到 100）
   */
  contrast(contrast) {
    this.apply(data => adjustContrast(data, contrast));
  }
  
  /**
   * 调整饱和度
   * @param {number} saturation - 饱和度系数（-100 到 100）
   */
  saturation(saturation) {
    this.apply(data => adjustSaturation(data, saturation));
  }
  
  /**
   * 应用高斯模糊
   */
  blur() {
    this.apply(gaussianBlur);
  }
  
  /**
   * 边缘检测
   */
  detectEdges() {
    this.apply(edgeDetection);
  }
}

// 使用示例
const processor = new ImageProcessor(canvas);

// 加载图像并应用滤镜
await processor.loadImage('photo.jpg');

processor.grayscale();      // 灰度化
processor.reset();          // 恢复原图
processor.invert();         // 反色
processor.reset();          // 恢复原图
processor.brightness(50);   // 增亮
processor.reset();          // 恢复原图
processor.contrast(30);     // 增强对比度
processor.reset();          // 恢复原图
processor.saturation(-50);  // 降低饱和度
processor.reset();          // 恢复原图
processor.blur();           // 模糊
processor.reset();          // 恢复原图
processor.detectEdges();    // 边缘检测
```

**设计亮点**：
1. **Promise 封装**：异步图像加载使用 Promise，便于与 async/await 配合
2. **原始数据保存**：保存 originalImageData 支持快速恢复
3. **滤镜抽象**：`apply()` 方法接受任意滤镜函数，扩展性强
4. **错误处理**：完善的错误捕获和提示
5. **链式调用支持**：可以轻松添加 return this 实现链式调用

---

## 性能优化

像素操作涉及大量数据和 GPU-CPU 数据传输，性能优化至关重要：

### 1. 最小化 getImageData 调用频率

```javascript
// ❌ 性能陷阱：在循环中多次调用
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const imageData = ctx.getImageData(x, y, 1, 1); // 极慢！每次都触发 GPU->CPU 传输
    // ...
  }
}

// ✅ 优化：一次性读取整个区域
const imageData = ctx.getImageData(0, 0, width, height);
const data = imageData.data;
for (let i = 0; i < data.length; i += 4) {
  // 直接操作内存中的数组，快数百倍
}
```

**性能分析**：
- `getImageData` 涉及 GPU 到 CPU 的同步数据传输，可能触发渲染管线刷新（Pipeline Flush）
- 调用 10000 次 `getImageData(x, y, 1, 1)` 可能需要数百毫秒
- 一次 `getImageData(0, 0, width, height)` 通常只需几毫秒

### 2. 利用 Uint8ClampedArray 的自动截断特性

```javascript
// ❌ 不必要的手动截断
for (let i = 0; i < data.length; i += 4) {
  data[i] = Math.min(255, Math.max(0, data[i] + brightness));
}

// ✅ 利用 Uint8ClampedArray 的自动截断
for (let i = 0; i < data.length; i += 4) {
  data[i] += brightness; // 自动限制在 0-255
}
```

### 3. 大图像处理使用 Web Worker

对于大尺寸图像（如 4K），像素处理可能阻塞主线程。可以在 Worker 中处理像素数据：

```javascript
// main.js
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
const worker = new Worker('filter-worker.js');

// 使用 Transferable Objects 避免数据拷贝
worker.postMessage({
  imageData: imageData,
  filter: 'grayscale'
}, [imageData.data.buffer]); // 转移所有权，零拷贝

worker.onmessage = (event) => {
  ctx.putImageData(event.data, 0, 0);
};

// filter-worker.js
self.onmessage = (event) => {
  const { imageData, filter } = event.data;
  
  if (filter === 'grayscale') {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = data[i + 1] = data[i + 2] = gray;
    }
  }
  
  self.postMessage(imageData, [imageData.data.buffer]);
};
```

**性能提升**：
- 主线程不阻塞，UI 保持响应
- 对于 4K 图像（3840×2160 = 8,294,400 像素），处理时间从数百毫秒降至后台执行

### 4. 使用 ImageBitmap 优化跨上下文传输

```javascript
// 现代浏览器支持的高性能方案
const imageBitmap = await createImageBitmap(imageData);
ctx.drawImage(imageBitmap, 0, 0);
```

---

## 跨域安全限制（CORS Tainting）

当 Canvas 绘制了跨域图像后，会被标记为 **"tainted"（污染）**，此时调用 `getImageData` 会抛出 `SecurityError`：

```javascript
const img = new Image();
img.src = 'https://example.com/image.jpg'; // 跨域图像
img.onload = () => {
  ctx.drawImage(img, 0, 0);
  
  // ❌ 错误：SecurityError: Failed to execute 'getImageData' on 
  // 'CanvasRenderingContext2D': The canvas has been tainted by cross-origin data.
  const imageData = ctx.getImageData(0, 0, 100, 100);
};
```

**设计动机：为什么需要 CORS Tainting？**

这是一个重要的安全机制，防止以下攻击场景：
1. **隐私泄露**：恶意网站通过 Canvas 读取用户访问其他网站时的图像内容（如验证码、头像）
2. **指纹识别**：通过 Canvas 渲染特定图像并读取像素，识别用户的浏览器和硬件特征

Canvas 的 tainting 机制基于 [Same-Origin Policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)，确保只有同源资源才能被读取像素数据。

### 解决方案

**1. 服务器配置 CORS 响应头**

```http
Access-Control-Allow-Origin: *
# 或指定特定域名
Access-Control-Allow-Origin: https://your-domain.com
```

**2. 图像设置 crossOrigin 属性**

```javascript
const img = new Image();
img.crossOrigin = 'anonymous'; // 或 'use-credentials'
img.src = 'https://example.com/image.jpg';

img.onload = () => {
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, 100, 100); // ✅ 现在可以正常工作
};
```

**crossOrigin 属性说明**：
- `'anonymous'`：不发送用户凭证（Cookie、HTTP Auth）
- `'use-credentials'`：发送用户凭证

**3. 使用同域图像或代理**

```javascript
// 方案 A：将图像托管在同一域名下
img.src = '/images/photo.jpg';

// 方案 B：使用后端代理
img.src = '/api/proxy-image?url=' + encodeURIComponent(externalUrl);
```

**常见陷阱**：

```javascript
// ❌ 错误：先设置 src 再设置 crossOrigin
img.src = 'https://example.com/image.jpg';
img.crossOrigin = 'anonymous'; // 太晚了，图像已开始加载

// ✅ 正确：先设置 crossOrigin 再设置 src
img.crossOrigin = 'anonymous';
img.src = 'https://example.com/image.jpg';
```

---

## 本章小结

本章介绍了 Canvas 图像处理的完整知识：

**基础算法**：
- 灰度化：RGB 平均值法 vs BT.601 加权法
- 反色处理：底片效果
- 亮度调整：利用 Uint8ClampedArray 自动截断

**高级算法**：
- 对比度调整：以中间灰度为中心缩放
- 饱和度调整：彩色与灰度插值
- 高斯模糊：3×3 卷积核
- 边缘检测：Sobel 算子

**生产级实践**：
- ImageProcessor 类封装
- Promise 异步加载
- 原始数据保存与恢复
- 滤镜函数抽象

**性能优化**：
- 批量读取避免频繁 GPU-CPU 传输
- 利用类型化数组特性
- 大图像使用 Web Worker
- ImageBitmap 跨上下文优化

**安全考虑**：
- CORS Tainting 机制理解
- crossOrigin 属性正确使用
- 同域图像或代理方案

在下一章，我们将学习基础图形的绘制方法。
