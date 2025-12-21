# 像素操作基础

假设你要实现一个取色器功能：用户点击 Canvas 上的任意位置，显示该点的 RGB 颜色值。如何获取某个坐标点的颜色？Canvas 的绘制 API（如 `fillRect`、`arc`）无法告诉你"这个位置是什么颜色"，因为 Canvas 采用**即时模式**（Immediate Mode），不保留图形对象。

**为什么 Canvas 不保留图形对象？** 这是一个重要的设计权衡：

1. **内存效率**：如果保留所有绘制的图形对象（如 SVG 的 DOM 树），会消耗大量内存，特别是在绘制数千个图形时
2. **渲染性能**：即时模式直接写入位图缓冲区，避免了维护场景图（Scene Graph）的开销，适合高频绘制场景（如游戏、动画）
3. **简单性**：开发者不需要管理图形对象的生命周期

然而，Canvas 提供了另一种能力：**直接访问底层像素数据**。通过 `getImageData`，你可以读取画布上任意区域的每一个像素的 RGBA 值；通过 `putImageData`，你可以将修改后的像素数据写回画布。

这就是本章要探索的核心能力——**像素级操作**（Pixel Manipulation）。

本章将回答以下问题：
- ImageData 对象是什么？像素数据如何组织？
- 如何将 (x, y) 坐标转换为像素数组的索引？
- 如何读取和修改指定像素的颜色？
- 像素操作有哪些性能陷阱？如何优化？

---

## 像素数据基础

首先要问一个问题：**Canvas 的像素数据是如何存储的？**

### ImageData 对象结构

Canvas 通过 `ImageData` 对象来表示像素数据，它是一个符合 [Web IDL](https://webidl.spec.whatwg.org/) 规范的接口，包含三个只读属性：

```javascript
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 绘制一些内容
ctx.fillStyle = '#3498db';
ctx.fillRect(0, 0, 100, 100);

// 读取像素数据
const imageData = ctx.getImageData(0, 0, 100, 100);

console.log(imageData.width);  // 100（像素宽度）
console.log(imageData.height); // 100（像素高度）
console.log(imageData.data);   // Uint8ClampedArray(40000)
```

**ImageData 的三个属性**：
- `width`：像素数据的宽度（以像素为单位）
- `height`：像素数据的高度（以像素为单位）
- `data`：像素数据数组（**Uint8ClampedArray** 类型）

### Uint8ClampedArray：特殊的像素数组

`imageData.data` 是一个 **Uint8ClampedArray**，这是一种[类型化数组](https://tc39.es/ecma262/#sec-typedarray-objects)（Typed Array），专为像素操作设计。它有两个关键特性：

**1. 取值范围自动限制在 0-255（Clamped）**

```javascript
const arr = new Uint8ClampedArray(4);
arr[0] = 300;   // 自动限制为 255（上限）
arr[1] = -50;   // 自动限制为 0（下限）
arr[2] = 128.7; // 自动取整为 129（四舍五入）

console.log(arr); // [255, 0, 129, 0]
```

**设计动机：为什么需要 Clamped 特性？**

在图像处理中，经常需要对像素值进行运算（如增加亮度、混合颜色）。如果使用普通的 `Uint8Array`，溢出会回绕（如 256 变为 0），导致视觉上的错误。而 `Uint8ClampedArray` 的自动截断行为（Clamping）正是像素运算所需要的：

```javascript
// 增加亮度示例
const brightness = 50;
pixelValue += brightness; // 如果 pixelValue 是 220，结果自动限制为 255
```

这种设计避免了每次运算都写 `Math.min(255, Math.max(0, value))`，提升了代码的可读性和性能。

**2. 数组长度 = width × height × 4**

为什么乘以 4？因为每个像素由 **4个字节** 表示，分别是 **R（红）、G（绿）、B（蓝）、A（Alpha透明度）**，这是标准的 **RGBA 颜色模型**。

```javascript
// 10×10 的区域
const imageData = ctx.getImageData(0, 0, 10, 10);
console.log(imageData.data.length); // 10 * 10 * 4 = 400
```

### RGBA 数据布局：行优先存储

像素数据按 **行优先**（Row-Major Order）顺序排列，这是计算机图形学的标准约定。每4个连续元素代表一个像素的 RGBA 值：

```
像素 (0,0): [R, G, B, A]
像素 (1,0): [R, G, B, A]
像素 (2,0): [R, G, B, A]
...
像素 (0,1): [R, G, B, A]
...

数组索引：
[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, ...]
```

例如，一个 3×2 的区域，像素布局如下：

```
坐标系统：
(0,0) (1,0) (2,0)
(0,1) (1,1) (2,1)

内存布局（data 数组）：
[R0 G0 B0 A0 | R1 G1 B1 A1 | R2 G2 B2 A2 | R3 G3 B3 A3 | R4 G4 B4 A4 | R5 G5 B5 A5]
 └ 像素(0,0) └  像素(1,0)  └  像素(2,0)  └  像素(0,1)  └  像素(1,1)  └  像素(2,1)
```

**工程考量：为什么选择行优先？**

行优先存储有两个优势：
1. **缓存友好**：图形渲染通常按行扫描，行优先存储可以提高 CPU 缓存命中率
2. **标准兼容**：与大多数图像格式（如 BMP、PNG）的内存布局一致，便于数据交换

---

## 读取像素数据

现在我要问第二个问题：**如何读取指定区域的像素数据？**

### getImageData 基本用法

```javascript
// 语法：ctx.getImageData(sx, sy, sw, sh)
const imageData = ctx.getImageData(50, 50, 100, 100);

// 返回一个 ImageData 对象，包含 (50, 50) 到 (150, 150) 区域的像素
```

**参数说明**：
- `sx, sy`：读取区域的**左上角坐标**（Source X/Y）
- `sw, sh`：读取区域的**宽度和高度**（Source Width/Height）

**重要行为特性**：

1. **超出边界的处理**：如果读取区域超出 Canvas 边界，超出部分的像素将返回透明黑色（RGBA: 0, 0, 0, 0）

```javascript
canvas.width = 100;
canvas.height = 100;

// 读取部分超出边界的区域
const imageData = ctx.getImageData(80, 80, 40, 40);
// 像素 (0-19, 0-19) 是有效数据
// 像素 (20-39, 20-39) 全为 (0, 0, 0, 0)
```

2. **不受当前变换影响**：`getImageData` 始终读取**设备像素**（Device Pixels），不受 `translate()`, `rotate()`, `scale()` 等变换影响

```javascript
ctx.translate(100, 100);
ctx.rotate(Math.PI / 4);
// getImageData 仍然从原始坐标系读取
const imageData = ctx.getImageData(0, 0, 100, 100);
```

3. **性能考量**：`getImageData` 涉及 GPU 到 CPU 的数据传输，是一个**相对昂贵的操作**。应该尽量减少调用次数，一次性读取较大区域而不是多次读取小区域。

```javascript
// ❌ 性能陷阱：频繁调用 getImageData
for (let y = 0; y < 100; y++) {
  for (let x = 0; x < 100; x++) {
    const pixel = ctx.getImageData(x, y, 1, 1); // 调用 10000 次！
  }
}

// ✅ 优化：一次读取整个区域
const imageData = ctx.getImageData(0, 0, 100, 100);
const data = imageData.data;
for (let i = 0; i < data.length; i += 4) {
  // 处理像素数据
}
```

### 读取单个像素

如何读取某个坐标点的颜色？

```javascript
/**
 * 读取指定坐标的像素颜色
 * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
 * @param {number} x - X 坐标
 * @param {number} y - Y 坐标
 * @returns {{r: number, g: number, b: number, a: number}} RGBA 颜色对象
 */
function getPixelColor(ctx, x, y) {
  // 读取 1×1 区域
  const imageData = ctx.getImageData(x, y, 1, 1);
  const data = imageData.data;
  
  return {
    r: data[0],
    g: data[1],
    b: data[2],
    a: data[3]
  };
}

// 使用示例
ctx.fillStyle = '#3498db'; // RGB(52, 152, 219)
ctx.fillRect(50, 50, 100, 100);

const color = getPixelColor(ctx, 60, 60);
console.log(color); // { r: 52, g: 152, b: 219, a: 255 }
```

**注意**：虽然读取单个像素很方便，但如果需要读取多个像素，应该一次性读取整个区域，然后通过索引访问，避免重复的 GPU-CPU 数据传输。

### 实现取色器

结合前面的知识，我们可以实现一个完整的取色器：

```javascript
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorDisplay = document.getElementById('colorDisplay');

canvas.width = 400;
canvas.height = 300;

// 绘制一些彩色区域
ctx.fillStyle = '#e74c3c';
ctx.fillRect(0, 0, 200, 150);

ctx.fillStyle = '#3498db';
ctx.fillRect(200, 0, 200, 150);

ctx.fillStyle = '#2ecc71';
ctx.fillRect(0, 150, 200, 150);

ctx.fillStyle = '#f39c12';
ctx.fillRect(200, 150, 200, 150);

// 点击获取颜色
canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);
  
  const color = getPixelColor(ctx, Math.floor(x), Math.floor(y));
  const hex = `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  
  colorDisplay.textContent = `RGB(${color.r}, ${color.g}, ${color.b}) = ${hex}`;
  colorDisplay.style.backgroundColor = hex;
});

function toHex(value) {
  return value.toString(16).padStart(2, '0');
}
```

有没有很神奇的感觉？通过像素数据，我们可以精确获取 Canvas 上任意点的颜色。

---

## 坐标与索引转换

现在我要问第三个问题：**如何将 (x, y) 坐标转换为 data 数组的索引？**

### 转换公式推导

对于一个宽度为 `width` 的 ImageData，像素 (x, y) 在 data 数组中的起始索引计算如下：

```
索引 = (y * width + x) * 4
```

**推导过程（基于行优先存储）**：
1. 前 y 行总共有 `y * width` 个像素
2. 当前行（第 y 行）的前 x 个像素
3. 总像素数 = `y * width + x`
4. 每个像素占 4 个字节（RGBA），所以最终索引 = `(y * width + x) * 4`

**示例验证**：
```javascript
// 对于一个 10×10 的 ImageData
const width = 10;

// 像素 (0, 0) 的索引
const idx1 = (0 * 10 + 0) * 4; // = 0

// 像素 (5, 0) 的索引（第一行第6个像素）
const idx2 = (0 * 10 + 5) * 4; // = 20

// 像素 (0, 1) 的索引（第二行第1个像素）
const idx3 = (1 * 10 + 0) * 4; // = 40

// 像素 (5, 3) 的索引（第四行第6个像素）
const idx4 = (3 * 10 + 5) * 4; // = 140
```

### 高性能工具函数封装

```javascript
/**
 * 坐标转索引（内联友好版本）
 * @param {number} x - X 坐标
 * @param {number} y - Y 坐标
 * @param {number} width - ImageData 宽度
 * @returns {number} data 数组索引
 * 
 * @example
 * const index = getPixelIndex(10, 20, imageData.width);
 * const r = data[index];
 * const g = data[index + 1];
 */
function getPixelIndex(x, y, width) {
  return (y * width + x) * 4;
}

/**
 * 读取单个像素（优化版）
 * 避免重复调用 getImageData
 * 
 * @param {ImageData} imageData - 图像数据
 * @param {number} x - X 坐标
 * @param {number} y - Y 坐标
 * @returns {{r: number, g: number, b: number, a: number}} RGBA 颜色对象
 */
function getPixel(imageData, x, y) {
  const index = getPixelIndex(x, y, imageData.width);
  const data = imageData.data;
  
  return {
    r: data[index],
    g: data[index + 1],
    b: data[index + 2],
    a: data[index + 3]
  };
}

/**
 * 设置单个像素
 * @param {ImageData} imageData - 图像数据
 * @param {number} x - X 坐标
 * @param {number} y - Y 坐标
 * @param {number} r - 红色通道 (0-255)
 * @param {number} g - 绿色通道 (0-255)
 * @param {number} b - 蓝色通道 (0-255)
 * @param {number} [a=255] - Alpha 通道 (0-255)
 */
function setPixel(imageData, x, y, r, g, b, a = 255) {
  const index = getPixelIndex(x, y, imageData.width);
  const data = imageData.data;
  
  data[index] = r;
  data[index + 1] = g;
  data[index + 2] = b;
  data[index + 3] = a;
}

// ==================== 高级用法：像素迭代器 ====================

/**
 * 像素迭代器生成器
 * 提供更优雅的像素遍历方式
 * 
 * @param {ImageData} imageData - 图像数据
 * @yields {{x: number, y: number, r: number, g: number, b: number, a: number}}
 * 
 * @example
 * for (const pixel of iteratePixels(imageData)) {
 *   console.log(`Pixel at (${pixel.x}, ${pixel.y}): RGB(${pixel.r}, ${pixel.g}, ${pixel.b})`);
 * }
 */
function* iteratePixels(imageData) {
  const { width, height, data } = imageData;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      yield {
        x,
        y,
        r: data[i],
        g: data[i + 1],
        b: data[i + 2],
        a: data[i + 3]
      };
    }
  }
}

// 使用示例
const imageData = ctx.createImageData(100, 100);

// 设置中心点为红色
setPixel(imageData, 50, 50, 255, 0, 0, 255);

// 使用迭代器遍历所有像素
for (const pixel of iteratePixels(imageData)) {
  if (pixel.r > 200) {
    console.log(`找到红色像素: (${pixel.x}, ${pixel.y})`);
  }
}

// 写回 Canvas
ctx.putImageData(imageData, 0, 0);
```

**性能提示**：
- `getPixelIndex` 是一个简单的算术运算，现代 JavaScript 引擎会将其内联优化
- 对于频繁的像素访问，直接使用索引公式比封装函数更快
- 迭代器（Generator）提供了优雅的 API，但在性能关键代码中不如直接循环

---

## 修改像素数据

现在我要问第四个问题：**如何修改像素数据并写回 Canvas？**

### 直接修改像素值

```javascript
// 读取区域
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
const data = imageData.data;

// 将所有像素变为红色
for (let i = 0; i < data.length; i += 4) {
  data[i] = 255;     // R
  data[i + 1] = 0;   // G
  data[i + 2] = 0;   // B
  // data[i + 3] Alpha 保持不变
}

// 写回 Canvas
ctx.putImageData(imageData, 0, 0);
```

### putImageData：写回像素数据

```javascript
// 完整语法：ctx.putImageData(imageData, dx, dy [, dirtyX, dirtyY, dirtyWidth, dirtyHeight])
ctx.putImageData(imageData, 50, 50);

// 将 imageData 的内容写到 (50, 50) 位置
```

**关键特性**：

1. **完全替换，不混合**：`putImageData` 会**直接替换**目标区域的像素，不会进行 Alpha 混合或应用任何合成模式

```javascript
// 即使设置了 globalAlpha，putImageData 也不受影响
ctx.globalAlpha = 0.5;
ctx.putImageData(imageData, 0, 0); // Alpha 不会被修改
```

2. **不受当前状态影响**：`putImageData` 不受以下状态影响：
   - 样式属性（fillStyle、strokeStyle 等）
   - 变换矩阵（translate、rotate、scale）
   - 裁剪区域（clip）
   - 合成模式（globalCompositeOperation）

```javascript
ctx.translate(100, 100); // putImageData 不受影响
ctx.putImageData(imageData, 0, 0); // 仍然写入到 (0, 0)
```

3. **脏矩形优化**（Dirty Rectangle Optimization）：可选参数允许只更新部分区域

```javascript
// 只更新 imageData 中 (10, 10) 到 (60, 60) 的部分
ctx.putImageData(
  imageData, 
  0, 0,           // 目标位置
  10, 10,         // 脏矩形起点
  50, 50          // 脏矩形尺寸
);
```

**设计动机：为什么 putImageData 不受状态影响？**

这是一个重要的设计决策。`putImageData` 被设计为**底层像素传输操作**，类似于内存拷贝（memcpy），而不是绘制操作。这种设计有两个优势：
1. **性能可预测**：不需要额外的混合计算，可以直接 DMA 传输
2. **语义清晰**：明确表示"设置这些像素的值"，而不是"绘制一些东西"

### createImageData：创建空白像素数据

除了读取现有像素，还可以创建全新的 ImageData：

```javascript
// 方法 1：创建指定尺寸的空白 ImageData
const imageData = ctx.createImageData(200, 200);
// 所有像素初始化为透明黑色 (0, 0, 0, 0)

// 方法 2：基于现有 ImageData 创建同尺寸的空白数据
const newImageData = ctx.createImageData(existingImageData);

// 方法 3：使用 ImageData 构造函数（更灵活）
const data = new Uint8ClampedArray(200 * 200 * 4);
const imageData = new ImageData(data, 200, 200);
```

**用途**：在内存中构建像素数据，然后一次性写入 Canvas，避免频繁绘制。这在实现复杂的图像生成算法（如分形、程序纹理）时特别有用。

```javascript
// 示例：生成渐变噪声纹理
function generateNoiseTexture(width, height) {
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.random() * 255;
    data[i] = noise;     // R
    data[i + 1] = noise; // G
    data[i + 2] = noise; // B
    data[i + 3] = 255;   // A
  }
  
  return imageData;
}

const texture = generateNoiseTexture(256, 256);
ctx.putImageData(texture, 0, 0);
```

---

## 本章小结

本章介绍了 Canvas 像素操作的核心知识：

**像素数据结构**：
- ImageData 对象包含 width、height、data 三个属性
- 使用 Uint8ClampedArray 存储 RGBA 数据，自动限制在 0-255 范围
- 行优先存储，索引公式：`(y * width + x) * 4`

**读取像素**：
- `getImageData(x, y, width, height)` 读取指定区域
- 不受变换矩阵和状态影响
- 性能关键：避免频繁调用，一次读取整个区域

**修改像素**：
- 直接修改 data 数组元素
- `putImageData(imageData, x, y)` 写回 Canvas
- 不进行 Alpha 混合，完全替换像素
- `createImageData()` 创建空白像素数据

**性能优化**：
- 批量处理：一次 getImageData 处理整个区域
- 避免频繁的 GPU-CPU 数据传输
- 使用脏矩形优化更新部分区域

在下一章，我们将学习如何使用这些基础知识实现各种图像处理算法。
