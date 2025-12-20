# 章节写作指导：图像处理算法：滤镜与卷积

## 1. 章节信息

- **章节标题**: 图像处理算法：滤镜与卷积
- **文件名**: drawing/image-processing.md
- **所属部分**: 第二部分：图形绘制详解
- **预计阅读时间**: 40分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解图像滤镜的基本原理
- 掌握常见滤镜算法（灰度、反色、亮度、对比度等）
- 理解卷积操作的数学原理
- 掌握常见卷积核（模糊、锐化、边缘检测等）

### 技能目标
- 能够实现基本的逐像素滤镜
- 能够实现卷积滤镜处理
- 能够组合多个滤镜效果
- 能够优化滤镜处理性能

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **逐像素滤镜** | 每个像素独立处理，不依赖周围像素 |
| **卷积 (Convolution)** | 使用周围像素的加权和计算新像素值 |
| **卷积核 (Kernel)** | 定义周围像素权重的矩阵 |
| **边缘处理** | 处理图像边缘无法完整应用卷积核的情况 |

### 关键知识点

- 灰度算法：平均法、加权法（人眼感知）
- 亮度调整：加减像素值
- 对比度调整：乘除像素值
- 反色：255 减去像素值
- 卷积操作的数学公式
- 常见卷积核：均值模糊、高斯模糊、锐化、边缘检测

### 边界与限制

- 大图像处理的性能问题
- 边缘像素的处理策略
- 色值溢出（< 0 或 > 255）的处理
- 卷积核需要归一化

## 4. 写作要求

### 开篇方式
引入实际应用：Instagram、Photoshop 中的滤镜效果是如何实现的？本章将从原理开始，带你实现常见的图像滤镜算法。

### 结构组织

```
1. 滤镜基础
   - 什么是图像滤镜
   - 逐像素处理 vs 邻域处理
   - 滤镜处理框架
   
2. 逐像素滤镜
   - 灰度化（多种算法对比）
   - 反色
   - 亮度调整
   - 对比度调整
   - 饱和度调整
   - 阈值化（二值化）
   
3. 卷积操作原理
   - 卷积的数学定义
   - 卷积核的作用
   - 可视化理解卷积
   
4. 常见卷积滤镜
   - 均值模糊
   - 高斯模糊
   - 锐化
   - 边缘检测（Sobel）
   
5. 实现细节
   - 边缘处理策略
   - 性能优化技巧
   - 可分离卷积优化
   
6. 滤镜组合与扩展
   - 滤镜链式调用
   - 自定义滤镜
   - Web Worker 加速
   
7. 本章小结
```

### 代码示例

1. **滤镜处理通用框架**
2. **灰度化（加权法）**
3. **亮度/对比度调整**
4. **卷积处理函数**
5. **高斯模糊实现**
6. **边缘检测（Sobel）**
7. **滤镜性能优化示例**

### 图表需求

- **卷积操作示意图**：展示卷积核在图像上滑动的过程
- **常见卷积核对比表**：展示不同卷积核及其效果
- **滤镜效果对比图**：展示各种滤镜的处理前后对比

## 5. 技术细节

### 实现要点

```javascript
// 滤镜处理通用框架
function applyFilter(imageData, filterFn) {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const result = filterFn(data[i], data[i + 1], data[i + 2], data[i + 3]);
    data[i] = result.r;
    data[i + 1] = result.g;
    data[i + 2] = result.b;
    data[i + 3] = result.a;
  }
  return imageData;
}

// 灰度化（加权法，符合人眼感知）
function grayscale(r, g, b, a) {
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  return { r: gray, g: gray, b: gray, a };
}

// 亮度调整
function brightness(amount) {
  return (r, g, b, a) => ({
    r: clamp(r + amount),
    g: clamp(g + amount),
    b: clamp(b + amount),
    a
  });
}

// 对比度调整
function contrast(factor) {
  return (r, g, b, a) => ({
    r: clamp((r - 128) * factor + 128),
    g: clamp((g - 128) * factor + 128),
    b: clamp((b - 128) * factor + 128),
    a
  });
}

function clamp(value) {
  return Math.max(0, Math.min(255, value));
}

// 卷积处理
function applyConvolution(imageData, kernel) {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data.length);
  const size = Math.sqrt(kernel.length);
  const half = Math.floor(size / 2);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      
      for (let ky = 0; ky < size; ky++) {
        for (let kx = 0; kx < size; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx - half));
          const py = Math.min(height - 1, Math.max(0, y + ky - half));
          const idx = (py * width + px) * 4;
          const weight = kernel[ky * size + kx];
          
          r += data[idx] * weight;
          g += data[idx + 1] * weight;
          b += data[idx + 2] * weight;
        }
      }
      
      const outIdx = (y * width + x) * 4;
      output[outIdx] = clamp(r);
      output[outIdx + 1] = clamp(g);
      output[outIdx + 2] = clamp(b);
      output[outIdx + 3] = data[outIdx + 3];
    }
  }
  
  return new ImageData(output, width, height);
}

// 常见卷积核
const KERNELS = {
  blur: [1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9],
  sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
  edgeDetect: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
};
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 滤镜处理后图像变白/变黑 | 检查色值是否正确 clamp 到 0-255 |
| 卷积结果异常 | 确保卷积核权重和为 1（归一化） |
| 大图像处理卡顿 | 使用 Web Worker 或分块处理 |
| 边缘出现黑边 | 正确处理边缘像素（边缘延展或镜像） |

## 6. 风格指导

### 语气语调
- 数学原理用直观方式解释
- 强调可视化理解

### 类比方向
- 卷积类比"用模板在图像上滑动取样"
- 卷积核类比"影响力权重图"

## 7. 与其他章节的关系

### 前置依赖
- 第4章：像素操作
- 第9章：图像绘制与处理

### 后续章节铺垫
- 为第50章"WebWorker 多线程图形处理"提供应用场景

## 8. 章节检查清单

- [ ] 目标明确：读者能实现常见图像滤镜
- [ ] 术语统一：卷积、卷积核、滤镜等术语定义清晰
- [ ] 最小实现：提供通用滤镜框架和常见滤镜实现
- [ ] 边界处理：说明边缘处理和色值溢出
- [ ] 性能与权衡：详细讨论性能优化
- [ ] 图示与代码：卷积原理图与代码对应
- [ ] 总结与练习：提供滤镜实现练习
