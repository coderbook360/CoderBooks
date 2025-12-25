# 纹理创建与上传

> "正确创建和上传纹理是高效渲染的基础。"

## texImage2D 详解

### 基本语法

```javascript
gl.texImage2D(
  target,         // 纹理目标
  level,          // mipmap 级别
  internalFormat, // 内部存储格式
  width,          // 宽度（从数据推断时可省略）
  height,         // 高度（从数据推断时可省略）
  border,         // 边框（必须为 0）
  format,         // 源数据格式
  type,           // 数据类型
  source          // 数据源
);
```

### 从 HTMLImageElement 创建

```javascript
const image = new Image();
image.onload = () => {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  
  // 简化形式：宽高从图像推断
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,              // level
    gl.RGBA,        // internalFormat
    gl.RGBA,        // format
    gl.UNSIGNED_BYTE,
    image           // 图像元素
  );
};
image.src = 'texture.png';
```

### 从 Canvas 创建

```javascript
const canvas = document.createElement('canvas');
canvas.width = 256;
canvas.height = 256;
const ctx = canvas.getContext('2d');

// 绘制内容
ctx.fillStyle = 'red';
ctx.fillRect(0, 0, 128, 128);
ctx.fillStyle = 'blue';
ctx.fillRect(128, 0, 128, 128);

// 上传到纹理
gl.texImage2D(
  gl.TEXTURE_2D, 0, gl.RGBA,
  gl.RGBA, gl.UNSIGNED_BYTE,
  canvas
);
```

### 从 Video 创建

```javascript
const video = document.getElementById('video');

function updateVideoTexture() {
  if (video.readyState >= video.HAVE_CURRENT_DATA) {
    gl.bindTexture(gl.TEXTURE_2D, videoTexture);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA,
      gl.RGBA, gl.UNSIGNED_BYTE,
      video
    );
  }
  requestAnimationFrame(updateVideoTexture);
}
```

### 从 ImageData 创建

```javascript
const imageData = ctx.getImageData(0, 0, width, height);

gl.texImage2D(
  gl.TEXTURE_2D, 0, gl.RGBA,
  gl.RGBA, gl.UNSIGNED_BYTE,
  imageData
);
```

### 从 TypedArray 创建

```javascript
// 创建 2x2 棋盘格
const pixels = new Uint8Array([
  255, 255, 255, 255,  // 白
  0, 0, 0, 255,        // 黑
  0, 0, 0, 255,        // 黑
  255, 255, 255, 255   // 白
]);

gl.texImage2D(
  gl.TEXTURE_2D,
  0,
  gl.RGBA,
  2,                // width
  2,                // height
  0,                // border
  gl.RGBA,
  gl.UNSIGNED_BYTE,
  pixels
);
```

## 内部格式与源格式

### WebGL 1.0 格式

```javascript
// 格式必须匹配
// internalFormat === format

gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
gl.texImage2D(target, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
gl.texImage2D(target, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, source);
gl.texImage2D(target, 0, gl.ALPHA, gl.ALPHA, gl.UNSIGNED_BYTE, source);
```

### WebGL 2.0 格式

```javascript
// 更精确的内部格式
gl.texImage2D(target, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
gl.texImage2D(target, 0, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE, source);
gl.texImage2D(target, 0, gl.RG8, gl.RG, gl.UNSIGNED_BYTE, source);
gl.texImage2D(target, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, source);

// 浮点纹理
gl.texImage2D(target, 0, gl.RGBA32F, gl.RGBA, gl.FLOAT, floatData);
gl.texImage2D(target, 0, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, halfFloatData);

// 整数纹理
gl.texImage2D(target, 0, gl.RGBA8UI, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, uintData);
gl.texImage2D(target, 0, gl.RGBA8I, gl.RGBA_INTEGER, gl.BYTE, intData);
```

### 格式对照表

| 内部格式 | 格式 | 类型 |
|---------|------|------|
| RGBA8 | RGBA | UNSIGNED_BYTE |
| RGB8 | RGB | UNSIGNED_BYTE |
| RGBA16F | RGBA | HALF_FLOAT |
| RGBA32F | RGBA | FLOAT |
| R8 | RED | UNSIGNED_BYTE |
| RG8 | RG | UNSIGNED_BYTE |
| DEPTH_COMPONENT24 | DEPTH_COMPONENT | UNSIGNED_INT |
| DEPTH24_STENCIL8 | DEPTH_STENCIL | UNSIGNED_INT_24_8 |

## 部分更新

### texSubImage2D

```javascript
// 更新纹理的一部分
gl.texSubImage2D(
  gl.TEXTURE_2D,
  0,          // level
  xOffset,    // x 偏移
  yOffset,    // y 偏移
  width,      // 宽度
  height,     // 高度
  gl.RGBA,
  gl.UNSIGNED_BYTE,
  data
);

// 使用图像源
gl.texSubImage2D(
  gl.TEXTURE_2D,
  0,
  xOffset,
  yOffset,
  gl.RGBA,
  gl.UNSIGNED_BYTE,
  image
);
```

### 实时纹理更新

```javascript
// 动态纹理贴图
function updateDynamicTexture() {
  // 只更新变化的区域
  gl.bindTexture(gl.TEXTURE_2D, dynamicTexture);
  gl.texSubImage2D(
    gl.TEXTURE_2D, 0,
    updateX, updateY,
    updateWidth, updateHeight,
    gl.RGBA, gl.UNSIGNED_BYTE,
    updateData
  );
}
```

## 像素存储参数

### 解包参数

```javascript
// 控制如何从 CPU 内存读取像素

// 行对齐（1, 2, 4, 8）
gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);  // 无填充

// 跳过行
gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 10);

// 跳过像素
gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 5);

// 每行像素数（用于读取部分图像）
gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 256);

// 翻转 Y 轴
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

// 预乘 alpha
gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

// 颜色空间转换
gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
```

### Y 轴翻转

```javascript
// WebGL 纹理原点在左下角
// 图像原点通常在左上角
// 需要翻转

gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);  // 恢复默认
```

### 处理非 4 字节对齐数据

```javascript
// RGB 图像每行不是 4 字节对齐
// 需要设置对齐为 1

gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
gl.texImage2D(
  gl.TEXTURE_2D, 0, gl.RGB8,
  width, height, 0,
  gl.RGB, gl.UNSIGNED_BYTE,
  rgbData
);
gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);  // 恢复默认
```

## 分配空间

### 不上传数据

```javascript
// 分配空间但不上传数据
gl.texImage2D(
  gl.TEXTURE_2D,
  0,
  gl.RGBA8,
  512, 512,
  0,
  gl.RGBA,
  gl.UNSIGNED_BYTE,
  null  // 不上传数据
);

// 用于渲染目标纹理
```

### texStorage2D（WebGL 2.0）

```javascript
// 一次性分配所有 mipmap 级别
// 纹理变为不可变大小

const levels = Math.log2(Math.max(width, height)) + 1;

gl.texStorage2D(
  gl.TEXTURE_2D,
  levels,       // mipmap 级别数
  gl.RGBA8,     // 内部格式
  width,
  height
);

// 之后只能用 texSubImage2D 更新
gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
gl.generateMipmap(gl.TEXTURE_2D);
```

### texStorage 优势

```javascript
// 使用 texImage2D：
// - 每次调用可能重新分配内存
// - 格式可以改变
// - 可能产生不完整纹理

// 使用 texStorage2D：
// - 一次分配所有内存
// - 格式固定
// - 保证纹理完整性
// - 更好的性能
```

## 创建程序化纹理

### 棋盘格

```javascript
function createCheckerboardTexture(size, tileSize) {
  const data = new Uint8Array(size * size * 4);
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tx = Math.floor(x / tileSize);
      const ty = Math.floor(y / tileSize);
      const isWhite = (tx + ty) % 2 === 0;
      
      const i = (y * size + x) * 4;
      const value = isWhite ? 255 : 0;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA,
    size, size, 0,
    gl.RGBA, gl.UNSIGNED_BYTE, data
  );
  gl.generateMipmap(gl.TEXTURE_2D);
  
  return texture;
}
```

### 渐变纹理

```javascript
function createGradientTexture(width, height, startColor, endColor) {
  const data = new Uint8Array(width * height * 4);
  
  for (let y = 0; y < height; y++) {
    const t = y / (height - 1);
    const r = Math.round(startColor[0] + (endColor[0] - startColor[0]) * t);
    const g = Math.round(startColor[1] + (endColor[1] - startColor[1]) * t);
    const b = Math.round(startColor[2] + (endColor[2] - startColor[2]) * t);
    
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  
  return texture;
}
```

### 噪声纹理

```javascript
function createNoiseTexture(size) {
  const data = new Uint8Array(size * size * 4);
  
  for (let i = 0; i < size * size; i++) {
    const value = Math.random() * 255;
    data[i * 4] = value;
    data[i * 4 + 1] = value;
    data[i * 4 + 2] = value;
    data[i * 4 + 3] = 255;
  }
  
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  
  return texture;
}
```

## 异步加载

### Promise 封装

```javascript
function loadTextureAsync(url) {
  return new Promise((resolve, reject) => {
    const texture = gl.createTexture();
    const image = new Image();
    
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.generateMipmap(gl.TEXTURE_2D);
      
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      
      resolve(texture);
    };
    
    image.onerror = () => reject(new Error(`Failed to load: ${url}`));
    image.src = url;
  });
}

// 使用
const texture = await loadTextureAsync('diffuse.png');
```

### 批量加载

```javascript
async function loadTextures(urls) {
  const promises = urls.map(url => loadTextureAsync(url));
  return Promise.all(promises);
}

// 使用
const [diffuse, normal, specular] = await loadTextures([
  'diffuse.png',
  'normal.png',
  'specular.png'
]);
```

## 本章小结

- texImage2D 支持多种数据源
- 内部格式决定 GPU 存储方式
- texSubImage2D 用于部分更新
- 像素存储参数控制数据解释
- texStorage2D 一次分配不可变纹理
- 程序化纹理避免外部资源依赖
- 使用 Promise 管理异步加载

下一章，我们将学习纹理坐标的详细使用。
